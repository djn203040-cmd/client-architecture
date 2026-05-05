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
- [ ] 01-03-PLAN.md — Auth + invite flow (Supabase Auth invite-only, Daniel creates coach accounts, middleware admin gate, shadcn primitives)
- [ ] 01-04-PLAN.md — Lead management (CRUD, lead profile, activity timeline, coach notes auto-save, state machine foundation)
- [ ] 01-05-PLAN.md — Gmail OAuth connection (OAuth 2.0 flow, Vault token storage, scope validation, invalid_grant handler, HEALTH-008 review submission)
- [ ] 01-06-PLAN.md — Coach dashboard (AppShell, sidebar, IntegrationHealthCard, DraftQueueScaffold with Realtime, DraftCard, InlineDraftEditor)
- [ ] 01-07-PLAN.md — Admin dashboard (/admin role gate + CoachRosterTable + CreateCoachSheet + SystemHealthPanel + read-only coach detail)

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

### Plans
1. **Voice model builder** — structured profile UI, example message ingestion, Layer 1 + Layer 2 construction
2. **Transcript integration** — Fireflies.ai webhook, Zoom webhook, transcript storage + lead matching, manual upload fallback
3. **AI draft engine** — context assembler, Anthropic API, XML delimiters, token counting, stage-aware generation
4. **Draft regeneration + confidence indicator** — one-click regen, thin-context warning
5. **Email thread view** — Gmail API thread reading, display in lead profile

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

### Plans
1. **Calendar abstraction layer** — unified `CalendarEvent` type, all 7 provider adapters
2. **Inngest sequence engine** — full state machine, concurrency keys, `cancelOn`, `step.sleepUntil`, pre-send safety check
3. **Gmail monitoring** — Pub/Sub watch, 6-day renewal cron, polling fallback, reply detection
4. **Reply handling** — `lead/replied` event, sequence pause, AI reply draft, approval flow entry
5. **Compliance layer** — unsubscribe link + API route, hard bounce detection, do-not-contact enforcement
6. **Lead intake monitoring** — Gmail signal detection, "add to sequence?" coach prompt

### Requirements covered
STATE-002, STATE-003, STATE-004, STATE-005, STATE-006, STATE-008, STATE-010,
AI-008, AI-009,
SEQ-001, SEQ-002, SEQ-003, SEQ-004, SEQ-005, SEQ-006, SEQ-007, SEQ-008, SEQ-009, SEQ-010, SEQ-011, SEQ-012, SEQ-013, SEQ-014, SEQ-015,
COMPLY-001, COMPLY-002, COMPLY-003, COMPLY-004, COMPLY-005, COMPLY-006, COMPLY-007, COMPLY-008,
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

### Plans
1. **Dashboard approval queue (full)** — live queue via Supabase Realtime, keyboard shortcuts, Approve + Next flow
2. **Email notifications** — Resend integration, draft notification with review link
3. **Slack integration** — webhook setup, full draft in message, Approve / Hold buttons, approve-from-Slack flow
4. **Twilio WhatsApp + SMS** — draft notification, delivery tracking, SMS fallback
5. **Autonomous mode** — Mode A (full auto-send) and Mode B (auto-send on 24h timeout), Postgres lock on status transition
6. **24h follow-up + HOLD flow** — second notification, HOLD state, indefinite hold management

### Requirements covered
DRAFT-001, DRAFT-002, DRAFT-007, DRAFT-008, DRAFT-009, DRAFT-010, DRAFT-011,
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
1. **Locked module sell screens** — Module 2 and Module 3 with premium copy and Book a Call CTA
2. **Onboarding wizard** — Gmail connect, voice model setup, first lead walkthrough
3. **Settings page** — autonomous mode toggle, notification channel management, profile settings
4. **Playwright E2E tests** — duplicate sequence prevention, cross-tenant isolation, pre-send safety check, webhook signature bypass, full approval flow

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

## Milestone Summary

| Phase | Name | Weeks | Status |
|-------|------|-------|--------|
| 1 | Foundation | 1–3 | Not started |
| 2 | Intelligence | 4–6 | Not started |
| 3 | Automation | 7–9 | Not started |
| 4 | Approval Channels | 10–12 | Not started |
| 5 | Polish | 13–14 | Not started |

---

*Roadmap version: 1.0 — 2026-05-05*
*Next update: after Phase 1 exit criteria met*
