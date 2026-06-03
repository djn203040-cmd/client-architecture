# Project State — The Client Architecture

> Updated at each phase transition. Current state is always the source of truth.

---

## Current Status

**Stage:** Phase 7 — ALL 4 plans code-complete (07-01..07-04). NOT deployed, NOT verified. Next: deploy + manual test walkthrough (see resume-point issue).
**Active phase:** Phase 7 — Call Outcomes (post-launch milestone v1.1)
**Current plan:** All code shipped to local `main` (15 commits, UNPUSHED). 07-04 DONE (code) — `/calls` SSR queue (Awaiting/Upcoming/History, glass cards, realtime), CallOutcomeCard (3 buttons → PATCH /api/call-outcomes/[id]), useCallOutcomeRealtime hook, CallCelebrationEmptyState, LeadCallOutcomePanel (+ converted Module 2 CTA), call_converted Trophy timeline icon, /calls sidebar nav. Impeccable audit 16/20 (Good); fixed reduced-motion + em-dash + DRY tab panels (ad40881). Deferred (operator's call): --celebrate token, single-channel realtime, arrow-key tabs. Typecheck at 25-error baseline. **PENDING: (1) gsd-verifier + Nyquist phase verification not run; (2) deploy to prod (git push → Vercel); (3) reconnect cal.com webhook (integration shows disconnected); (4) manual booking→/calls walkthrough.**
**Date:** 2026-06-03

**Last session:** Executed all of Phase 7 (07-01..07-04) via gsd-executor subagents + manual gates. 07-01 pushed 3 migrations LIVE to prod Supabase (clean, no drift; regen types). Ran /impeccable audit + Playwright theme-parity pass on 07-04 myself. THEN diagnosed why a just-booked meeting didn't appear in /calls: live DB has 0 call_outcomes rows, no lead from the booking, and the only calendar_events are old (May 30). Root cause = Phase 7 is built but NOT DEPLOYED (15 unpushed commits → prod runs old code that never creates call_outcomes), AND the cal.com integration shows `disconnected` so today's booking webhook never arrived. Decided to wrap up + defer deploy + the real-booking walkthrough to a resume-point. NOTE: GSD `gsd-sdk` CLI not installed — STATE/ROADMAP updated manually. Known pre-existing: 25 tsc baseline errors + invalid-grant.test.ts failing (issue #58, integration_broken dead toggle) — both predate Phase 7.
**Resume file:** resume-point GitHub issue — "Phase 7 deploy + manual booking→/calls walkthrough"

---

## What's Done

| Artifact | Status | Notes |
|----------|--------|-------|
| PROJECT.md | ✅ Complete | Core product definition, constraints, key decisions |
| config.json | ✅ Complete | GSD config — YOLO mode, Sonnet, parallel execution |
| research/STACK.md | ✅ Complete | Stack decisions verified against official docs |
| research/FEATURES.md | ✅ Complete | Feature breakdown by category |
| research/ARCHITECTURE.md | ✅ Complete | Monorepo, schema, Inngest, Gmail patterns |
| research/PITFALLS.md | ✅ Complete | Top 10 gotchas with mitigations |
| research/SUMMARY.md | ✅ Complete | Distilled findings, table stakes, anti-features |
| REQUIREMENTS.md | ✅ Complete | Full REQ-IDs across 10 categories |
| ROADMAP.md | ✅ Complete | 5 phases with exit criteria and REQ-ID coverage |
| STATE.md | ✅ Complete | This file |

---

## In Progress

| Artifact | Status |
|----------|--------|
| Phase 1 Wave 1 — Plan 01-01 (Monorepo setup) | ✅ Complete (2026-05-05) |
| Phase 1 Wave 2 — Plan 01-02 (Supabase schema) | ✅ Complete (2026-05-05) — ktxgtpvilrydmedvzgft (eu-central-1) |
| Phase 1 Wave 3 — Plan 01-03 (Auth + invite flow) | ✅ Complete (2026-05-05) |
| Phase 1 Wave 4 — Plan 01-04 (Lead management) | ✅ Complete (2026-05-07) |
| Phase 1 Wave 4 — Plan 01-05 (Gmail OAuth) | ✅ Complete (2026-05-07) — HEALTH-008 verification pending Daniel |
| Phase 1 Wave 6 — Plan 01-06 (Coach dashboard) | ✅ Complete (2026-05-07) — AppShell, SidebarNav, DraftQueue, IntegrationHealthCard, Realtime. Impeccable audit 19/20. |
| Phase 1 Wave 7 — Plan 01-07 (Admin dashboard) | ✅ Complete (2026-05-07) — AdminShell, CoachRosterTable, CreateCoachSheet, SystemHealthPanel, CoachDetailDrawer, API routes. type-check clean. 4 e2e passing. |

---

## Key Decisions Made

| Decision | Status |
|----------|--------|
| Inngest over n8n | Locked |
| Gmail API sends AS coach | Locked |
| Fireflies + Zoom transcripts at launch | Locked |
| `call_completed` as distinct lead state | Locked |
| Smart auto-pause (no manual toggles) | Locked |
| AI drafts replies to lead inbound emails | Locked |
| Unsubscribe enforcement (CAN-SPAM) | Locked |
| Hard bounce → pause + notify coach | Locked |
| Integration health card (small, lights red on failure) | Locked |
| Draft regen + inline editing | Locked |
| Email thread view in dashboard (Phase 2) | Locked |
| Instagram scaffolded early, functionality Phase 2+ | Locked |
| All 7 calendar providers (unified abstraction) | Locked |
| Turborepo monorepo (4 packages) | Locked |

---

## Open Questions

| Question | Owner | Phase |
|----------|-------|-------|
| Validate Setmore, MS Bookings, TidyCal no-show webhook availability | Research during Phase 3 | 3 |
| Google OAuth app review timeline — must exit Testing mode before launch | Start in Phase 1 | 1 |
| Voice model example selection UX — category-guided or free-form paste? | Validate with Daniel before Phase 2 | 2 |
| Instagram API — confirm scaffolding approach with Meta review requirements | Phase 1 | 1 |

---

## Phase History

| Phase | Completed | Notes |
|-------|-----------|-------|
| Phase 1 — Foundation | 2026-05-07 | Monorepo, Supabase schema, auth, lead management, Gmail OAuth, coach dashboard (19/20 impeccable), admin dashboard. All exit criteria met. |
| Phase 2 — Intelligence | PLANNED 2026-05-19 | 5 plans (02-01 voice model, 02-02 transcripts, 02-03 AI engine, 02-04 regen, 02-05 thread view). 4 waves. All 23 requirement IDs covered. Ready to execute. |
| Phase 3 — Automation | COMPLETE 2026-05-20 | 03-01 ✅ (calendar webhooks, schema migration), 03-02 ✅ (Inngest sequence engine, enrollment API, cron routes, Pending Actions UI, Sequence Cadence settings), 03-03 ✅ (Gmail monitoring: Pub/Sub push receiver, watch renewal, polling fallback, bounce-detector, tracking pixel), 03-04 ✅ (reply handler: LEAD_REPLIED → pause sequence, cancel drafts, fire reply draft), 03-05 ✅ (compliance layer: HMAC unsubscribe tokens, /api/unsubscribe, /unsubscribe page, bounce-handler), 03-06 ✅ (Pending Actions UI: dismiss API with idempotency + Inngest enrollment, PendingActionCard 3/2 buttons, PendingActionsSection). |
| Phase 4 — Approval Channels | COMPLETE 2026-05-20 | W0: 04-00 ✅. W1: 04-01 ✅. W2: 04-02 ✅. W3: 04-03 ✅. W2P: 04-04 ✅ 04-05 ✅ 04-06 ✅. W4: 04-07 ✅ (dispatcher + follow-up CTA + HOLD cascade + bounce rewire + NotificationMatrix UI). 04-08 ✅ (draft-generation branching by autonomous_mode, buildDraftOutcome helper). 242 tests passing. |
| Phase 7 — Call Outcomes | CODE-COMPLETE 2026-06-03 (not deployed/verified) | 07-01 ✅ (call_outcomes table live in prod, 7 webhooks → processCalendarEvent, upsertLeadFromBooking), 07-02 ✅ (call-outcome-monitor + poller cron + fireCallOutcomeDownstream + state-machine SEND/NURTURE split), 07-03 ✅ (PATCH /api/call-outcomes/[id] + Slack interactivity), 07-04 ✅ code (/calls queue + LeadCallOutcomePanel + Module 2 CTA + Trophy timeline; impeccable 16/20). PENDING: gsd-verifier, deploy (15 unpushed commits), cal.com webhook reconnect, manual booking→/calls walkthrough. |

---

*State version: 1.0 — 2026-05-05*
