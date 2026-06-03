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
  - apps/web/inngest/functions/sequence-step.ts
  - apps/web/lib/call-outcomes/config.ts
  - apps/web/lib/call-outcomes/downstream.ts
  - packages/shared/src/lib/state-machine.ts
  - apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx
  - apps/web/app/api/cron/call-outcome-poll/route.ts
  - apps/web/app/api/inngest/route.ts
  - apps/web/vercel.json

must_haves:
  truths:
    - "30 minutes after a call's scheduled end (per-coach buffer), the call_outcomes row flips to awaiting_outcome, prompted_at is set, and notification/call_outcome_pending is emitted"
    - "A resilience cron flips stranded scheduled outcomes whose ends_at+buffer has passed and prompted_at is null"
    - "No Show fires lead/no_show; Call Completed fires lead/call_completed into the simplified follow-up track; Converted cancels nurture, sets status=converted, writes call_converted timeline"
    - "Converted is treated as live-not-auto-nurtured: the shared send-block set EXCLUDES converted so reply-driven drafts to a converted client still send, while the nurture-block set INCLUDES converted"
    - "notification-dispatcher fans out call_outcome_pending to enabled channels like draft_ready"
  artifacts:
    - path: "apps/web/inngest/functions/call-outcome-monitor.ts"
      provides: "sleepUntil(ends_at+buffer) -> awaiting_outcome -> notify, cancelOn cancelled/rescheduled"
      contains: "sleepUntil"
    - path: "apps/web/inngest/functions/call-outcome-poller.ts"
      provides: "cron-triggered stranded-outcome recovery"
      contains: "awaiting_outcome"
    - path: "apps/web/app/api/cron/call-outcome-poll/route.ts"
      provides: "Vercel Cron route handler that emits cron/call_outcome_poll (CRON_SECRET Bearer auth)"
      contains: "cron/call_outcome_poll"
    - path: "apps/web/lib/call-outcomes/downstream.ts"
      provides: "fireCallOutcomeDownstream(outcome) — no_show / completed / converted wiring"
      contains: "LEAD_CONVERTED"
    - path: "packages/shared/src/lib/state-machine.ts"
      provides: "split send-block (excludes converted) vs nurture-block (includes converted) sets"
      contains: "SEND_BLOCK_STATES"
  key_links:
    - from: "apps/web/inngest/functions/call-outcome-monitor.ts"
      to: "notification/call_outcome_pending"
      via: "step.sendEvent after awaiting_outcome flip"
      pattern: "call_outcome_pending"
    - from: "apps/web/lib/call-outcomes/downstream.ts"
      to: "leads.status converted"
      via: "Converted branch updates status, cancels sequences"
      pattern: "converted"
    - from: "apps/web/app/api/cron/call-outcome-poll/route.ts"
      to: "cron/call_outcome_poll"
      via: "inngest.send"
      pattern: "cron/call_outcome_poll"
---

<objective>
Build the Inngest layer for Call Outcomes: the `call-outcome-monitor` (sleepUntil → awaiting_outcome → notify), the resilience poller cron route + function (so a lost run never strands a call), the downstream wiring for each of the 3 outcomes (no_show / completed / converted), the `notification-dispatcher` case for `call_outcome_pending`, and the D-01 terminal-status split in the REAL source of truth (`packages/shared/src/lib/state-machine.ts`) so `converted` stays live-not-nurtured.

Purpose: Makes the prompt actually fire on time and reliably, and ensures each decision drives the correct sequence — while keeping converted leads sendable (just not auto-nurtured).
Output: monitor + poller functions, the `call-outcome-poll` cron route, `lib/call-outcomes/{config,downstream}.ts`, simplified `sequence-call-completed.ts`, dispatcher case, the split `state-machine.ts` + its 2 consumers rewired, registrations in inngest route + vercel.json cron.
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
  07-01 ALSO created buildCallOutcomeBlocks in apps/web/lib/slack/blocks.ts (stable export — this plan imports it).
  rescheduled branch in process-event.ts re-emits LEAD_CALL_BOOKED with the updated callOutcomeId + new window (re-arms the monitor).

From packages/shared/src/constants/events.ts: LEAD_* constants.
coaches.sequence_config JSONB already holds per-coach cadence config (no-show/follow-up live here).
  Add/read sequence_config.call_outcome_buffer_minutes (default 30, D-02).

The REAL terminal-status source of truth (packages/shared/src/lib/state-machine.ts):
  export const TERMINAL_STATES: readonly TLeadStatus[] = ["converted","lost","unsubscribed","do_not_contact","bounced"];
  export function isTerminalState(s): boolean;  export function blocksOutboundEmail(s, dnc): boolean;
  Consumers: apps/web/inngest/functions/sequence-step.ts (runPreSendSafetyCheck + a second TERMINAL_STATES.includes gate, both -> "terminal_lead"),
             apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx (isTerminalState gates canStart).
  NOTE: TERMINAL_STATES CURRENTLY CONTAINS "converted" — that is the bug to fix.

Vercel Cron pattern (mirror apps/web/app/api/cron/gmail-poll/route.ts EXACTLY):
  import "server-only"; import { inngest } from "@/inngest/client"; export const dynamic="force-dynamic";
  export async function GET(request) { if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return 401; await inngest.send({name,data:{}}); return 200 }
  Registered in apps/web/vercel.json `crons` array as { "path": "/api/cron/<name>", "schedule": "<cron>" }.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: call-outcome-monitor + resilience poller (function + cron route) + buffer config helper</name>
  <read_first>
    - apps/web/inngest/functions/sequence-no-show.ts (Inngest function shape: createFunction, triggers, step.sleepUntil, cancelOn, adminClient usage)
    - apps/web/inngest/functions/autonomous-mode-b-timer.ts (sleepUntil + cancelOn timer pattern — closest analog to the monitor)
    - apps/web/app/api/cron/gmail-poll/route.ts (the EXACT cron-route handler to mirror: CRON_SECRET Bearer auth -> inngest.send)
    - apps/web/app/api/inngest/route.ts (function registration array — register monitor + poller)
    - apps/web/vercel.json (existing `crons` array — gmail-watch / gmail-poll entries; add the call-outcome-poll entry in the same shape)
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
    - Reschedule re-arm is deterministic: 07-01's process-event.ts rescheduled branch re-emits LEAD_CALL_BOOKED (with the updated callOutcomeId + new window) AFTER updating the row, so the cancelOn cancel of the stale run is immediately followed by a fresh monitor arm. No extra handling needed here — just rely on the cancelOn + the re-emitted LEAD_CALL_BOOKED.

    Create apps/web/inngest/functions/call-outcome-poller.ts (D-14 resilience): triggered by `{ event: "cron/call_outcome_poll" }`. step.run "select-stranded": SELECT id, coach_id, ends_at FROM call_outcomes WHERE status='scheduled' AND prompted_at IS NULL AND ends_at < now() (candidate rows whose call has ended — uses the partial index idx_call_outcomes_poller). Then, for EACH candidate row, in JS compute buffer = await getCallOutcomeBufferMinutes(row.coach_id) and SKIP the row unless `Date.now() >= new Date(row.ends_at).getTime() + buffer*60_000` (so the poller never prompts before ends_at + buffer). For each row that passes the buffer check: UPDATE call_outcomes SET status='awaiting_outcome', prompted_at=now() WHERE id=row.id AND status='scheduled' AND prompted_at IS NULL; sendEvent notification/call_outcome_pending { coachId, leadId, callOutcomeId }. Idempotent: the WHERE prompted_at IS NULL guard prevents re-notifying.

    Create apps/web/app/api/cron/call-outcome-poll/route.ts — mirror apps/web/app/api/cron/gmail-poll/route.ts EXACTLY: `import "server-only"; import { inngest } from "@/inngest/client"; export const dynamic = "force-dynamic"; export async function GET(request: Request) { const authHeader = request.headers.get("authorization"); if (authHeader !== \`Bearer ${process.env.CRON_SECRET}\`) return new Response("Unauthorized", { status: 401 }); await inngest.send({ name: "cron/call_outcome_poll", data: {} }); return new Response("OK"); }`.

    Register both Inngest functions in apps/web/app/api/inngest/route.ts functions array (callOutcomeMonitor, callOutcomePoller). Add a Vercel Cron entry to the `crons` array in apps/web/vercel.json: `{ "path": "/api/cron/call-outcome-poll", "schedule": "*/15 * * * *" }` (every 15 min). The `path` MUST match the new route exactly (/api/cron/call-outcome-poll).
  </action>
  <acceptance_criteria>
    - `apps/web/inngest/functions/call-outcome-monitor.ts` contains `sleepUntil` and `call_outcome_pending` and `cancelOn`
    - `apps/web/inngest/functions/call-outcome-poller.ts` contains `awaiting_outcome` and `prompted_at` and `getCallOutcomeBufferMinutes`
    - `apps/web/app/api/cron/call-outcome-poll/route.ts` contains `cron/call_outcome_poll` and `CRON_SECRET`
    - `apps/web/lib/call-outcomes/config.ts` contains `call_outcome_buffer_minutes`
    - `apps/web/app/api/inngest/route.ts` contains `callOutcomeMonitor` and `callOutcomePoller`
    - `grep -c "call-outcome-poll" apps/web/vercel.json` >= 1 (path matches the new route)
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "sleepUntil" apps/web/inngest/functions/call-outcome-monitor.ts && grep -q "call_outcome_pending" apps/web/inngest/functions/call-outcome-monitor.ts && grep -q "prompted_at" apps/web/inngest/functions/call-outcome-poller.ts && grep -q "cron/call_outcome_poll" apps/web/app/api/cron/call-outcome-poll/route.ts && grep -q "call-outcome-poll" apps/web/vercel.json && grep -q "callOutcomeMonitor" apps/web/app/api/inngest/route.ts && echo OK</automated>
  </verify>
  <done>Monitor sleeps to ends_at+buffer then flips+notifies; poller recovers stranded rows (buffer-filtered in JS) on a 15-min cron via the new cron route + vercel.json entry; both functions registered.</done>
</task>

<task type="auto">
  <name>Task 2: Downstream wiring (no_show/completed/converted), simplify sequence-call-completed, dispatcher case</name>
  <read_first>
    - apps/web/inngest/functions/sequence-call-completed.ts (lines ~54-74 — the pending_actions insert + waitForEvent('wait-for-coach-decision') to DROP; enroll directly into follow-up)
    - apps/web/inngest/functions/sequence-no-show.ts (LEAD_NO_SHOW consumer — leave unchanged; confirm event data shape)
    - apps/web/inngest/functions/notification-dispatcher.ts (draft_ready case ~line 60 — clone for call_outcome_pending; how it reads notification_preferences and fans to Slack/email/WhatsApp)
    - apps/web/lib/slack/blocks.ts (buildCallOutcomeBlocks — created in 07-01; import it directly, it is a stable export)
    - packages/shared/src/constants/events.ts (LEAD_CONVERTED added in 07-01)
  </read_first>
  <action>
    Create apps/web/lib/call-outcomes/downstream.ts exporting `fireCallOutcomeDownstream({ outcome, coachId, leadId, callOutcomeId })`:
    - 'no_show': `inngest.send({ name: LEAD_NO_SHOW, data: { coachId, leadId } })` (sequence-no-show.ts handles it, unchanged).
    - 'completed': `inngest.send({ name: LEAD_CALL_COMPLETED, data: { coachId, leadId } })` (simplified follow-up track below).
    - 'converted': idempotent inline (Claude's discretion D allows inline): (a) cancel active intake/follow-up/no-show sequences for the lead (reuse the existing cancel helper used elsewhere — grep for how reply-handler/sequence cancel sequences; emit the existing cancellation signal e.g. `sequence/cancel` or set sequences.status); (b) UPDATE leads SET status='converted' WHERE id=leadId AND status NOT IN ('lost','do_not_contact') — do NOT set do_not_contact, do NOT touch contactability (D-01); (c) INSERT lead_events { type:'call_converted' } timeline; (d) `inngest.send({ name: LEAD_CONVERTED, data: { coachId, leadId } })` for any cancelOn consumers. Guard each step so a double-call no-ops.

    Simplify apps/web/inngest/functions/sequence-call-completed.ts (D-15): DELETE the `pending_actions` insert (type='call_follow_up') and the `step.waitForEvent('wait-for-coach-decision', ...)` block and its decision branch. The "decision" is now the Call Outcomes feature itself. On LEAD_CALL_COMPLETED, enroll DIRECTLY into the follow-up track (call the same follow-up sequence creation the old `start_follow_up` branch ran). Leave the rest of the follow-up loop intact.

    Add the dispatcher case in apps/web/inngest/functions/notification-dispatcher.ts: add a trigger/case for `{ event: "notification/call_outcome_pending" }` that mirrors the draft_ready case — read the coach's notification_preferences for `call_outcome_pending`, and fan out to Slack (post buildCallOutcomeBlocks — imported directly from apps/web/lib/slack/blocks.ts, created in 07-01), email (Resend), and WhatsApp (Twilio) per enabled channels. Store the Slack message ts in notification_log keyed so 07-03's sync can find it.
  </action>
  <acceptance_criteria>
    - `apps/web/lib/call-outcomes/downstream.ts` contains `LEAD_CONVERTED` and `call_converted` and `LEAD_NO_SHOW`
    - `apps/web/inngest/functions/sequence-call-completed.ts` does NOT contain `wait-for-coach-decision`: `grep -c "wait-for-coach-decision" apps/web/inngest/functions/sequence-call-completed.ts` == 0
    - `apps/web/inngest/functions/sequence-call-completed.ts` does NOT contain `call_follow_up`: `grep -c "call_follow_up" apps/web/inngest/functions/sequence-call-completed.ts` == 0
    - `apps/web/inngest/functions/notification-dispatcher.ts` contains `call_outcome_pending` and `buildCallOutcomeBlocks`
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "LEAD_CONVERTED" apps/web/lib/call-outcomes/downstream.ts && test "$(grep -c 'wait-for-coach-decision' apps/web/inngest/functions/sequence-call-completed.ts)" = "0" && grep -q "call_outcome_pending" apps/web/inngest/functions/notification-dispatcher.ts && echo OK</automated>
  </verify>
  <done>Each outcome drives the right downstream; call-completed enrolls directly into follow-up (stub removed); dispatcher fans out call_outcome_pending using 07-01's buildCallOutcomeBlocks.</done>
</task>

<task type="auto">
  <name>Task 3: D-01 terminal-status split — converted stays sendable, only auto-nurture excludes it</name>
  <read_first>
    - packages/shared/src/lib/state-machine.ts (THE source of truth: TERMINAL_STATES currently INCLUDES "converted"; isTerminalState; blocksOutboundEmail — this is the file to split)
    - apps/web/inngest/functions/sequence-step.ts (TWO TERMINAL_STATES.includes(lead.status) -> "terminal_lead" gates: runPreSendSafetyCheck at line ~15 and a second consumer — both must move to the SEND-block set)
    - apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx (isTerminalState gates canStart — confirm desired behavior: a converted lead should still NOT auto-start a fresh nurture sequence, so this UI gate uses the NURTURE-block predicate)
    - the re-engagement enrollment gating (grep for re-engage / re_engagement / silence-gated enrollment guard — project memory: 3d/3 re-engagement) — must use the NURTURE-block set
    - .planning/phases/07-call-outcomes/07-CONTEXT.md (D-01 — converted = live, just not auto-nurtured; NEVER lumped with lost/do_not_contact for SENDING)
    - supabase/migrations/20260601000001_rename_lead_status_closed_to_lost.sql (the status enum: lost / do_not_contact / unsubscribed / bounced)
  </read_first>
  <action>
    Edit packages/shared/src/lib/state-machine.ts to SPLIT the single TERMINAL_STATES list into two explicit sets (do NOT introduce a parallel file or a fabricated lib/safety dir):
    - `export const SEND_BLOCK_STATES: readonly TLeadStatus[] = ["lost","unsubscribed","do_not_contact","bounced"] as const;` (NOTE: "converted" is deliberately ABSENT — a converted client can still receive reply-driven / approved drafts, D-01.)
    - `export const NURTURE_BLOCK_STATES: readonly TLeadStatus[] = [...SEND_BLOCK_STATES, "converted"] as const;` (auto-nurture / re-engagement must NOT auto-enroll a converted lead, but it stays reply/transcript/send live.)
    - Keep `TERMINAL_STATES` exported as an alias of `NURTURE_BLOCK_STATES` (back-compat for any other importer) but add a doc comment: "Use SEND_BLOCK_STATES for outbound-send gates; NURTURE_BLOCK_STATES for auto-enrollment gates."
    - `export function isSendBlocked(s: TLeadStatus, doNotContact: boolean): boolean { return doNotContact || (SEND_BLOCK_STATES as readonly string[]).includes(s); }` (converted returns FALSE here.)
    - `export function isNurtureBlocked(s: TLeadStatus): boolean { return (NURTURE_BLOCK_STATES as readonly string[]).includes(s); }`
    - Update blocksOutboundEmail to delegate to isSendBlocked (so it no longer blocks converted); keep isTerminalState delegating to NURTURE_BLOCK_STATES.

    Rewire the consumers:
    - apps/web/inngest/functions/sequence-step.ts: change BOTH `(TERMINAL_STATES as readonly string[]).includes(lead.status)` gates that return "terminal_lead" to use `SEND_BLOCK_STATES` (import SEND_BLOCK_STATES instead of TERMINAL_STATES). This makes a converted lead PASS runPreSendSafetyCheck so reply-driven drafts to a converted client send. The do_not_contact / bounced check below stays as-is.
    - apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx: keep gating canStart on the NURTURE-block predicate (import and use isNurtureBlocked, or keep isTerminalState since it now aliases NURTURE_BLOCK_STATES) — a converted lead should NOT show "start a new nurture sequence". (No behavioral regression for this UI.)
    - Re-engagement enrollment gating: ensure it uses isNurtureBlocked / NURTURE_BLOCK_STATES (converted excluded from auto re-engagement). The Gmail reply handler and transcript ingestion paths MUST NOT gate on converted at all — grep them and confirm they only check do_not_contact / unsubscribed / bounced, never converted.
    - Add a brief comment block at the converted branch in downstream.ts pointing to state-machine.ts (SEND_BLOCK_STATES vs NURTURE_BLOCK_STATES) as the canonical guard.
  </action>
  <acceptance_criteria>
    - `packages/shared/src/lib/state-machine.ts` contains `SEND_BLOCK_STATES` and `NURTURE_BLOCK_STATES`
    - converted is NOT in the send-block set: `grep -A2 "SEND_BLOCK_STATES =" packages/shared/src/lib/state-machine.ts | grep -c "converted"` == 0
    - the nurture-block set DOES include converted: `grep -A2 "NURTURE_BLOCK_STATES =" packages/shared/src/lib/state-machine.ts | grep -c "converted"` >= 1
    - sequence-step.ts still hard-blocks the other terminals via the send-block set: `grep -c "SEND_BLOCK_STATES" apps/web/inngest/functions/sequence-step.ts` >= 1 AND `grep -c "TERMINAL_STATES" apps/web/inngest/functions/sequence-step.ts` == 0
    - send-block set still contains lost / unsubscribed / do_not_contact / bounced: `grep -A2 "SEND_BLOCK_STATES =" packages/shared/src/lib/state-machine.ts | grep -Ec "lost|unsubscribed|do_not_contact|bounced"` >= 1
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "SEND_BLOCK_STATES" packages/shared/src/lib/state-machine.ts && test "$(grep -A2 'SEND_BLOCK_STATES =' packages/shared/src/lib/state-machine.ts | grep -c converted)" = "0" && grep -q "NURTURE_BLOCK_STATES" packages/shared/src/lib/state-machine.ts && test "$(grep -A2 'NURTURE_BLOCK_STATES' packages/shared/src/lib/state-machine.ts | grep -c converted)" -ge "1" && test "$(grep -c TERMINAL_STATES apps/web/inngest/functions/sequence-step.ts)" = "0" && echo OK</automated>
  </verify>
  <done>state-machine.ts splits send-block (no converted) from nurture-block (with converted); sequence-step.ts uses the send-block set so reply-driven drafts to converted clients send while lost/unsubscribed/do_not_contact/bounced still hard-block; re-engagement/reply/transcript gating uses the correct predicate.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Vercel Cron → /api/cron/call-outcome-poll → cron/call_outcome_poll | Scheduled trigger that mutates call_outcomes |
| Inngest function → call_outcomes (service role) | State transitions must be idempotent + coach-scoped |
| downstream → leads.status | Converted status write must never set do_not_contact |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-08 | Tampering | poller + monitor double-flip same row | mitigate | Both flips guarded `WHERE status='scheduled' AND prompted_at IS NULL`; idempotent |
| T-07-09 | Elevation | converted lead mistakenly hard-blocked from sending or auto-nurtured | mitigate | state-machine.ts: converted absent from SEND_BLOCK_STATES (sends allowed); present only in NURTURE_BLOCK_STATES (D-01) |
| T-07-10 | DoS | lost Inngest sleepUntil run strands a call forever | mitigate | D-14 resilience poller cron recovers stranded scheduled rows every 15 min |
| T-07-11 | Tampering | cron route invoked by unauthenticated caller | mitigate | /api/cron/call-outcome-poll requires `Bearer ${CRON_SECRET}` (mirrors gmail-poll); 401 otherwise |
| T-07-12 | Info disclosure | lead PII logged in monitor/dispatcher | accept→mitigate | No PII in console.log; IDs only (CALL-016) |
</threat_model>

<verification>
- `pnpm --filter web typecheck` exits 0.
- sequence-call-completed.ts has zero `wait-for-coach-decision` / `call_follow_up`.
- state-machine.ts: converted excluded from SEND_BLOCK_STATES, included in NURTURE_BLOCK_STATES; sequence-step.ts uses SEND_BLOCK_STATES (no TERMINAL_STATES import).
- Monitor + poller registered in inngest route; /api/cron/call-outcome-poll route exists; call-outcome-poll entry in vercel.json.
</verification>

<success_criteria>
- Prompt fires at ends_at+buffer and on the resilience cron via its own cron route (CALL-003, CALL-014).
- Each outcome drives the right downstream; provider no_show already auto-resolves via 07-01 + here fires LEAD_NO_SHOW (CALL-008, CALL-010).
- Converted stays live-not-nurtured across all guards: sends still go out, only auto-enrollment excludes it (CALL-013, D-01).
</success_criteria>

<output>
After completion, create `.planning/phases/07-call-outcomes/07-02-SUMMARY.md`
</output>
</output>
