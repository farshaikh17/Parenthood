/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PARENTHOOD NIGHT-ALERT WORKER (Cloudflare)
 * ------------------------------------------
 * A very small push server. It knows two things per user:
 *   1. the browser's push subscription (where to send),
 *   2. tonight's schedule: a few times the simulation predicts the baby will wake.
 * Every minute the cron handler sends any alert whose time has come. That is all —
 * no baby state, no names beyond what the app puts in the alert text, no analytics.
 *
 * Web push encryption (RFC 8291, aes128gcm) and VAPID (RFC 8292) are implemented with
 * WebCrypto only, so there are no dependencies to install.
 */

export interface Env {
  ALERTS: KVNamespace;
  DB: D1Database; // household sync (see schema.sql)
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string; // secret (wrangler secret put VAPID_PRIVATE_KEY)
  VAPID_SUBJECT: string;
  ALLOWED_ORIGINS: string;
  GEMINI_API_KEY?: string; // secret; optional — without it the AI endpoints answer with factual fallbacks
}

interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface ScheduledAlert {
  atRealMs: number;
  title: string;
  body: string;
}

const MAX_ALERTS = 5;
const MAX_SNAPSHOT_BYTES = 2_000_000;
const CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const MAX_AHEAD_MS = 24 * 3600 * 1000;
const SUB_TTL_SECONDS = 60 * 24 * 3600; // subscriptions expire after 60 quiet days

// ---------- small helpers ----------

const enc = new TextEncoder();

function b64urlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function bytesToB64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource }, key, length * 8);
  return new Uint8Array(bits);
}

// ---------- VAPID ----------

async function vapidHeader(endpoint: string, env: Env): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToB64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT })));
  const unsigned = `${header}.${claims}`;
  const pub = b64urlToBytes(env.VAPID_PUBLIC_KEY); // 65 bytes: 0x04 || x || y
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    d: env.VAPID_PRIVATE_KEY
  };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned));
  return `vapid t=${unsigned}.${bytesToB64url(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

// ---------- RFC 8291 encryption ----------

async function encryptPayload(sub: PushSubscriptionJSON, payload: string): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(sub.keys.p256dh);
  const auth = b64urlToBytes(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));

  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, localPublic);
  const ikm = await hkdf(auth, shared, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const plaintext = concat(enc.encode(payload), new Uint8Array([2])); // 0x02 = last record delimiter
  const aesKey = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, aesKey, plaintext as BufferSource));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([localPublic.length]), localPublic);
  return concat(header, ciphertext);
}

async function sendPush(sub: PushSubscriptionJSON, alert: ScheduledAlert, env: Env): Promise<{ ok: boolean; gone: boolean }> {
  const body = await encryptPayload(sub, JSON.stringify({ title: alert.title, body: alert.body, url: '/?night=1' }));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '3600',
      'Urgency': 'high',
      'Authorization': await vapidHeader(sub.endpoint, env)
    },
    body: body as BufferSource
  });
  return { ok: res.ok, gone: res.status === 404 || res.status === 410 };
}

// ---------- Gemini (same contract as server.ts, so the static site on Pages can use the Worker) ----------

async function gemini(env: Env, prompt: string, json: boolean): Promise<string | null> {
  if (!env.GEMINI_API_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: json ? { responseMimeType: 'application/json' } : {} })
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch { return null; }
}

async function journalReflection(body: any, env: Env) {
  const { babyName, ageDays, careDay, temperament, caregivers, dayStats, events, actions, milestonesToday, memory, parentNote } = body || {};
  const stats = dayStats || {};
  const fallback = { reflection: `Day ${careDay ?? ageDays}: ${stats.feedsCount ?? 0} feeds, ${stats.diapersCount ?? 0} nappy changes, about ${stats.sleepHoursTotal ?? 0} hours of sleep and ${stats.cryingMinutesTotal ?? 0} minutes of crying.`, milestoneInsight: '', source: 'offline_fallback' };
  const prompt = `You write the daily journal for "Parenthood", an educational baby-care simulation.
Write in the voice of an observant caregiver describing ${babyName}'s day (NOT the baby speaking; a ${ageDays}-day-old cannot narrate thoughts).
Use ONLY the facts below. Do not invent feeds, sleep, crying, milestones, illnesses, or parent actions that are not listed.
If the log is sparse, say the day was quiet. No medical claims, no diagnoses, no "research shows". 60-100 words, warm but plain.

FACTS
Baby: ${babyName}, developmental age ${ageDays} days (this is day ${careDay ?? '?'} of the parents caring for them), temperament parameters: ${temperament}
Caregivers: ${JSON.stringify(caregivers || [])}
Day counters (authoritative): ${JSON.stringify(stats)}
Events today: ${JSON.stringify(events || [])}
Care actions today (by = who did it; "autopilot" means simulated care while the user was away): ${JSON.stringify(actions || [])}
Milestones reached today: ${JSON.stringify(milestonesToday || [])}
What the baby has learned so far (facts from records; you may mention them, never extend them): ${JSON.stringify(memory || [])}
Parent's own note (quote or paraphrase only if present): ${parentNote ? JSON.stringify(parentNote) : 'none'}

Respond in valid JSON: {"reflection": string, "milestoneInsight": string}
"milestoneInsight" must be ONE short, cautious, non-medical sentence about something that actually happened today, or an empty string.`;
  const text = await gemini(env, prompt, true);
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.reflection !== 'string' || parsed.reflection.length < 10) return fallback;
    return { reflection: parsed.reflection, milestoneInsight: typeof parsed.milestoneInsight === 'string' ? parsed.milestoneInsight : '', source: 'gemini' };
  } catch { return fallback; }
}

async function explainEvent(body: any, env: Env) {
  const { event, snapshot, staticNote, question } = body || {};
  const factual = () => {
    if (!snapshot) return staticNote || 'No detail was recorded for this event.';
    const reasons: string[] = [];
    if (snapshot.hunger >= 60) reasons.push(`hunger was high (${snapshot.hunger}/100, last feed ${snapshot.minutesSinceFeed} min earlier)`);
    if (snapshot.gasDiscomfort >= 40) reasons.push(`there was trapped wind (${snapshot.gasDiscomfort}/100)`);
    if (snapshot.diaperSoiled >= 50) reasons.push(`the nappy was ${snapshot.diaperType} (${snapshot.minutesSinceDiaper} min since a change)`);
    if (!snapshot.isSleeping && snapshot.sleepiness >= 65) reasons.push(`they had been awake ${snapshot.awakeMinutes} min and were over-tired (${snapshot.sleepiness}/100)`);
    if (reasons.length === 0) reasons.push(`no single need stood out — comfort was ${snapshot.comfort}/100 and it was ${snapshot.isNight ? 'night' : 'daytime'}`);
    return `In the simulation at that moment: ${reasons.join('; ')}.`;
  };
  const prompt = `You explain events inside "Parenthood", an educational baby-care SIMULATION, to the parent.
Event: ${JSON.stringify(event || {})}
Simulation state at that moment (the ONLY facts you may use): ${JSON.stringify(snapshot || {})}
Simulation note already shown to the user: ${JSON.stringify(staticNote || '')}
Parent's question: ${question || 'Why did this happen?'}

Write 2-3 plain sentences saying which values in the state most likely caused the event (hunger, awake time/over-tiredness, wind after a feed, nappy). Quote the numbers you rely on. If nothing stands out, say so honestly. Do not give medical advice, do not diagnose, do not cite studies or organisations, do not say "evidence-based". You may end with one cautious sentence that real babies vary. Plain text only.`;
  const text = await gemini(env, prompt, false);
  return { insight: text && text.length > 20 ? text : factual(), source: text ? 'gemini' : 'offline_fallback' };
}

async function journeyStory(body: any, env: Env) {
  const report = body?.report;
  if (!report) return { paragraphs: [], source: 'offline_fallback' };
  const prompt = `You retell the final six-month report of "Parenthood", an educational baby-care SIMULATION, as a short warm story for the parent who just finished it.
Use ONLY the facts in the report below. Do not invent feeds, illnesses, milestones, relatives, places, or events. No medical claims, no diagnoses, no advice, no scores, no grades, no "research shows".
Address the parent as "you". Mention the baby by name. 3-4 short paragraphs, 150-220 words total. End with one honest sentence that a simulation compresses and simplifies, and that real babies vary.

REPORT (authoritative, complete):
${JSON.stringify(report)}

Respond in valid JSON: {"paragraphs": string[]}`;
  const text = await gemini(env, prompt, true);
  if (!text) return { paragraphs: [], source: 'offline_fallback' };
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) return { paragraphs: [], source: 'offline_fallback' };
    return { paragraphs: parsed.paragraphs.filter((p: unknown) => typeof p === 'string').slice(0, 6), source: 'gemini' };
  } catch { return { paragraphs: [], source: 'offline_fallback' }; }
}

// ---------- HTTP API ----------

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || allowed.includes('*');
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function validUserId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{3,80}$/.test(id);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, service: 'parenthood-night-alerts' }, 200, cors);
    if (cors['Access-Control-Allow-Origin'] === 'null') return json({ error: 'origin not allowed' }, 403, cors);

    // ---------- household sync (M8) ----------
    const syncMatch = url.pathname.match(/^\/sync\/([A-Z0-9-]{9})$/);
    if (syncMatch) {
      const code = syncMatch[1];
      if (!CODE_RE.test(code)) return json({ error: 'bad code' }, 400, cors);
      if (!env.DB) return json({ error: 'sync not enabled on this server' }, 501, cors);
      if (req.method === 'GET') {
        const since = Number(url.searchParams.get('since') || 0);
        const row = await env.DB.prepare('SELECT version, snapshot FROM households WHERE code = ?').bind(code).first<{ version: number; snapshot: string }>();
        if (!row) return json({ error: 'not found' }, 404, cors);
        if (row.version <= since) return new Response(null, { status: 304, headers: cors });
        return new Response(JSON.stringify({ version: row.version, snapshot: JSON.parse(row.snapshot) }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
      }
      if (req.method === 'PUT') {
        let body: any;
        try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
        const baseVersion = Number(body?.baseVersion ?? -1);
        if (!Number.isInteger(baseVersion) || baseVersion < 0 || !body?.snapshot?.data || !body?.snapshot?.meta) return json({ error: 'bad body' }, 400, cors);
        const text = JSON.stringify(body.snapshot);
        if (text.length > MAX_SNAPSHOT_BYTES) return json({ error: 'snapshot too large' }, 413, cors);
        const now = Date.now();
        if (body.create === true) {
          try {
            await env.DB.prepare('INSERT INTO households (code, version, snapshot, updated_at) VALUES (?, 1, ?, ?)').bind(code, text, now).run();
            return json({ ok: true, version: 1 }, 200, cors);
          } catch {
            const cur = await env.DB.prepare('SELECT version, snapshot FROM households WHERE code = ?').bind(code).first<{ version: number; snapshot: string }>();
            return json({ error: 'exists', version: cur?.version ?? 0, snapshot: cur ? JSON.parse(cur.snapshot) : null }, 409, cors);
          }
        }
        // compare-and-set: only the writer who saw the current version may replace it
        const r = await env.DB.prepare('UPDATE households SET version = version + 1, snapshot = ?, updated_at = ? WHERE code = ? AND version = ?').bind(text, now, code, baseVersion).run();
        if (r.meta.changes === 1) return json({ ok: true, version: baseVersion + 1 }, 200, cors);
        const cur = await env.DB.prepare('SELECT version, snapshot FROM households WHERE code = ?').bind(code).first<{ version: number; snapshot: string }>();
        if (!cur) return json({ error: 'not found' }, 404, cors);
        return json({ error: 'conflict', version: cur.version, snapshot: JSON.parse(cur.snapshot) }, 409, cors);
      }
      if (req.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM households WHERE code = ?').bind(code).run();
        return json({ ok: true }, 200, cors);
      }
      return json({ error: 'method' }, 405, cors);
    }

    if (req.method !== 'POST') return json({ error: 'method' }, 405, cors);
    let data: any;
    try { data = await req.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
    if (!validUserId(data?.userId)) return json({ error: 'bad userId' }, 400, cors);
    const userId: string = data.userId;

    if (url.pathname === '/subscribe') {
      const sub = data.subscription as PushSubscriptionJSON | undefined;
      if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: 'bad subscription' }, 400, cors);
      await env.ALERTS.put(`sub:${userId}`, JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }), { expirationTtl: SUB_TTL_SECONDS });
      return json({ ok: true }, 200, cors);
    }

    if (url.pathname === '/unsubscribe') {
      await env.ALERTS.delete(`sub:${userId}`);
      await env.ALERTS.delete(`sched:${userId}`);
      return json({ ok: true }, 200, cors);
    }

    if (url.pathname === '/schedule') {
      const now = Date.now();
      const alerts: ScheduledAlert[] = Array.isArray(data.alerts)
        ? data.alerts
            .filter((a: any) => typeof a?.atRealMs === 'number' && a.atRealMs > now && a.atRealMs < now + MAX_AHEAD_MS)
            .slice(0, MAX_ALERTS)
            .map((a: any) => ({ atRealMs: Math.round(a.atRealMs), title: String(a.title || 'Your baby is awake').slice(0, 80), body: String(a.body || '').slice(0, 160) }))
        : [];
      if (alerts.length === 0) await env.ALERTS.delete(`sched:${userId}`);
      else await env.ALERTS.put(`sched:${userId}`, JSON.stringify(alerts), { expirationTtl: 2 * 24 * 3600 });
      return json({ ok: true, scheduled: alerts.length }, 200, cors);
    }

    return json({ error: 'not found' }, 404, cors);
  },

  /** Runs every minute. KV listing is eventually consistent, so an alert can land up to a minute or so late. */
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = Date.now();
    const list = await env.ALERTS.list({ prefix: 'sched:' });
    const work = list.keys.map(async k => {
      const userId = k.name.slice('sched:'.length);
      const raw = await env.ALERTS.get(k.name);
      if (!raw) return;
      let alerts: ScheduledAlert[] = [];
      try { alerts = JSON.parse(raw); } catch { await env.ALERTS.delete(k.name); return; }
      const due = alerts.filter(a => a.atRealMs <= now + 30_000);
      if (due.length === 0) return;
      const remaining = alerts.filter(a => a.atRealMs > now + 30_000);
      const subRaw = await env.ALERTS.get(`sub:${userId}`);
      if (subRaw) {
        const sub: PushSubscriptionJSON = JSON.parse(subRaw);
        // Send only the latest due alert (if the phone was off for hours, one buzz is enough)
        const latest = due[due.length - 1];
        try {
          const r = await sendPush(sub, latest, env);
          if (r.gone) await env.ALERTS.delete(`sub:${userId}`);
        } catch (e) {
          console.error('push failed', userId, (e as Error).message);
        }
      }
      if (remaining.length === 0) await env.ALERTS.delete(k.name);
      else await env.ALERTS.put(k.name, JSON.stringify(remaining), { expirationTtl: 2 * 24 * 3600 });
    });
    ctx.waitUntil(Promise.all(work));
    await Promise.all(work);
    // Households nobody has touched for 60 days are removed (the phones still keep their own local copies).
    if (env.DB && new Date(now).getMinutes() === 0) {
      try { await env.DB.prepare('DELETE FROM households WHERE updated_at < ?').bind(now - 60 * 86400000).run(); } catch {}
    }
  }
};
