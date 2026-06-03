---
phase: 07-call-outcomes
plan: 02
type: execute
wave: 2
depends_on: ["07-01"]
autonomous: true
requirements: [CALL-003, CALL-008, CALL-010, CALL-013, CALL-014]
files_modified:
  - apps/web/inngest/functions/call-outcome-monitor.ts
  - apps/web/inngest/functions/call-outcome-poller.ts
  - apps/web/inngest/functions/sequence-call-completed.ts
  - apps/web/inngest/functions/notification-dispatcher.ts
  - apps/web/lib/call-outcomes/config.ts
  - apps/web/lib/call-outcomes/downstream.ts
  - apps/web/lib/safety/terminal-status.ts
  - apps/web/app/api/inngest/route.ts
  - apps/web/vercel.json

must_haves:
  truths:
    - "30 minutes after a call's scheduled end (per-coach buffer), the call_outcomes row flips to awaiting_outcome, prompted_at is set, and notification/call_outcome_pending is emitted"
    - "A resilience cron flips stranded scheduled outcomes whose ends_at+buffer has passed and prompted_at is null"
    - "No Show fires lead/no_show; Call Completed fires lead/call_completed into the simplified follow-up track; Converted cancels nurture, sets status=converted, writes call_converted timeline"
    - "Converted is treated as live-not-auto-nurtured: terminal-status guards (runPreSendSafetyCheck, re-engagement gating) do NOT lump converted with closed/do_not_contact"
    - "notification-dispatcher fans out call_outcome_pending to enabled channels like draft_ready"
  artifacts:
    - path: "apps/web/inngest/functions/call-outcome-monitor.ts"
      provides: "sleepUntil(ends_at+buffer) -> awaiting_outcome -> notify, cancelOn cancelled/rescheduled"
      contains: "sleepUntil"
    - path: "apps/web/inngest/functions/call-outcome-poller.ts"
      provides: "cron-triggered stranded-outcome recovery"
      contains: "awaiting_outcome"
    - path: "apps/web/lib/call-outcomes/downstream.ts"
      provides: "fireCallOutcomeDownstream(outcome) — no_show / completed / converted wiring"
      contains: "LEAD_CONVERTED"
    - path: "apps/web/lib/safety/terminal-status.ts"
      provides: "single source of truth for terminal/blocking statuses excluding converted"
      contains: "converted"
  key_links:
    - from: "apps/web/inngest/functions/call-outcome-monitor.ts"
      to: "notification/call_outcome_pending"
      via: "step.sendEvent after awaiting_outcome flip"
      pattern: "call_outcome_pending"
    - from: "apps/web/lib/call-outcomes/downstream.ts"
      to: "leads.status converted"
      via: "Converted branch updates status, cancels sequences"
      pattern: "converted"
---

<objective>
Build the Inngest layer for Call Outcomes: the `call-outcome-monitor` (sleepUntil → awaiting_outcome → notify), the resilience poller cron (so a lost run never strands a call), the downstream wiring for each of the 3 outcomes (no_show / completed / converted), the `notification-dispatcher` case for `call_outcome_pending`, and the D-01 terminal-status guard audit so `converted` stays live-not-nurtured.

Purpose: Makes the prompt actually fire on time and reliably, and ensures each decision drives the correct sequence — while keeping converted leads monitored.
Output: monitor + poller functions, `lib/call-outcomes/{config,downstream}.ts`, simplified `sequence-call-completed.ts`, dispatcher case, `lib/safety/terminal-status.ts`, registrations in inngest route + vercel.json cron.
</objective>

<execution_context>
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/workflows/execute-plan.md
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/07-call-outcomes/07-CONTEXT.md
@.planning/phases/07-call-outcomes/07-01-SUMMARY.md
@CLAUDE.md

<interfaces>
From 07-01 (now live):
  call_outcomes columns: id, coach_id, lead_id, scheduled_at, ends_at, status
    (scheduled|awaiting_outcome|resolved|cancelled), outcome, prompted_at, reminder_sent_at.
  record_call_outcome_atomic(p_id,p_outcome,p_actor) -> {ok,reason,new_status}
    (wrapper: apps/web/lib/call-outcomes/record-atomic.ts).
  LEAD_CALL_BOOKED data: { coachId, leadId, provider, externalEventId, eventStartAt, eventEndAt, callOutcomeId }.
  LEAD_CONVERTED = "lead/converted"; LEAD_NO_SHOW; LEAD_CALL_COMPLETED.
  calendar/rescheduled + calendar/cancelled events carry callOutcomeId (from process-event.ts).

From packages/shared/src/constants/events.ts: LEAD_* constants.
coaches.sequence_config JSONB already holds per-coach cadence config (no-show/follow-up live here).
  Add/read sequence_config.call_outcome_buffer_minutes (default 30, D-02).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: call-outcome-monitor + resilience poller cron + buffer config helper</name>
  <read_first>
    - apps/web/inngest/functions/sequence-no-show.ts (Inngest function shape: createFunction, triggers, step.sleepUntil, cancelOn, adminClient usage)
    - apps/web/inngest/functions/autonomous-mode-b-timer.ts (sleepUntil + cancelOn timer pattern — closest analog to the monitor)
    - apps/web/app/api/inngest/route.ts (function registration array — register monitor + poller)
    - apps/web/vercel.json (existing Vercel Cron entries from Phase 3 — add the poller schedule)
    - .planning/phases/03-automation/03-CONTEXT.md (Vercel Cron → Inngest bridge pattern, D-14)
    - .planning/phases/07-call-outcomes/07-CONTEXT.md (D-02 buffer, D-13 monitor, D-14 poller)
  </read_first>
  <action>
    Create apps/web/lib/call-outcomes/config.ts: `getCallOutcomeBufferMinutes(coachId): Promise<number>` — read coaches.sequence_config.call_outcome_buffer_minutes via adminClient; default 30.

    Create apps/web/inngest/functions/call-outcome-monitor.ts:
    - `export const callOutcomeMonitor = inngest.createFunction({ id: "call-outcome-monitor", cancelOn: [{ event: "calendar/cancelled", match: "data.callOutcomeId" }, { event: "calendar/rescheduled", match: "data.callOutcomeId" }] }, { event: LEAD_CALL_BOOKED }, async ({ event, step }) => {...})`.
    - buffer = await getCallOutcomeBufferMinutes(event.data.coachId); target = new Date(event.data.eventEndAt).getTime() + buffer*60_000.
    - `await step.sleepUntil("await-call-end", new Date(target));`
    - step.run "flip-awaiting": UPDATE call_outcomes SET status='awaiting_outcome', prompted_at=now() WHERE id=callOutcomeId AND status='scheduled' (guarded so the poller can't double-flip).
    - `await step.sendEvent("notify", { name: "notification/call_outcome_pending", data: { coachId, leadId, callOutcomeId } });`
    - Because rescheduled is in cancelOn, process-event re-sends LEAD_CALL_BOOKED on reschedule to re-arm (note this contract in 07-01 reschedule branch — verify it re-emits; if 07-01 only emitted calendar/rescheduled, ALSO have the monitor's rescheduled cancel be followed by a fresh LEAD_CALL_BOOKED from process-event — reconcile in SUMMARY).

    Create apps/web/inngest/functions/call-outcome-poller.ts (D-14 resilience): triggered by `{ event: "cron/call_outcome_poll" }`. step.run: SELECT id, coach_id, ends_at FROM call_outcomes WHERE status='scheduled' AND prompted_at IS NULL AND ends_at < now() (then in JS subtract per-coach buffer, OR push the buffer into SQL via a generous fixed floor + per-row buffer check). For each stranded row: UPDATE -> awaiting_outcome + prompted_at=now(); sendEvent notification/call_outcome_pending. Idempotent: the WHERE prompted_at IS NULL guard prevents re-notifying.

    Register both in apps/web/app/api/inngest/route.ts functions array. Add a Vercel Cron entry in apps/web/vercel.json pointing at the cron route that emits `cron/call_outcome_poll` every 15 minutes (`*/15 * * * *`) — mirror the existing Phase 3 cron entry exactly (same route handler convention).
  </action>
  <acceptance_criteria>
    - `apps/web/inngest/functions/call-outcome-monitor.ts` contains `sleepUntil` and `call_outcome_pending` and `cancelOn`
    - `apps/web/inngest/functions/call-outcome-poller.ts` contains `awaiting_outcome` and `prompted_at`
    - `apps/web/lib/call-outcomes/config.ts` contains `call_outcome_buffer_minutes`
    - `apps/web/app/api/inngest/route.ts` contains `callOutcomeMonitor` and `callOutcomePoller`
    - `grep -c "call_outcome" apps/web/vercel.json` >= 1
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "sleepUntil" apps/web/inngest/functions/call-outcome-monitor.ts && grep -q "call_outcome_pending" apps/web/inngest/functions/call-outcome-monitor.ts && grep -q "prompted_at" apps/web/inngest/functions/call-outcome-poller.ts && grep -q "callOutcomeMonitor" apps/web/app/api/inngest/route.ts && echo OK</automated>
  </verify>
  <done>Monitor sleeps to ends_at+buffer then flips+notifies; poller recovers stranded rows on a 15-min cron; both registered.</done>
</task>

<task type="auto">
  <name>Task 2: Downstream wiring (no_show/completed/converted), simplify sequence-call-completed, dispatcher case</name>
  <read_first>
    - apps/web/inngest/functions/sequence-call-completed.ts (lines ~54-74 — the pending_actions insert + waitForEvent('wait-for-coach-decision') to DROP; enroll directly into follow-up)
    - apps/web/inngest/functions/sequence-no-show.ts (LEAD_NO_SHOW consumer — leave unchanged; confirm event data shape)
    - apps/web/inngest/functions/notification-dispatcher.ts (draft_ready case ~line 60 — clone for call_outcome_pending; how it reads notification_preferences and fans to Slack/email/WhatsApp)
    - apps/web/lib/slack/blocks.ts (will need buildCallOutcomeBlocks from 07-03 — if not yet present, dispatcher should call it behind a guarded import; coordinate ordering in SUMMARY)
    - packages/shared/src/constants/events.ts (LEAD_CONVERTED added in 07-01)
  </read_first>
  <action>
    Create apps/web/lib/call-outcomes/downstream.ts exporting `fireCallOutcomeDownstream({ outcome, coachId, leadId, callOutcomeId })`:
    - 'no_show': `inngest.send({ name: LEAD_NO_SHOW, data: { coachId, leadId } })` (sequence-no-show.ts handles it, unchanged).
    - 'completed': `inngest.send({ name: LEAD_CALL_COMPLETED, data: { coachId, leadId } })` (simplified follow-up track below).
    - 'converted': idempotent inline (Claude's discretion D allows inline): (a) cancel active intake/follow-up/no-show sequences for the lead (reuse the existing cancel helper used elsewhere — grep for how reply-handler/sequence cancel sequences; emit the existing cancellation signal e.g. `sequence/cancel` or set sequences.status); (b) UPDATE leads SET status='converted' WHERE id=leadId AND status NOT IN ('lost','do_not_contact')-equivalent — do NOT set do_not_contact, do NOT touch contactability (D-01); (c) INSERT lead_events { type:'call_converted' } timeline; (d) `inngest.send({ name: LEAD_CONVERTED, data: { coachId, leadId } })` for any cancelOn consumers. Guard each step so a double-call no-ops.

    Simplify apps/web/inngest/functions/sequence-call-completed.ts (D-15): DELETE the `pending_actions` insert (type='call_follow_up') and the `step.waitForEvent('wait-for-coach-decision', ...)` block and its decision branch. The "decision" is now the Call Outcomes feature itself. On LEAD_CALL_COMPLETED, enroll DIRECTLY into the follow-up track (call the same follow-up sequence creation the old `start_follow_up` branch ran). Leave the rest of the follow-up loop intact.

    Add the dispatcher case in apps/web/inngest/functions/notification-dispatcher.ts: add a trigger/case for `{ event: "notification/call_outcome_pending" }` that mirrors the draft_ready case — read the coach's notification_preferences for `call_outcome_pending`, and fan out to Slack (post buildCallOutcomeBlocks — provided by 07-03; if 07-03 lands after, import lazily and SUMMARY-note the wiring), email (Resend), and WhatsApp (Twilio) per enabled channels. Store the Slack message ts in notification_log (same as draft_ready) keyed so 07-03's sync can find it.
  </action>
  <acceptance_criteria>
    - `apps/web/lib/call-outcomes/downstream.ts` contains `LEAD_CONVERTED` and `call_converted` and `LEAD_NO_SHOW`
    - `apps/web/inngest/functions/sequence-call-completed.ts` does NOT contain `wait-for-coach-decision`: `grep -c "wait-for-coach-decision" apps/web/inngest/functions/sequence-call-completed.ts` == 0
    - `apps/web/inngest/functions/sequence-call-completed.ts` does NOT contain `call_follow_up`: `grep -c "call_follow_up" apps/web/inngest/functions/sequence-call-completed.ts` == 0
    - `apps/web/inngest/functions/notification-dispatcher.ts` contains `call_outcome_pending`
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "LEAD_CONVERTED" apps/web/lib/call-outcomes/downstream.ts && test "$(grep -c 'wait-for-coach-decision' apps/web/inngest/functions/sequence-call-completed.ts)" = "0" && grep -q "call_outcome_pending" apps/web/inngest/functions/notification-dispatcher.ts && echo OK</automated>
  </verify>
  <done>Each outcome drives the right downstream; call-completed enrolls directly into follow-up (stub removed); dispatcher fans out call_outcome_pending.</done>
</task>

<task type="auto">
  <name>Task 3: D-01 terminal-status guard audit — converted stays live, not nurtured</name>
  <read_first>
    - apps/web/inngest/functions/sequence-step.ts (runPreSendSafetyCheck — the terminal-lead / DNC / inactive-sequence gate; confirm whether it treats converted as blocking)
    - apps/web/lib/safety/ (the runPreSendSafetyCheck home + any existing terminal-status list)
    - the re-engagement enrollment gating (grep for re-engage / re_engagement / silence-gated enrollment guard — project memory: 3d/3 re-engagement)
    - .planning/phases/07-call-outcomes/07-CONTEXT.md (D-01 — converted = live, just not auto-nurtured; NEVER lumped with closed/do_not_contact)
    - supabase/migrations/20260601000001_rename_lead_status_closed_to_lost.sql (the terminal status set: lost / do_not_contact)
  </read_first>
  <action>
    Create apps/web/lib/safety/terminal-status.ts as the single source of truth:
    - `export const HARD_BLOCK_STATUSES = ['lost','do_not_contact'] as const;` (NOTE: 'converted' is deliberately ABSENT — D-01.)
    - `export function isAutoSendBlocked(lead): boolean` returning true if lead.do_not_contact || HARD_BLOCK_STATUSES.includes(lead.status). Converted leads return FALSE (drafts may still be approved/sent — the coach keeps using AI drafts on the now-active client).
    - `export const AUTO_NURTURE_BLOCKED_STATUSES = [...HARD_BLOCK_STATUSES, 'converted'] as const;` — used ONLY by re-engagement enrollment (converted should not be AUTO-enrolled into nurture, but stays reply/transcript live).
    Audit + rewire:
    - runPreSendSafetyCheck: ensure its terminal check imports/uses HARD_BLOCK_STATUSES (NOT a hardcoded list that includes converted). If it currently blocks converted, change it so converted passes the safety check (reply-driven drafts to a converted client must send).
    - Re-engagement enrollment gating: ensure it uses AUTO_NURTURE_BLOCKED_STATUSES (so converted is NOT auto-re-engaged) — but the Gmail reply handler and transcript ingestion paths MUST NOT gate on converted at all (grep them: confirm they only check do_not_contact / unsubscribed, never converted).
    Add a brief comment block at the converted branch in downstream.ts pointing to terminal-status.ts as the canonical guard.
  </action>
  <acceptance_criteria>
    - `apps/web/lib/safety/terminal-status.ts` exists and contains `HARD_BLOCK_STATUSES`
    - converted is NOT in the hard-block list: `grep -A2 "HARD_BLOCK_STATUSES =" apps/web/lib/safety/terminal-status.ts | grep -c "converted"` == 0
    - `apps/web/lib/safety/terminal-status.ts` contains `AUTO_NURTURE_BLOCKED_STATUSES` and that list DOES include converted: `grep -A2 "AUTO_NURTURE_BLOCKED_STATUSES" apps/web/lib/safety/terminal-status.ts | grep -c converted` >= 1
    - runPreSendSafetyCheck references the shared list: `grep -rc "HARD_BLOCK_STATUSES\|terminal-status" apps/web/inngest/functions/sequence-step.ts apps/web/lib/safety/ | grep -v ':0' | head -1` non-empty
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "HARD_BLOCK_STATUSES" apps/web/lib/safety/terminal-status.ts && test "$(grep -A2 'HARD_BLOCK_STATUSES =' apps/web/lib/safety/terminal-status.ts | grep -c converted)" = "0" && grep -q "AUTO_NURTURE_BLOCKED_STATUSES" apps/web/lib/safety/terminal-status.ts && echo OK</automated>
  </verify>
  <done>converted is treated as live-not-nurtured everywhere: send-safety/reply/transcript never block it; only auto re-engagement excludes it.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Vercel Cron → cron/call_outcome_poll | Scheduled trigger that mutates call_outcomes |
| Inngest function → call_outcomes (service role) | State transitions must be idempotent + coach-scoped |
| downstream → leads.status | Converted status write must never set do_not_contact |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-08 | Tampering | poller + monitor double-flip same row | mitigate | Both flips guarded `WHERE status='scheduled' AND prompted_at IS NULL`; idempotent |
| T-07-09 | Elevation | converted lead mistakenly hard-blocked or auto-nurtured | mitigate | terminal-status.ts: converted absent from HARD_BLOCK; present only in AUTO_NURTURE_BLOCKED (D-01) |
| T-07-10 | DoS | lost Inngest sleepUntil run strands a call forever | mitigate | D-14 resilience poller cron recovers stranded scheduled rows every 15 min |
| T-07-11 | Tampering | cron route invoked by unauthenticated caller | mitigate | Reuse the existing Phase 3 cron-route auth (CRON_SECRET / Vercel cron header) — same handler convention |
| T-07-12 | Info disclosure | lead PII logged in monitor/dispatcher | accept→mitigate | No PII in console.log; IDs only (CALL-016) |
</threat_model>

<verification>
- `pnpm --filter web typecheck` exits 0.
- sequence-call-completed.ts has zero `wait-for-coach-decision` / `call_follow_up`.
- terminal-status.ts: converted excluded from hard-block, included in auto-nurture-block.
- Monitor + poller registered in inngest route; cron entry in vercel.json.
</verification>

<success_criteria>
- Prompt fires at ends_at+buffer and on the resilience cron (CALL-003, CALL-014).
- Each outcome drives the right downstream; provider no_show already auto-resolves via 07-01 + here fires LEAD_NO_SHOW (CALL-008, CALL-010).
- Converted stays live-not-nurtured across all guards (CALL-013, D-01).
</success_criteria>

<output>
After completion, create `.planning/phases/07-call-outcomes/07-02-SUMMARY.md`
</output>
