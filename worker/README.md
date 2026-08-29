# Parenthood server (Cloudflare Worker)

One tiny server, two jobs: (1) buzz your phone when the simulated baby wakes at night,
**even when the app is closed**; (2) let two phones share one baby (household code). It stores only two things per user: where to send the
push (the browser's subscription) and tonight's predicted wake-up times.

The app works fine without it. Without the server, night wakings still appear inside the
app (dark "baby monitor" screen with crying) and, while the tab is open in the background,
as a normal browser notification.

## One-time setup (about 10 minutes)

1. Install: `cd worker && npm install`
2. Make the push keys: `npm run keys` — prints `VAPID_PUBLIC_KEY=…` and `VAPID_PRIVATE_KEY=…`
3. Put the **public** key in `wrangler.toml` (`VAPID_PUBLIC_KEY`) and set your contact email in `VAPID_SUBJECT`.
4. Create the storage: `npx wrangler kv namespace create ALERTS` → paste the printed `id` into `wrangler.toml`.
5. Store the **private** key as a secret (never commit it): `npx wrangler secret put VAPID_PRIVATE_KEY`
6. In `wrangler.toml`, set `ALLOWED_ORIGINS` to the address where the app is served (e.g. `https://parenthood.pages.dev`).
7. For two-phone sharing, create the database: `npx wrangler d1 create parenthood` → paste the printed `database_id` into `wrangler.toml`, then `npx wrangler d1 execute parenthood --remote --file=schema.sql`.
8. Optional but recommended: `npx wrangler secret put GEMINI_API_KEY` so the Worker can also serve the AI journal / explanations when the app is hosted on Cloudflare Pages (see `DEPLOY.md`).
9. Deploy: `npm run deploy` → note the Worker URL (e.g. `https://parenthood-night-alerts.<you>.workers.dev`).

Then in the app's `.env` (see `.env.example` in the project root):

```
VITE_WORKER_URL=https://parenthood-night-alerts.<you>.workers.dev
VITE_VAPID_PUBLIC_KEY=<the public key>
```

Rebuild the app. Settings → Night mode → "Alerts on this device" can now be turned on.

## Where it works

| Device | Works? |
|---|---|
| Android (Chrome, Edge, Firefox, Samsung Internet) | Yes, straight from the browser |
| Desktop Chrome / Edge / Firefox | Yes, while the browser is running |
| iPhone / iPad | Only after **Share → Add to Home Screen**, opened from there (iOS 16.4+) |

## Endpoints

**Household sync (M8)** — one row per household code, compare-and-set on a version number so two phones can never silently overwrite each other:

- `GET /sync/<CODE>?since=<version>` — the latest save, or 304 if nothing newer
- `PUT /sync/<CODE>` `{ baseVersion, snapshot, create? }` — replace the save; 409 with the current save if `baseVersion` is stale
- `DELETE /sync/<CODE>` — remove the household

**AI text (M9, optional):** `POST /api/gemini/journal-reflection` and `POST /api/gemini/explain-event` — same contract as `server.ts`; factual fallbacks when no `GEMINI_API_KEY`.

**Night alerts (M7):**


- `POST /subscribe` `{ userId, subscription }` — remember where to send pushes
- `POST /unsubscribe` `{ userId }` — forget this user completely
- `POST /schedule` `{ userId, alerts: [{ atRealMs, title, body }] }` — replace tonight's schedule (max 5, within 24 h)

The cron trigger runs every minute and sends any alert that is due. If several were missed
(phone off), only the latest is sent. Subscriptions that the push service reports as gone are deleted.

## Privacy

No baby data, no journal, no scores ever reach this server — only alert times and the push
subscription. Everything expires automatically (schedules after 2 days, subscriptions after 60 quiet days, household saves after 60 quiet days). A household save does contain the baby's timeline and journal text — that is the point of sharing — under an unguessable code with no account attached.
