# Parenthood night-alert server (Cloudflare Worker)

This tiny server lets the app buzz your phone when the simulated baby wakes at night,
**even when the app is closed**. It stores only two things per user: where to send the
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
7. Deploy: `npm run deploy` → note the Worker URL (e.g. `https://parenthood-night-alerts.<you>.workers.dev`).

Then in the app's `.env` (see `.env.example` in the project root):

```
VITE_PUSH_WORKER_URL=https://parenthood-night-alerts.<you>.workers.dev
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

- `POST /subscribe` `{ userId, subscription }` — remember where to send pushes
- `POST /unsubscribe` `{ userId }` — forget this user completely
- `POST /schedule` `{ userId, alerts: [{ atRealMs, title, body }] }` — replace tonight's schedule (max 5, within 24 h)

The cron trigger runs every minute and sends any alert that is due. If several were missed
(phone off), only the latest is sent. Subscriptions that the push service reports as gone are deleted.

## Privacy

No baby data, no journal, no scores ever reach this server — only alert times and the push
subscription. Everything expires automatically (schedules after 2 days, subscriptions after 60 quiet days).
