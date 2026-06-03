# Project State — The Client Architecture

> Updated at each phase transition. Current state is always the source of truth.

---

## Current Status

**Stage:** Phase 7 executing — Wave 1 (07-01) + Wave 2a (07-02) complete; Wave 2b (07-03) next
**Active phase:** Phase 7 — Call Outcomes (post-launch milestone v1.1)
**Current plan:** 07-01 DONE (data + calendar refactor live in prod). 07-02 DONE — Inngest layer: call-outcome-monitor (sleepUntil ends_at+buffer → CAS flip awaiting_outcome → emit notification/call_outcome_pending, cancelOn cancelled/rescheduled) + call-outcome-poller resilience cron (/api/cron/call-outcome-poll, 15-min, CRON_SECRET); fireCallOutcomeDownstream (no_show/completed/converted) exported for 07-03; sequence-call-completed simplified (pending_actions + coach-decision wait removed → direct follow-up enrollment); notification-dispatcher call_outcome_pending case; state-machine.ts split SEND_BLOCK_STATES (no converted) vs NURTURE_BLOCK_STATES (with converted), sequence-step now gates on SEND_BLOCK_STATES. Typecheck at 25-error baseline (no new errors). Next: 07-03 (PATCH /api/call-outcomes/[id] + Slack interactivity), then Wave 3 = 07-04 (frontend /calls queue + impeccable audit, autonomous:false).
**Date:** 2026-06-03

**Last session:** Executed 07-02 end-to-end (3 atomic commits 49c934f / 38d7624 / e581faa). Monitor+poller pair both CAS-guarded against double-flip; converted is now live-not-nurtured (sends still go out via SEND_BLOCK_STATES exclusion, only auto-enrollment skips it via NURTURE_BLOCK_STATES). downstream.ts exports `fireCallOutcomeDownstream({outcome,coachId,leadId,callOutcomeId})` — the exact signature 07-03 imports. Slack call-outcome ts logged in notification_log (event_type=call_outcome_pending, payload.callOutcomeId) for 07-03's chat.update sync. NOTE: GSD `gsd-sdk` CLI is not installed in this env — STATE/ROADMAP updated manually.
**Resume file:** `.planning/phases/07-call-outcomes/07-03-api-slack-PLAN.md`

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

---

*State version: 1.0 — 2026-05-05*
