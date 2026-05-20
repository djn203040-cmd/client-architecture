---
phase: 03-automation
plan: 02
subsystem: api
tags: [inngest, sequences, cron, vercel, supabase, next.js]

# Dependency graph
requires:
  - phase: 03-01
    provides: pending_actions table, TCalendarEvent type, calendar webhook routes

provides:
  - Inngest sequence-no-show function with concurrency/cancelOn/sleepUntil/safety-check/auto-close
  - Inngest sequence-call-completed function with 30min delay, pending_actions card, waitForEvent
  - Shared pre-send safety check helper (sequence-step.ts)
  - Manual enrollment API at /api/sequences/enroll
  - Vercel cron routes for gmail-watch (daily) and gmail-poll (5min)
  - Pending Actions section on dashboard (shows when items exist)
  - Sequence Cadence settings tab with per-coach configurable delays
  - sequence-status-panel.tsx wired to enrollment API
  - IntegrationHealthCard with Auto/Manual no-show detection tooltip per provider

affects: [03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - step.sleepUntil with unique step IDs per loop iteration
    - step.sendEvent (never inngest.send inside functions)
    - step.waitForEvent for coach decision gate
    - Pre-send safety check before every draft generation step
    - coachId from session (never from request body) for enrollment auth

key-files:
  created:
    - apps/web/inngest/functions/sequence-step.ts
    - apps/web/inngest/functions/sequence-no-show.ts
    - apps/web/inngest/functions/sequence-call-completed.ts
    - apps/web/app/api/sequences/enroll/route.ts
    - apps/web/app/api/cron/gmail-watch/route.ts
    - apps/web/app/api/cron/gmail-poll/route.ts
    - apps/web/app/api/coaches/sequence-config/route.ts
    - apps/web/app/api/pending-actions/[id]/dismiss/route.ts
    - apps/web/components/dashboard/PendingActionsSection.tsx
    - apps/web/components/dashboard/PendingActionCard.tsx
    - apps/web/components/settings/SequenceSettingsClient.tsx
    - apps/web/components/integrations/IntegrationHealthCard.tsx
    - vercel.json
  modified:
    - apps/web/app/api/inngest/route.ts
    - apps/web/app/(dashboard)/dashboard/page.tsx
    - apps/web/app/(dashboard)/settings/page.tsx
    - apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx

key-decisions:
  - "sequence-call-completed uses step.waitForEvent for 30-day coach decision window before starting loop"
  - "Manual enrollment always uses timestamp-based Inngest ID to allow re-enrollment after sequence ends"
  - "PendingActionCard is a client component extracted from PendingActionsSection to keep server component clean"
  - "dismiss API marks dismissed_at and handles lead state transitions (closed → converted)"

patterns-established:
  - "Inngest sequence pattern: concurrency key per coachId, cancelOn for reply/book/unsub, sleepUntil loop with unique step IDs, safety check before each touchpoint"
  - "Cron route pattern: force-dynamic + CRON_SECRET bearer check + inngest.send"
  - "Settings pattern: server component fetches config, passes to client component for mutations"

requirements-completed:
  - SEQ-001
  - SEQ-002
  - SEQ-003
  - SEQ-004
  - SEQ-005
  - SEQ-006
  - SEQ-007
  - SEQ-008
  - SEQ-009
  - SEQ-010
  - SEQ-011
  - SEQ-012
  - SEQ-013
  - SEQ-015
  - STATE-004
  - STATE-005
  - LEAD-006
  - HEALTH-005
  - HEALTH-006

# Metrics
duration: 25min
completed: 2026-05-20
---

# Phase 03-02: Inngest Sequence Engine Summary

**Durable no-show and call-completed Inngest functions with per-coach cadence, manual enrollment API, Vercel cron triggers, and Pending Actions + Sequence Settings UI surfaces**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-20
- **Tasks:** 3
- **Files created:** 13 | **Files modified:** 4

## Accomplishments
- Full sequence engine: `sequence-no-show.ts` (5-touchpoint loop with concurrency, cancelOn 3 events, sleepUntil, safety check, auto-close) and `sequence-call-completed.ts` (30min delay → pending action card → 30-day waitForEvent → 3-touchpoint loop)
- Manual enrollment from lead profile wired end-to-end via `/api/sequences/enroll` + `sequence-status-panel.tsx` → `"use client"` with fetch/toast
- Infrastructure: Vercel cron (daily gmail-watch + 5min gmail-poll) with CRON_SECRET auth; all functions registered in Inngest serve()
- UI: PendingActionsSection on dashboard (conditional render above metrics grid) + Sequence Cadence settings with per-coach day arrays

## Files Created/Modified
- `apps/web/inngest/functions/sequence-step.ts` — `runPreSendSafetyCheck` + `buildDraftGeneratePayload` helpers
- `apps/web/inngest/functions/sequence-no-show.ts` — LEAD_NO_SHOW handler
- `apps/web/inngest/functions/sequence-call-completed.ts` — LEAD_CALL_COMPLETED handler
- `apps/web/app/api/inngest/route.ts` — serve() extended with both functions
- `apps/web/app/api/sequences/enroll/route.ts` — POST enrollment + coach decision resume
- `apps/web/app/api/cron/gmail-watch/route.ts` — daily cron → GMAIL_WATCH_RENEW event
- `apps/web/app/api/cron/gmail-poll/route.ts` — 5min cron → gmail/poll event
- `apps/web/app/api/coaches/sequence-config/route.ts` — PATCH cadence delays
- `apps/web/app/api/pending-actions/[id]/dismiss/route.ts` — dismiss + lead state transitions
- `apps/web/components/dashboard/PendingActionsSection.tsx` — server component fetches + renders cards
- `apps/web/components/dashboard/PendingActionCard.tsx` — client component with action buttons
- `apps/web/components/settings/SequenceSettingsClient.tsx` — cadence form client component
- `apps/web/components/integrations/IntegrationHealthCard.tsx` — per-provider card with Auto/Manual tooltip
- `apps/web/app/(dashboard)/dashboard/page.tsx` — added pending_actions count query + conditional section
- `apps/web/app/(dashboard)/settings/page.tsx` — added sequence_config fetch + Cadence section
- `apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx` — converted to "use client", wired onClick
- `vercel.json` — cron definitions at project root

## Decisions Made
- `sequence-call-completed` pauses at `step.waitForEvent` after creating the pending action card — the 3-touchpoint loop only runs after coach clicks "Start follow-up" (fires `LEAD_CALL_COMPLETED` with `action: "start_follow_up"`)
- Enrollment route handles both fresh enrollments (fires LEAD_NO_SHOW / LEAD_MANUALLY_ENROLLED) and resuming a waiting call-completed function (fires LEAD_CALL_COMPLETED with `action: "start_follow_up"`)
- `PendingActionCard` extracted as a client component sibling to keep `PendingActionsSection` a clean server component

## Deviations from Plan
None — plan executed exactly as written. `IntegrationHealthCard` was a new file (plan indicated "modify" but the file at `components/integrations/` didn't exist — created it there as specified).

## Issues Encountered
None

## Next Phase Readiness
- 03-03 (Gmail monitoring Inngest functions) can proceed: `gmailWatch` and `gmailMonitor` placeholder comments are in `apps/web/app/api/inngest/route.ts` ready to uncomment
- 03-04 (reply handler) placeholder also present

---
*Phase: 03-automation*
*Completed: 2026-05-20*
