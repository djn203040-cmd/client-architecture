---
phase: 03-automation
plan: 06
subsystem: ui
tags: [react, supabase, inngest, pending-actions, next.js]

# Dependency graph
requires:
  - phase: 03-02
    provides: pending_actions table + PendingActionsSection scaffold
  - phase: 03-01
    provides: calendar webhooks + pending_action row creation on call events
provides:
  - dismiss API route with auth guard, Zod validation, idempotency, 5 action types, Inngest enrollment firing
  - PendingActionCard client component — 3 buttons for call_follow_up, 2 for lead_intake
  - PendingActionsSection server component — fetches non-dismissed items + lead names, renders null when empty
affects: [04-approval-channels, 05-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-component fetches data + passes explicit props to client card, dismiss API handles all side effects atomically]

key-files:
  created: []
  modified:
    - apps/web/app/api/pending-actions/[id]/dismiss/route.ts
    - apps/web/components/dashboard/PendingActionCard.tsx
    - apps/web/components/dashboard/PendingActionsSection.tsx

key-decisions:
  - "Dismiss API handles all side effects (enrollment, status change) — client only calls one endpoint"
  - "PendingActionsSection fetches lead names from leads table, passes to card as explicit props"
  - "Idempotency: dismissed_at check returns 200 without re-running side effects on double-dismiss"

patterns-established:
  - "Pending action cards: single dismiss endpoint handles all action types including enrollment via Inngest"
  - "Server component fetches + maps lookup data, client card receives only what it needs to render"

requirements-completed:
  - LEAD-006
  - LEAD-007
  - CAL-007
  - CAL-008
  - SEQ-010
  - SEQ-011

# Metrics
duration: 15min
completed: 2026-05-20
---

# Phase 03-06: Pending Actions UI Summary

**Dismiss API with auth guard + idempotency + Inngest enrollment, PendingActionCard with 3/2 action buttons, PendingActionsSection fetching live lead names**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-05-20
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Rewrote dismiss route: added idempotency check, `enroll` action value, Inngest event firing for `start_follow_up` (LEAD_MANUALLY_ENROLLED) and `enroll` (LEAD_NO_SHOW)
- Simplified PendingActionCard: removed double-API-call pattern, single `act()` call per button, explicit `{id, type, leadName, leadEmail}` props
- Updated PendingActionsSection: fetches lead names from leads table, passes explicit props, handles empty leadIds safely

## Task Commits

1. **Task 1: Dismiss API + PendingActionCard + PendingActionsSection** - `af74134` (feat)

## Files Created/Modified
- `apps/web/app/api/pending-actions/[id]/dismiss/route.ts` — Auth guard, Zod enum (5 values), idempotency, side effects per action, Inngest firing
- `apps/web/components/dashboard/PendingActionCard.tsx` — Client component, single act(), 3 buttons for call_follow_up, 2 for lead_intake
- `apps/web/components/dashboard/PendingActionsSection.tsx` — Server component, lead name fetch, null when empty

## Decisions Made
- **Single dismiss endpoint for all actions:** The previous scaffold made two separate API calls (sequences/enroll + dismiss). Consolidated into dismiss route to make enrollment atomic with dismissal.
- **enroll vs start_sequence:** Renamed action value from `start_sequence` to `enroll` to match plan spec and match the canonical enum.

## Deviations from Plan

### Auto-fixed Issues

**1. Prior scaffold used double-API-call pattern**
- **Found during:** Task 1 (reading existing PendingActionCard.tsx)
- **Issue:** Card was calling `/api/sequences/enroll` then `/api/pending-actions/${id}/dismiss` separately — two round trips, non-atomic
- **Fix:** Moved enrollment side effects into the dismiss route; card now makes one call
- **Committed in:** af74134

---

**Total deviations:** 1 auto-fixed (consolidation of double-call pattern)
**Impact on plan:** Necessary for correctness and atomicity. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 complete — all 6 plans done
- Ready for Phase 4: Approval channels (dashboard queue, email, Slack, Twilio WhatsApp)

---
*Phase: 03-automation*
*Completed: 2026-05-20*
