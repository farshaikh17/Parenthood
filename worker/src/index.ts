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
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string; // secret (wrangler secret put VAPID_PRIVATE_KEY)
  VAPID_SUBJECT: string;
  ALLOWED_ORIGINS: string;
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

// ---------- HTTP API ----------

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || allowed.includes('*');
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    if (req.method !== 'POST') return json({ error: 'method' }, 405, cors);
    if (cors['Access-Control-Allow-Origin'] === 'null') return json({ error: 'origin not allowed' }, 403, cors);

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
  }
};
