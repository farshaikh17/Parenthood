# PARENTHOOD — Final Handoff Document

_Written 2026-09-04 by Claude (implementation agent), at the completion of milestones M0–M10 of the Master Build Brief (2026-08-28). The GPT strategy chat remains the product authority; `PARENTHOOD_STATUS.md` (kept by the founder) carries the running milestone history._

## 1. What this is

**Parenthood** — "Experience parenthood before you become a parent." An educational baby-care simulation: a web app (installable as a phone app) in which a simulated newborn lives in real time for six developmental months, compressed into roughly six to eight real weeks. It is explicitly **not** a game with points, not medical advice, and not an assessment of anyone's fitness to parent.

## 2. Architecture (final)

```
Browser (React 19 + TypeScript + Vite + Tailwind v4)
├── src/simulation/   ← THE source of truth. Deterministic engine; no AI in here, ever.
│   ├── engine.ts        tick(), applyAction(), stage tuning, difficult periods, mood model
│   ├── clock.ts         two clocks: care clock (real time) + development clock (compressionSchedule)
│   ├── autopilot.ts     Option B bounded away-care (runAwayCatchup)
│   ├── nightPredictor.ts predicts tonight's wakes by running the engine forward
│   ├── personality.ts   hidden per-baby parameters + bounded experience drift
│   ├── memory.ts        structured facts computed from records (never invented)
│   ├── dayLog.ts        truthful per-day counters — every journal/report number comes from here
│   ├── report.ts        week summaries + JourneyReport (strengths/challenges/patterns)
│   ├── story.ts         deterministic six-month story from the JourneyReport
│   └── storage.ts       localStorage persistence, migrations, retention caps
├── src/sync/         ← M8 two-phone sharing: protocol.ts (pure rules), syncClient.ts, useHouseholdSync.ts
├── src/notifications/pushClient.ts   web-push client (honest per-platform capability)
├── src/pwa/install.ts               Add-to-Home-Screen helper
├── src/ai/           ← THE ONLY path to the model: apiBase.ts + client.ts (typed, always has fallbacks)
├── src/content/copy.ts  every educational string, with status (reviewed/general/heuristic) + sources
├── src/screens/, src/components/    UI (AppShell = real app container; NightAlert = baby-monitor overlay)
├── public/           manifest, icon, sw.js (offline shell + push display), _redirects/_headers for Pages
├── server.ts         Express server used by AI Studio/Cloud Run: 3 Gemini endpoints, key server-side
└── worker/           Cloudflare Worker: night pushes (KV + cron, VAPID/RFC 8291 in WebCrypto),
                      household sync (D1, compare-and-set), and the same 3 Gemini endpoints
```

**Iron rules kept throughout:** the AI is never the source of truth for state; every AI prompt is grounded in structured records and every endpoint has a deterministic factual fallback; no invented medical facts (claims carry NHS/WHO/CDC sources in `copy.ts`); autopilot care never trains the baby's memory of the parents or the parents' confidence; nothing silent — away care, hand-overs between phones, and health episodes all leave timeline events.

## 3. Implemented features (M0–M10)

- Onboarding (motivation, household type, difficulty Realistic/Hardcore only, metric/imperial, baby creation with hidden temperament; manual pick under "Advanced").
- Deterministic simulation: hunger/digestion, sleep cycles and wake windows by stage, nappies, wind, comfort→mood bands, growth, milestones gated by developmental age windows (CDC/NHS-checked).
- Two clocks: care in real time; development compressed (~44 real days for 182 dev days; schedule configurable in Settings, explained in plain words).
- Away policy Option B: bounded autopilot (≤24 h simulated, lazy caregiver, stops 25 min before return, "While you were away" summary event).
- Difficult periods: crying peak (2–12 weeks, worst ~6 weeks, evenings), evening fussiness, growth spurts, generic vaccination days, and two mild self-limiting health episodes (snuffles, unsettled tummy) — no temperatures, no diagnoses, always an "all clear".
- Baby individuality: seeded personality jitter, reversible habit drift (cot vs arms), emergent caregiver preference from evidence only, age-appropriate "voice" (descriptions, never speech).
- Truthful journal: automatic factual daily entries, optional AI reflection grounded in the day log, Weeks tab, "Why did this happen?" explanations from event snapshots.
- M7 night experience: PWA (manifest/SW), baby-monitor NightAlert (dark screen, time, cry audio, needs hidden until "Go to baby"), night-wake prediction pushed to the Worker, per-platform honesty (Android/desktop = yes; iOS = Home-Screen + 16.4+).
- M8 two-phone sharing: household code, leader/watcher ("the baby lives on whichever phone acted last"), 90-s takeover with away-policy catch-up, compare-and-set versioned saves on D1, timeline notes on every hand-over.
- M9 hardening: real app shell (no fake bezel), safe-area insets, offline app-shell caching, install prompt, offline banner, Cloudflare Pages config, Worker serves the AI endpoints so Pages needs no Node server.
- M10: six-month journey report screen (totals, story, strengths/challenges/patterns, week table, milestones), optional AI retelling grounded in the report, keep-going / start-again choices.

## 4. Data model (all in `src/types.ts`)

`UserProfile`, `Parent`, `Baby` (+`BabyPersonality`, birth/current measurements, `developmentalAgeDays`), `BabyState` (needs, sleep, health episodes, caregiver effectiveness), `SimulationSettings` (difficulty, units, time model, away policy, `compressionSchedule`), `CareActionRecord` (with `source: user|autopilot|system`), `SimulationEvent` (stable id, timestamp, type, source, `snapshot`, `resolvedBy`), `Milestone`, `JournalEntry` (stats `derivedFromLog`), `DayLog`, `ScoreReport` (labelled a reflective tool in the UI). Sync adds `SyncMeta`/`SyncSnapshot` (`src/sync/protocol.ts`). Persistence is a repository-style module (`storage.ts`): localStorage today, swappable later.

## 5. Research / source list

NHS: baby's first days (feeding amounts/frequency), newborn sleep patterns, soothing a crying baby, safer sleep, "when to get urgent help". WHO: infant feeding, growth standards. CDC "Learn the Signs. Act Early": 2-, 4-, 6-month milestones. All cited per-item in `src/content/copy.ts` with a `status` field; anything unsourced is worded as a statement about the simulation only. Web-push platform limits (iOS 16.4+ Home-Screen requirement) verified against current platform documentation during M7.

## 6. Deployment (details in `DEPLOY.md` and `worker/README.md`)

- **Path A (today):** Google AI Studio Publish → Cloud Run runs `server.ts`; `GEMINI_API_KEY` injected as a secret.
- **Path B:** Cloudflare Pages (build `npx vite build`, output `dist`) + one Worker (`worker/`: KV for alerts, D1 for sync, secrets `VAPID_PRIVATE_KEY` + `GEMINI_API_KEY`, cron every minute).
- Env vars: `GEMINI_API_KEY` (server/Worker only), `VITE_WORKER_URL`, `VITE_VAPID_PUBLIC_KEY`, optional `VITE_API_BASE`.
- **Not yet done (needs the founder):** actually deploying the Worker (requires their Cloudflare account and a one-time key generation; AI Studio also asks for the two `VITE_*` values once they exist).

## 7. Known limitations / honest caveats

- The Worker (night pushes, two-phone sharing, Pages-hosted AI) is **written and verified against reference implementations, but not yet deployed** — no cloud account access without the founder.
- Web push cannot work in a plain iOS Safari tab (platform restriction); the app says so instead of pretending.
- Sync shares the whole save under an unguessable code with no account system; anyone with the code can read it. Fine for a couple, not for production multi-tenant use.
- Baby weight/length follow a smoothed curve, not real WHO percentile tables; the UI labels it a simulated curve.
- Some milestones still unlock mostly by age (flagged P2 in the brief); tying more of them to interaction patterns is future work.
- localStorage is the only client store; a very full timeline is capped (500 events/actions, 400 day logs).
- The score system is retained but deliberately de-emphasised; the brief's long-term wish (validated developmental windows for every milestone) needs professional review.

## 8. Unfinished / future work

Deploy the Worker (founder step) → turn on night pushes + sharing end-to-end; store wrapper (TWA/PWABuilder) if an app-store presence is wanted; milestone realism (P2); real growth percentile data; accounts/auth if sync ever goes beyond a household; monetisation (explicitly deferred by the brief); professional content review before any public launch.

## 9. For the next agent

1. Read the Master Build Brief and `PARENTHOOD_STATUS.md` first; the brief's product decisions stand unless the GPT strategy chat changes them.
2. `npm install` (pip-style flags not needed), `npx tsc --noEmit`, `npx vitest run` (77 tests), `npx vite build`. Worker: `cd worker && npm install && npx tsc --noEmit`.
3. GitHub `farshaikh17/Parenthood` (main) is the source of truth and is synced two-way with the founder's Google AI Studio app; after pushing, use AI Studio's GitHub panel → "Pull changes".
4. Keep the iron rules in §2. Run the tests after every meaningful change. Never present mocked functionality as real, and never write a medical claim without a source in `copy.ts`.
