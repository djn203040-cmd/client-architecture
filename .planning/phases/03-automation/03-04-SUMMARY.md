---
phase: 03-automation
plan: 04
subsystem: api
tags: [inngest, gmail, lead-state, sequences, drafts]

# Dependency graph
requires:
  - phase: 03-02
    provides: Inngest sequence engine, sequences table schema, drafts table schema
  - phase: 03-03
    provides: Gmail monitoring fires LEAD_REPLIED event with coachId/leadId/messageId
provides:
  - replyHandler Inngest function — processes LEAD_REPLIED events (4 sequential steps)
  - lead.status → "replied" + lead_events log on reply detection
  - sequence.status → "paused" for all active sequences on reply
  - pending drafts cancelled on reply
  - draft/generate event fired with track:"replied" for Phase 2 AI engine
affects: [03-05, 03-06, 04-approval-channels, phase-2-ai-engine]

# Tech tracking
tech-stack:
  added: []
  patterns: [inngest-step-sendEvent-for-cross-function-events, coach-id-scoped-db-updates]

key-files:
  created:
    - apps/web/inngest/functions/reply-handler.ts
  modified:
    - apps/web/app/api/inngest/route.ts

key-decisions:
  - "step.sendEvent used (not inngest.send) for reply draft — idempotent on Inngest retries"
  - "lead.status read before update to log accurate from→to in lead_events"
  - "All DB updates double-scoped to both coach_id AND lead_id (T-03-16 mitigation)"

patterns-established:
  - "4-step sequential reply processing: update-lead-status → pause-sequence → cancel-pending-drafts → fire-reply-draft"
  - "State transitions always logged to lead_events with triggered_by: 'system' and from/to payload"

requirements-completed: [AI-008, AI-009, SEQ-008, SEQ-009, STATE-002]

# Metrics
duration: 10min
completed: 2026-05-20
---

# Phase 03-04: Reply Handler Summary

**LEAD_REPLIED Inngest handler: pauses sequence, cancels pending drafts, fires AI reply draft via step.sendEvent with track:"replied"**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-05-20
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- `replyHandler` Inngest function created with 4 ordered sequential steps matching D-16
- Lead state transition logged to `lead_events` with from/to fields and `triggered_by: "system"`
- All active sequences paused and all pending drafts cancelled on reply detection
- `draft/generate` event fired via `step.sendEvent` with `track: "replied"` — triggers Phase 2 AI state-aware prompt (D-14)
- `replyHandler` registered in `serve()` alongside all Phase 3 functions

## Files Created/Modified
- `apps/web/inngest/functions/reply-handler.ts` — 4-step reply handler, LEAD_REPLIED trigger
- `apps/web/app/api/inngest/route.ts` — replyHandler import + array registration

## Decisions Made
- Used `step.sendEvent` (not `inngest.send`) for `draft/generate` — memoized, idempotent on Inngest retries
- Read `lead.status` before update to populate accurate `from` field in `lead_events`
- All DB updates scoped to both `coach_id` AND `lead_id` per T-03-16 threat mitigation

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- 03-04 ✅ complete — reply handler wired and registered
- 03-05 (bounce handler) is next: LEAD_BOUNCED event → pause sequence + notify coach
- 03-06 (notification channels) follows: Twilio/Slack/Resend notification dispatch

---
*Phase: 03-automation*
*Completed: 2026-05-20*
