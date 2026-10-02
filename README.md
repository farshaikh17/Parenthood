# Parenthood

**A real-time baby-care simulation designed to help people experience the demands, interruptions, trade-offs, and rewards of early parenthood before becoming parents.**

> Product concept, requirements, system design, testing direction, and implementation were developed with an AI-assisted development workflow.

## Why I built this

Most information about parenthood explains what having a baby is like. I wanted to explore a different question:

**Can software let someone experience a compressed version of the responsibility before making the decision?**

Parenthood turns that idea into a working simulation. A virtual newborn develops over roughly six real-world weeks while care needs continue in real time.

This project is also an example of how I work: start with an ambiguous product problem, define the system and rules, use AI as an implementation accelerator, test the behavior, and iterate toward a usable product.

## What the product does

- Simulates feeding, sleep, comfort, nappies, growth, milestones, mood, and developmental changes.
- Runs care in real time while compressing roughly six developmental months into several real weeks.
- Generates factual daily journals and weekly summaries from recorded simulation events.
- Supports bounded away-care rather than pretending the user is always online.
- Includes PWA behavior, offline support, night alerts, and planned push notifications.
- Includes a two-device household sharing architecture.
- Uses Gemini only for bounded narrative/reflection features; the simulation state itself is deterministic.
- Produces a six-month journey report summarizing patterns, challenges, milestones, and care activity.

## Architecture

```text
React + TypeScript PWA
        |
        +-- Deterministic simulation engine
        |     +-- care + development clocks
        |     +-- needs / sleep / mood
        |     +-- milestones + personality
        |     +-- day logs + reports
        |
        +-- AI layer
        |     +-- grounded reflections
        |     +-- deterministic fallbacks
        |
        +-- Local persistence
        |
        +-- Cloudflare Worker
              +-- D1 household sync
              +-- KV / scheduled alerts
              +-- Gemini endpoints
```

The core design decision is deliberate: **AI is not the source of truth for the simulation.** State changes come from deterministic rules and recorded events. AI-generated text is grounded in those records and has non-AI fallbacks.

## Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS  
**Backend / APIs:** Express, Cloudflare Workers  
**Data:** localStorage, Cloudflare D1  
**AI:** Google Gemini via server-side endpoints  
**Platform:** PWA, Service Worker, Web Push architecture  
**Testing:** Vitest + TypeScript checks

## Selected technical decisions

### Two clocks instead of one

Care needs progress in real time, but development is compressed. Keeping these clocks separate lets the experience remain disruptive enough to feel meaningful without requiring six actual months.

### Deterministic core, AI at the edges

A simulation should not change reality because a language model invented something. The engine owns state; AI is used for optional narrative and reflection.

### Honest away-care

Closing the app does not magically freeze the baby. The bounded catch-up system simulates care while the user is away and records what happened.

### Household synchronization

The sync design uses versioned saves and compare-and-set behavior so two devices can share one simulation without silently overwriting each other.

## Current status

The application logic and Cloudflare Worker implementation are in the repository. The Worker-dependent features (including end-to-end push notifications and two-device sharing) still require deployment and production configuration.

This is an active product experiment, not medical advice and not a validated assessment of someone's readiness to become a parent.

## Repository guide

- `src/simulation/` — deterministic simulation engine
- `src/ai/` — bounded AI client layer
- `src/sync/` — household synchronization
- `src/notifications/` — push notification client
- `src/content/` — educational copy and sources
- `worker/` — Cloudflare Worker for sync, alerts, and AI endpoints
- `DEPLOY.md` — deployment notes
- `HANDOFF.md` — detailed implementation handoff

## Development approach

I am not positioning this project as evidence that I am a traditional software engineer.

My role and strength are **product/system thinking + AI-assisted technical building**: defining the problem, designing the behavior and architecture, directing implementation, validating the result, and using modern AI tools to dramatically increase the amount I can build.

That is the same approach I use across automation, CRM, internal-tool, implementation, and technical-operations work.

---

**Built by Farhan Shaikh**  
Technical Operations · AI-Assisted Building · CRM & Automation · Product Implementation
