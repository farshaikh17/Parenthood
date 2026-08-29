# Deploying Parenthood

There are two ways to put the app on the internet. Both are free at this scale.

## Path A — Google AI Studio "Publish" (what you have today)
AI Studio builds the app and runs `server.ts` for you (the Gemini key is injected as a secret).
Night alerts and two-phone sharing additionally need the Worker from Path B, step 1 — then add
`VITE_WORKER_URL` and `VITE_VAPID_PUBLIC_KEY` as secrets in AI Studio and republish.

## Path B — Cloudflare (Pages for the app, one Worker for everything else)

1. **Worker** — follow `worker/README.md` (keys, KV, D1, deploy). Also store the Gemini key on the Worker so
   the journal and "Why?" explanations work: `npx wrangler secret put GEMINI_API_KEY`.
   Put the Pages URL from step 2 into `ALLOWED_ORIGINS` in `worker/wrangler.toml` and deploy again.
2. **Pages** — Cloudflare dashboard → Workers & Pages → Create → Pages → *Connect to Git* → pick `farshaikh17/Parenthood`.
   - Build command: `npx vite build`
   - Build output directory: `dist`
   - Environment variables (Production): `VITE_WORKER_URL` = the Worker URL, `VITE_VAPID_PUBLIC_KEY` = the public key.
   - Deploy. Every push to `main` redeploys automatically.
3. Open the Pages URL on a phone → Settings → *Add to Home Screen*.

`public/_redirects` makes every path serve the app; `public/_headers` stops the service worker from being cached stale.

## What needs the network, what does not
- The simulation, the baby, the timeline, the journal counters, night wakings inside the app: **all on the phone, offline OK**.
- AI-written journal text and "What was going on at that moment?": network (fall back to factual text when offline).
- Night alerts while the app is closed, and sharing between two phones: network + the Worker.

## Environment variables
| Where | Name | Purpose |
|---|---|---|
| server.ts / Worker secret | `GEMINI_API_KEY` | AI text; never shipped to the browser |
| app build | `VITE_WORKER_URL` | the Worker URL (alerts, sharing, and AI endpoints on Pages) |
| app build | `VITE_VAPID_PUBLIC_KEY` | web-push public key |
| app build (optional) | `VITE_API_BASE` | override where `/api/gemini/*` is called (defaults to `VITE_WORKER_URL`, else same origin) |
| Worker | `VAPID_PRIVATE_KEY` (secret), `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`, `ALLOWED_ORIGINS` | push signing + CORS |
