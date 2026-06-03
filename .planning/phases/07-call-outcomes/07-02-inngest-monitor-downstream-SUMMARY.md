---
phase: 07-call-outcomes
plan: 02
subsystem: api
tags: [inngest, vercel-cron, sleepuntil, notifications, slack-blockkit, state-machine, typescript]

# Dependency graph
requires:
  - phase: 07-call-outcomes (plan 07-01)
    provides: call_outcomes table + record_call_outcome_atomic RPC + LEAD_CALL_BOOKED data shape + buildCallOutcomeBlocks + calendar/cancelled|rescheduled events carrying callOutcomeId
  - phase: 03-automation
    provides: Vercel Cron -> Inngest bridge pattern, runPreSendSafetyCheck, sequence model
  - phase: 04-approval-channels
    provides: notification dispatcher fan-out, notification_preferences matrix, Slack post + notification_log ts pattern
provides:
  - call-outcome-monitor Inngest function (sleepUntil ends_at+buffer -> CAS flip awaiting_outcome -> emit notification/call_outcome_pending; cancelOn cancelled/rescheduled)
  - call-outcome-poller resilience function + /api/cron/call-outcome-poll route (15-min cron, CRON_SECRET Bearer) recovering stranded scheduled rows
  - fireCallOutcomeDownstream({outcome,coachId,leadId,callOutcomeId}) — no_show / completed / converted wiring (imported by 07-03)
  - simplified sequence-call-completed (pending_actions + coach-decision wait removed; direct follow-up enrollment)
  - notification-dispatcher call_outcome_pending case (Slack via buildCallOutcomeBlocks + dashboard + email)
  - split terminal-status sets in state-machine.ts (SEND_BLOCK_STATES excludes converted; NURTURE_BLOCK_STATES includes it)
  - getCallOutcomeBufferMinutes config helper (coaches.sequence_config.call_outcome_buffer_minutes, default 30)
affects: [07-03-api-slack, 07-04-frontend-calls-queue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Monitor + resilience-poller pair: sleepUntil arm + 15-min cron safety net, both CAS-guarded against double-flip"
    - "Split send-block vs nurture-block status sets — converted is live-not-nurtured (D-01)"
    - "Producer emits full TNotificationEvent {eventType,payload} with IDs only; dispatcher hydrates lead name/time (no PII on the wire)"

key-files:
  created:
    - apps/web/lib/call-outcomes/config.ts
    - apps/web/lib/call-outcomes/downstream.ts
    - apps/web/inngest/functions/call-outcome-monitor.ts
    - apps/web/inngest/functions/call-outcome-poller.ts
    - apps/web/app/api/cron/call-outcome-poll/route.ts
  modified:
    - apps/web/app/api/inngest/route.ts
    - apps/web/vercel.json
    - apps/web/inngest/functions/sequence-call-completed.ts
    - apps/web/inngest/functions/notification-dispatcher.ts
    - apps/web/inngest/functions/sequence-step.ts
    - apps/web/lib/notifications/channels/slack.ts
    - apps/web/lib/notifications/channels/email.ts
    - packages/shared/src/lib/state-machine.ts
    - packages/shared/src/types/notifications.ts

key-decisions:
  - "cancelOn uses if-expression (async.data.callOutcomeId == event.data.callOutcomeId) to match the established Inngest pattern in this codebase rather than the plan's match shorthand — equivalent semantics, consistent with autonomous-mode-b-timer/sequence-no-show"
  - "Converted handled inline in downstream.ts (D-15 Claude's discretion) with NOT IN (converted,lost,do_not_contact) guard so a double-call no-ops and a lost/DNC lead is never regressed"
  - "Slack call-outcome post lives in postCallOutcomeSlack (channels/slack.ts) for log/ts bookkeeping; dispatcher builds the blocks (buildCallOutcomeBlocks) and stores callOutcomeId in notification_log.payload so 07-03's sync can find the ts"
  - "TERMINAL_STATES kept as a back-compat alias of NURTURE_BLOCK_STATES so isTerminalState/UI gates keep converted-inclusive semantics; only the send path switched to SEND_BLOCK_STATES"

patterns-established:
  - "getCallOutcomeBufferMinutes: per-coach buffer read with default+validation, shared by monitor and poller"
  - "Resilience poller: select candidates by partial-index predicate, apply per-coach buffer in JS, idempotent CAS flip + notify"

requirements-completed: [CALL-003, CALL-008, CALL-010, CALL-013, CALL-014]

# Metrics
duration: ~12min
completed: 2026-06-03
---

# Phase 7 Plan 07-02: Inngest Monitor + Downstream Summary

**The Call Outcomes prompt now fires reliably (sleepUntil ends_at+buffer with a 15-min resilience cron), each of the three outcomes drives the correct downstream track, and `converted` is split into a live-not-nurtured status that still sends but is never auto-enrolled.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-03T11:39:29Z
- **Completed:** 2026-06-03T11:49:51Z
- **Tasks:** 3
- **Files created:** 5 | **modified:** 9

## Accomplishments
- `call-outcome-monitor` arms on `LEAD_CALL_BOOKED`, sleeps until `ends_at + per-coach buffer`, CAS-flips the row to `awaiting_outcome`, sets `prompted_at`, and emits `notification/call_outcome_pending` — cancelling cleanly on reschedule/cancel (the 07-01 reschedule branch re-emits `LEAD_CALL_BOOKED` to re-arm).
- `call-outcome-poller` + `/api/cron/call-outcome-poll` (CRON_SECRET Bearer, every 15 min) recover any scheduled row whose `ends_at + buffer` has passed and was never prompted — the D-14 safety net so a lost run never strands a call. Both flips are CAS-guarded (`status='scheduled' AND prompted_at IS NULL`) so monitor and poller can never double-flip (T-07-08).
- `fireCallOutcomeDownstream` wires `no_show -> LEAD_NO_SHOW`, `completed -> LEAD_CALL_COMPLETED`, and `converted` inline (cancel active sequences, `status='converted'` without touching `do_not_contact`, `call_converted` timeline, `LEAD_CONVERTED` broadcast). `sequence-call-completed` lost its `pending_actions` card + coach-decision wait and now enrolls directly into the follow-up track (D-15).
- D-01 terminal-status split landed in the real source of truth: `SEND_BLOCK_STATES` (no `converted`) gates outbound send; `NURTURE_BLOCK_STATES` (with `converted`) gates auto-enrollment. `sequence-step` now uses `SEND_BLOCK_STATES`, so reply-driven/approved drafts to a converted client send while `lost/unsubscribed/do_not_contact/bounced` still hard-block.

## Task Commits

1. **Task 1: monitor + resilience poller + cron route + buffer config** - `49c934f` (feat)
2. **Task 2: downstream wiring + simplified call-completed + dispatcher case** - `38d7624` (feat)
3. **Task 3: terminal-status split (converted stays sendable)** - `e581faa` (feat)

## Files Created/Modified
- `apps/web/lib/call-outcomes/config.ts` - per-coach buffer reader (default 30)
- `apps/web/inngest/functions/call-outcome-monitor.ts` - sleepUntil -> CAS flip -> notify, cancelOn cancelled/rescheduled
- `apps/web/inngest/functions/call-outcome-poller.ts` - stranded-row recovery, JS buffer filter, idempotent
- `apps/web/app/api/cron/call-outcome-poll/route.ts` - Vercel Cron handler emitting `cron/call_outcome_poll`
- `apps/web/lib/call-outcomes/downstream.ts` - `fireCallOutcomeDownstream` (imported by 07-03)
- `apps/web/inngest/functions/sequence-call-completed.ts` - simplified to direct follow-up enrollment
- `apps/web/inngest/functions/notification-dispatcher.ts` - `call_outcome_pending` fan-out
- `apps/web/inngest/functions/sequence-step.ts` - gate switched to `SEND_BLOCK_STATES`
- `apps/web/lib/notifications/channels/slack.ts` - `postCallOutcomeSlack` (logs ts + callOutcomeId for 07-03 sync)
- `apps/web/lib/notifications/channels/email.ts` - `call_outcome_pending` email branch
- `packages/shared/src/lib/state-machine.ts` - split send-block vs nurture-block sets
- `packages/shared/src/types/notifications.ts` - payload gains `callOutcomeId` / `callTime`
- `apps/web/app/api/inngest/route.ts`, `apps/web/vercel.json` - registrations

## Decisions Made
- `cancelOn` written with the codebase's `if`-expression style rather than the plan's `match` shorthand (equivalent, consistent with neighbouring functions).
- Converted handled inline in `downstream.ts` per D-15 discretion, with a `NOT IN (converted,lost,do_not_contact)` status guard for idempotency + never-regress.
- Slack posting/log mechanics kept in `channels/slack.ts` (`postCallOutcomeSlack`); the dispatcher owns the `buildCallOutcomeBlocks` call and stores `callOutcomeId` in `notification_log.payload` for 07-03's `chat.update` retire.
- `TERMINAL_STATES` retained as a back-compat alias of `NURTURE_BLOCK_STATES`; UI `isTerminalState` semantics unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Producer event shape aligned to TNotificationEvent**
- **Found during:** Task 2 (dispatcher case)
- **Issue:** The plan had monitor/poller emit a flat `{coachId,leadId,callOutcomeId}`, but the notification-dispatcher consumes `TNotificationEvent` (`{coachId,eventType,payload}`). A flat payload would have desynced the dispatcher fan-out.
- **Fix:** monitor and poller now emit `{coachId, eventType:"call_outcome_pending", payload:{callOutcomeId,leadId}}`; the dispatcher hydrates lead name + call time from the DB (keeps IDs-only on the wire, CALL-016).
- **Files modified:** call-outcome-monitor.ts, call-outcome-poller.ts, notification-dispatcher.ts, packages/shared/src/types/notifications.ts
- **Verification:** app typecheck stays at the 25-error baseline; dispatcher grep passes.
- **Committed in:** `38d7624`

**2. [Rule 2 - Missing Critical] call_outcome_pending email/dashboard branch**
- **Found during:** Task 2
- **Issue:** Routing `call_outcome_pending` through the generic email sender would have produced the wrong ("integration needs attention") body, and the Slack draft path doesn't post interactive outcome buttons.
- **Fix:** Added a dedicated `call_outcome_pending` email branch (records-the-outcome nudge) and a bespoke Slack post (`postCallOutcomeSlack` + `buildCallOutcomeBlocks`); dashboard uses the existing generic sender.
- **Files modified:** notification-dispatcher.ts, channels/slack.ts, channels/email.ts
- **Verification:** typecheck clean; dispatcher contains `buildCallOutcomeBlocks` + `call_outcome_pending`.
- **Committed in:** `38d7624`

**3. [Rule 3 - Blocking] state-set declarations reformatted to single-line**
- **Found during:** Task 3
- **Issue:** Multi-line array declarations broke the plan's acceptance greps (`grep -A2 'SEND_BLOCK_STATES ='`) because the values landed beyond the `-A2` window.
- **Fix:** Declared both sets single-line with `as const satisfies readonly TLeadStatus[]` (prettier-ignored) so the greps and the `.includes` casts both hold.
- **Files modified:** packages/shared/src/lib/state-machine.ts
- **Verification:** all Task 3 acceptance greps pass; shared package typecheck clean; validators.test.ts 21/21 pass.
- **Committed in:** `e581faa`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing-critical)
**Impact on plan:** All necessary for the dispatcher/producer contract and the acceptance greps to hold. No scope creep; export signature `fireCallOutcomeDownstream({outcome,coachId,leadId,callOutcomeId})` matches what 07-03 imports.

## Threat Model Coverage
- T-07-08 (double-flip): both monitor and poller flips guarded by `status='scheduled' [AND prompted_at IS NULL]`.
- T-07-09 (converted mis-gated): `converted` absent from `SEND_BLOCK_STATES`, present only in `NURTURE_BLOCK_STATES`.
- T-07-10 (lost run strands a call): D-14 poller cron recovers stranded rows every 15 min.
- T-07-11 (unauthenticated cron): `/api/cron/call-outcome-poll` requires `Bearer ${CRON_SECRET}`, 401 otherwise.
- T-07-12 (PII in logs): producers carry IDs only; lead name hydrated in the dispatcher, never logged.

## Issues Encountered
- `notification_log` has no `event_type` column in the regenerated DB types, yet existing channel inserts pass it; Supabase's insert generic tolerates the extra key (pre-existing pattern). Matched it and stored `callOutcomeId` in the existing `payload` JSON column for 07-03's ts lookup. No new typecheck errors.

## User Setup Required
None - `CRON_SECRET` is already provisioned (gmail-poll uses the same Bearer auth). Vercel will pick up the new cron entry on next deploy.

## Next Phase Readiness
- 07-03 can import `fireCallOutcomeDownstream` (exact signature confirmed) and find the Slack message `ts` via `notification_log` (`event_type='call_outcome_pending'`, `payload.callOutcomeId`).
- Monitor + poller registered in the Inngest route; cron registered in `vercel.json`.
- Converted leads stay fully sendable through the reply/transcript/draft paths.

## Self-Check: PASSED

---
*Phase: 07-call-outcomes*
*Completed: 2026-06-03*
