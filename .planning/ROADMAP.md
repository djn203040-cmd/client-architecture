# Roadmap — The Client Architecture

> Phases are sequential. Each phase must be verified before the next begins.
> REQ-IDs link requirements to phases. Run `/gsd-plan-phase <N>` to generate the execution plan for a phase.

---

## Phase 1 — Foundation
**Goal:** Everything running end-to-end with real data. A coach can connect Gmail, add a lead, see it in their dashboard, and Daniel can see everything in the admin view. Full Supabase schema finalized — this is the most critical ordering constraint for all downstream phases.

**Weeks:** 1–3

**Plans:** 7 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo + project setup (Turborepo, TypeScript strict, Tailwind v4, shadcn/ui, test infrastructure, CI gates) ✓ 2026-05-05
- [x] 01-02-PLAN.md — Supabase schema (complete: 11 tables + RLS + Vault + Realtime publication; type generation) ✓ 2026-05-05
- [x] 01-03-PLAN.md — Auth + invite flow (Supabase Auth invite-only, Daniel creates coach accounts, middleware admin gate, shadcn primitives) ✓ 2026-05-06
- [x] 01-04-PLAN.md — Lead management (CRUD, lead profile, activity timeline, coach notes auto-save, state machine foundation) ✓ 2026-05-07
- [x] 01-05-PLAN.md — Gmail OAuth connection (OAuth 2.0 flow, Vault token storage, scope validation, invalid_grant handler, HEALTH-008 review submission) ✓ 2026-05-07
- [x] 01-06-PLAN.md — Coach dashboard (AppShell, sidebar, IntegrationHealthCard, DraftQueueScaffold with Realtime, DraftCard, InlineDraftEditor) ✓ 2026-05-08
- [x] 01-07-PLAN.md — Admin dashboard (/admin role gate + CoachRosterTable + CreateCoachSheet + SystemHealthPanel + read-only coach detail) ✓ 2026-05-08

### Requirements covered
LEAD-001, LEAD-002, LEAD-003, LEAD-004, LEAD-005, LEAD-008, LEAD-009,
STATE-001, STATE-007, STATE-009,
AI-012,
VOICE-006,
DRAFT-003, DRAFT-004, DRAFT-005, DRAFT-006, DRAFT-012, DRAFT-013, DRAFT-014,
COMPLY-009, COMPLY-010,
HEALTH-001, HEALTH-002, HEALTH-003, HEALTH-004, HEALTH-007, HEALTH-008,
GMAIL-001, GMAIL-002, GMAIL-003,
ADMIN-001, ADMIN-002, ADMIN-003, ADMIN-004, ADMIN-005, ADMIN-006,
INFRA-001, INFRA-002, INFRA-003, INFRA-004, INFRA-005, INFRA-006, INFRA-007, INFRA-008, INFRA-009, INFRA-010

### Exit criteria
- [ ] Coach can connect Gmail account via OAuth and see "Connected" in health card
- [ ] Coach can add a lead manually and see them in the lead list
- [ ] Lead profile shows timeline, notes field, state, sequence status
- [ ] Daniel can access `/admin` and see all coach accounts
- [ ] No public signup possible — invite-only confirmed
- [ ] Google OAuth app review process initiated
- [ ] All RLS policies verified — no cross-coach data leakage

---

## Phase 2 — Intelligence
**Goal:** AI generates drafts that sound like the coach wrote them, with full context from call transcripts and lead history. Coach can review draft quality before automation is built.

**Weeks:** 4–6

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Voice model builder (Phase 2 schema migration, ai-engine client/guardrails/voice-analysis, Settings → My Voice corpus import + Layer 1/Layer 2 review) ✓ 2026-05-19
- [x] 02-02-PLAN.md — Transcript integration (Fireflies + Zoom webhooks with signature verification, lead matching, Unmatched queue tab, manual upload) ✓ 2026-05-19
- [x] 02-03-PLAN.md — AI draft engine (context assembler + token budgeting, state-aware prompts, generateDraft, generate route, AI lead description card) ✓ 2026-05-19
- [x] 02-04-PLAN.md — Draft regeneration + confidence indicator (one-click regen route, DraftCard regen button + amber confidence badge) ✓ 2026-05-19
- [x] 02-05-PLAN.md — Email thread view (Gmail API thread fetch, EmailThreadView as first lead-profile tab) ✓ 2026-05-19

### Wave structure
- Wave 1: 02-01 (includes BLOCKING schema migration)
- Wave 2: 02-02 (depends on 02-01 — transcripts Realtime publication)
- Wave 3: 02-03 (depends on 02-01 + 02-02 — voice model + transcripts)
- Wave 4: 02-04 + 02-05 (parallel — depend on 02-03 / 02-01 respectively)

### Requirements covered
AI-001, AI-002, AI-003, AI-004, AI-005, AI-006, AI-007, AI-010, AI-011,
VOICE-001, VOICE-002, VOICE-003, VOICE-004, VOICE-005,
TRANS-001, TRANS-002, TRANS-003, TRANS-004, TRANS-005, TRANS-006, TRANS-007, TRANS-008,
GMAIL-009

### Exit criteria
- [ ] Voice model builder allows coach to set tone profile and upload 10+ example messages
- [ ] Transcript webhook receives and stores a Fireflies transcript against a lead
- [ ] Transcript webhook receives and stores a Zoom transcript against a lead
- [ ] AI draft generated for a no-show lead references transcript content and coach voice
- [ ] Draft regeneration produces a visibly different draft on one click
- [ ] Confidence indicator appears when fewer than 8 voice examples exist
- [ ] Email thread view shows full conversation with a lead in the dashboard

---

## Phase 3 — Automation
**Goal:** Sequences run end-to-end without manual intervention. Calendar webhooks start sequences. Gmail monitors replies and auto-pauses. AI drafts replies when a lead responds.

**Weeks:** 7–9

**Plans:** 6 plans

Plans:
- [ ] 03-01-PLAN.md — Calendar abstraction layer (schema migration + pending_actions table, Wave 0 test stubs, TCalendarEvent type, 7 provider adapters with per-provider HMAC verification)
- [ ] 03-02-PLAN.md — Inngest sequence engine (sequence-no-show + sequence-call-completed functions, enrollment API, Vercel cron routes, Sequence Settings UI, Pending Actions UI, sequence-status-panel wired)
- [ ] 03-03-PLAN.md — Gmail monitoring (lib/gmail/monitor.ts, lib/gmail/bounce-detector.ts, gmail-watch + gmail-monitor Inngest functions, Pub/Sub push receiver, tracking pixel)
- [ ] 03-04-PLAN.md — Reply handling (reply-handler.ts Inngest function — 4-step: status update + pause + cancel drafts + fire reply draft)
- [ ] 03-05-PLAN.md — Compliance layer (HMAC unsubscribe token lib, /api/unsubscribe route, /unsubscribe page, bounce-handler.ts Inngest function)
- [ ] 03-06-PLAN.md — Lead intake monitoring + Pending Actions UI (dismiss API route, full PendingActionCard + PendingActionsSection implementation)

### Wave structure
- Wave 1: 03-01 (schema migration — BLOCKING; 7 calendar provider routes; Wave 0 test stubs)
- Wave 2: 03-02 (Inngest engine — depends on 03-01 for sequence_config column)
- Wave 3: 03-03 + 03-04 (parallel — Gmail monitoring + reply handler; both depend on 03-02)
- Wave 4: 03-05 + 03-06 (parallel — compliance + lead intake UI; both depend on 03-02)

### Requirements covered
STATE-002, STATE-003, STATE-004, STATE-005, STATE-006, STATE-008, STATE-010,
AI-008, AI-009,
SEQ-001, SEQ-002, SEQ-003, SEQ-004, SEQ-005, SEQ-006, SEQ-007, SEQ-008, SEQ-009, SEQ-010, SEQ-011, SEQ-012, SEQ-013, SEQ-014, SEQ-015,
COMPLY-001, COMPLY-002, COMPLY-003, COMPLY-004, COMPLY-005, COMPLY-007, COMPLY-008,
HEALTH-005, HEALTH-006,
GMAIL-004, GMAIL-005, GMAIL-006, GMAIL-007, GMAIL-008,
CAL-001, CAL-002, CAL-003, CAL-004, CAL-005, CAL-006, CAL-007, CAL-008, CAL-009,
LEAD-006, LEAD-007

### Exit criteria
- [ ] Calendly no-show webhook starts an Inngest sequence for the lead
- [ ] Call-completed event starts post-call messaging track (distinct from no-show)
- [ ] Lead reply detected via Gmail monitoring → sequence auto-pauses within 60s
- [ ] AI reply draft generated and entered into approval queue on lead reply
- [ ] Unsubscribe link in every outbound email → sets `do_not_contact` → no further emails
- [ ] Hard bounce → sequence paused → coach notified on all channels
- [ ] Duplicate webhook retry does not create a second sequence (idempotency verified)
- [ ] Pre-send safety check blocks send when lead state is terminal (test with all terminal states)
- [ ] All 7 calendar providers receive and process a test webhook

---

## Phase 4 — Approval Channels
**Goal:** Coach can approve, edit, or hold drafts from any device — dashboard, email, Slack, or WhatsApp. Autonomous mode available for coaches who want it.

**Weeks:** 10–12

**Plans:** 9 plans

Plans:
- [ ] 04-00-PLAN.md — Wave 0 test scaffolding (22 vitest/playwright test stubs + 5 shared utility/mock files; flips 04-VALIDATION.md nyquist_compliant)
- [ ] 04-01-PLAN.md — Schema migration + advisory-lock RPCs + shared types (D-25 columns/tables, 4 SECURITY DEFINER RPCs in private schema, BLOCKING schema push to ktxgtpvilrydmedvzgft, type regen, approveDraftAtomic/holdDraftAtomic/consumeReviewToken wrappers, seedNotificationPreferences)
- [ ] 04-02-PLAN.md — Dashboard approval queue (full) + /api/drafts/[id] PATCH (Held tab, HeldDraftActions R/E/C, CelebrationEmptyState "You're all caught up.", DraftCard variant/surface props, Realtime status filter)
- [ ] 04-03-PLAN.md — Email channel + tokenized review page + short-link + Resend webhook (review-token lib, Resend client/signature, draft-ready/follow-up/bounce templates, /(review)/review/[token] page with 4 states, /r/[token] redirect, /r/invalid, PATCH /api/review/[token] single-use nonce, GET /api/review/[token]/data read-only, /api/webhooks/resend Svix verify)
- [ ] 04-04-PLAN.md — Slack channel (per-coach OAuth install+callback, signature verify, Block Kit message with full body + 3 buttons, interactivity webhook with atomic approve/hold and Edit modal, sendSlack adapter)
- [ ] 04-05-PLAN.md — Twilio WhatsApp + SMS + status webhook (Content API with approved utility templates, MessagingServiceSid SMS, buildSmsBody ≤160-char enforcement, /api/webhooks/twilio/status delivery tracking)
- [ ] 04-06-PLAN.md — Autonomous modes A + B (Settings UI with RadioGroup, AutonomousModeAConfirmModal type-to-confirm "send without review", PATCH /api/settings/autonomous-mode server-side phrase check, autonomous-mode-b-timer Inngest function with sleepUntil + cancelOn + CAS approve)
- [ ] 04-07-PLAN.md — Multi-channel dispatcher + 24h follow-up + 48h HOLD cascade + bounce wiring + Notification matrix UI (lib/notifications/dispatcher.ts, Promise.allSettled fan-out with distinct step ids, dashboard channel adapter, draft-followup-cta with two sleepUntil steps, bounce-handler rewired through dispatcher, 4×5 NotificationMatrix with dashboard+hard-bounce-SMS locks, settings index links)
- [ ] 04-08-PLAN.md — Upstream draft-creation autonomous-mode branching (B-2 reviewer fix — apps/web/app/api/drafts/generate/route.ts branches on coach.autonomous_mode to fire draft/created_mode_b, draft/created_pending, notification/draft_ready, or direct status='approved' + draft/send_via_gmail; consumed by 04-06 + 04-07)

### Wave structure
- Wave 0: 04-00 (test scaffolding — Nyquist gate)
- Wave 1: 04-01 (schema migration + RPCs — BLOCKING schema push to live Supabase; required by every downstream plan)
- Wave 2 (parallel — no file overlap):
  - 04-02 dashboard queue
  - 04-04 Slack OAuth + interactivity
  - 04-05 Twilio WhatsApp + SMS + status webhook
  - 04-06 Autonomous mode UI + Mode B timer
- Wave 3: 04-03 email + review page (depends on 04-02 DraftCard variant/surface props)
- Wave 4 (parallel — both depend on 04-06 + 04-07):
  - 04-07 dispatcher + matrix UI + follow-up + hold cascade + bounce rewire
  - 04-08 upstream draft-creation autonomous-mode branching (B-2 reviewer fix)

### Requirements covered
DRAFT-001, DRAFT-002, DRAFT-007, DRAFT-008, DRAFT-009, DRAFT-010, DRAFT-011,
COMPLY-006,
NOTIFY-001, NOTIFY-002, NOTIFY-003, NOTIFY-004, NOTIFY-005, NOTIFY-006, NOTIFY-007, NOTIFY-008

### Exit criteria
- [ ] Draft notification sent on all connected channels simultaneously when draft is ready
- [ ] Coach can approve from dashboard with keyboard shortcut (A key)
- [ ] Coach can approve draft directly from Slack message
- [ ] WhatsApp notification received on coach's phone for a new draft
- [ ] SMS fallback fires when WhatsApp delivery fails
- [ ] 24h window expires → follow-up CTA sent → another 24h → HOLD confirmed
- [ ] Autonomous Mode B auto-sends draft after 24h with no coach action
- [ ] Concurrent approval attempt from two channels resolves correctly (Postgres lock verified)

---

## Phase 5 — Polish
**Goal:** Product is launch-ready. Locked module sell screens are compelling. Onboarding wizard gets a new coach live fast. Playwright tests cover all critical paths.

**Weeks:** 13–14

### Plans
- [x] 05-01-PLAN.md — Locked module sell screens (Module 2 Threshold + Module 3 Continuation with Cal.com embed) ✓ 2026-05-21
- [x] 05-02-PLAN.md — New-coach onboarding wizard (4-step flow with demo lead intercept) ✓ 2026-05-21
- [x] 05-03-PLAN.md — Settings consolidation (Phase 5 schema + 6-section settings page) ✓ 2026-05-20
- [x] 05-04-PLAN.md — Playwright E2E launch suite (8 specs + CI workflow) ✓ 2026-05-21
- [x] 05-05-PLAN.md — Impeccable polish sweep (50 components audited, 2 REDs fixed) ✓ 2026-05-21

### Requirements covered
MODULE-001, MODULE-002, MODULE-003,
VOICE-005

### Exit criteria
- [ ] Module 2 sell screen live in dashboard with correct copy
- [ ] Module 3 sell screen live in dashboard with correct copy
- [ ] New coach can complete onboarding (Gmail connect → voice model → first lead) in under 15 minutes
- [ ] Playwright: duplicate sequence test passes
- [ ] Playwright: cross-tenant data isolation test passes
- [ ] Playwright: pre-send safety check blocks send in terminal state
- [ ] Playwright: full approval flow (draft → approve → sent) passes
- [ ] All components pass `/impeccable audit`

---

## Phase 6 — Comprehensive Testing & Security Hardening
**Goal:** Prove the product works (automated), Daniel personally signs off on every human-judgment surface (manual UAT), and the system is hardened for production — no leaks, no hardcoded secrets, encryption at rest and in transit, RLS verified, OAuth tokens vaulted, every webhook signed, zero PII in logs.

**Weeks:** 15–16

**Master plan:** `phases/06-testing/06-PLAN.md` — the canonical 494-line checklist (3 sections, 40+ subsections).

**Executable sub-plans:**
- [ ] 06-01-automated-test-suite-PLAN.md — Section 1: unit + integration + Playwright E2E suites, Lighthouse CI, k6 load, Sentry, /api/health, full CI matrix
- [ ] 06-02-security-hardening-PLAN.md — Section 3: gitleaks gate, browser headers, 14-webhook signature audit, RLS pen-test, Vault audit, rate limits, PII redaction, audit_log, SECURITY.md + runbooks, /security-review
- [ ] 06-03-manual-uat-prep-PLAN.md — Section 2: staging seeder, voice corpus slot, /admin/uat UI, UAT-LOG.md + LAUNCH-SIGN-OFF.md

### Wave structure
- Wave 1 (parallel-safe via explicit ownership boundaries):
  - 06-01 — owns `.github/workflows/test.yml`, vitest configs, tests/unit/, tests/integration/ (non-security), tests/e2e/, Lighthouse, k6, size-limit, /api/health. Scaffolds sentry.{client,server}.config.ts with stub `beforeSend`.
  - 06-02 — owns `.github/workflows/security.yml`, gitleaks/.env.example, middleware headers, webhook sig verification, RLS pen-test, Vault audit (incl. voice corpus encryption), rate limits, PII redactor (writes sentry beforeSend body + .eslintrc no-console), audit_log, GDPR endpoints, SECURITY.md + docs/.
- Wave 2: 06-03 — depends on 06-01 (test-utils, factories) + 06-02 (audit_log, headers, Daniel-only middleware, MFA UI surface).

### Exit criteria
- [ ] CI green on `main` — all automated tests passing
- [ ] Daniel has personally completed Section 2 UAT and signed off
- [ ] Zero findings from gitleaks, `pnpm audit`, `/security-review`
- [ ] All RLS policies cross-tenant pen-tested
- [ ] All webhook signatures verified (14 sources)
- [ ] Launch authorization signed by Daniel

---

## Phase 7 — Call Outcomes
**Goal:** Close the post-call loop. Every calendar booking (all 7 providers) is monitored — it creates a lead if new or updates an existing one, sets `call_booked`, and opens a `call_outcomes` record. Thirty minutes after the call's scheduled end, the coach is asked one question — **No Show / Call Completed / Converted** — surfaced in a dedicated `/calls` queue, inside the lead profile, and as interactive Slack buttons. The chosen outcome drives lead status, writes to the timeline, and fires the right downstream sequence. This is the productized front-end of the half-built `pending_actions` / `wait-for-coach-decision` stub, and it fixes the standing gap where calendar webhooks never auto-create leads.

**Weeks:** 17–18 (post-launch milestone v1.1)

**Requirements covered:** CALL-001 … CALL-016. Builds on CAL-006/007/008 (Inngest call events), STATE-002/003/004 (no_show / call_completed / converted states), STATE-009 (timeline logging).

**Context:** `phases/07-call-outcomes/07-CONTEXT.md` — full scope + 4 locked product decisions (Converted keeps the lead live, prompt at call end +30m, provider no-show auto-resolves, no-email bookings get a placeholder lead).

**Planned sub-plans (4, wave-ordered):**
- [x] 07-01 — Data + calendar processing refactor: `call_outcomes` table/enums/RLS/RPC, shared types, `processCalendarEvent` + `upsertLeadFromBooking` across all 7 webhooks, `call_booked` timeline. (Wave 1) ✓ 2026-06-03
- [x] 07-02 — Inngest: `call-outcome-monitor` (sleep→awaiting), resilience poller cron, downstream wiring (no_show / call_completed / converted), notification-dispatcher case, state-machine send-block/nurture-block split. (Wave 2, depends 07-01) ✓ 2026-06-03
- [x] 07-03 — API + Slack: `PATCH /api/call-outcomes/[id]`, Block Kit builder, interactivity branch, `syncSlackCallOutcomeMessage`. (Wave 2, depends 07-01) ✓ 2026-06-03
- [x] 07-04 — Frontend: `/calls` queue page, `LeadCallOutcomePanel`, timeline icons, sidebar nav, impeccable audit (16/20). (Wave 3, depends 07-01/02/03) ✓ 2026-06-03 — code complete; manual walkthrough + deploy deferred to resume-point

### Exit criteria
- [ ] A booking on any of the 7 providers creates/updates a lead and a `call_outcomes` row, with `call_booked` on the timeline
- [ ] 30 min after a call ends, the coach is prompted on `/calls`, the lead profile, and Slack
- [ ] Each of the 3 outcomes drives the correct status, timeline event, and downstream sequence
- [ ] Converted leads stay live for replies + transcripts (not lumped with `closed`/`do_not_contact`)
- [ ] Provider no-show webhooks auto-resolve; no-email bookings get a placeholder lead
- [ ] Outcome decision is atomic + idempotent; resilience cron recovers stranded calls
- [ ] `/impeccable audit` passes on the new queue + card

---

## Milestone Summary

| Phase | Name | Weeks | Status |
|-------|------|-------|--------|
| 1 | Foundation | 1–3 | DONE 2026-05-08 |
| 2 | Intelligence | 4–6 | DONE 2026-05-19 |
| 3 | Automation | 7–9 | DONE 2026-05-20 |
| 4 | Approval Channels | 10–12 | DONE 2026-05-20 |
| 5 | Polish | 13–14 | DONE 2026-05-21 |
| 6 | Testing & Security | 15–16 | PLANNED 2026-05-21 — 3 sub-plans decomposed |
| 7 | Call Outcomes | 17–18 | EXECUTING 2026-06-03 — 3/4 plans (07-01, 07-02, 07-03 done) |

---

*Roadmap version: 1.7 — 2026-06-03*
*Next update: after Phase 7 planning*
