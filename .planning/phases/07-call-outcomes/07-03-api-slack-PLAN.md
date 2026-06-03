---
phase: 07-call-outcomes
plan: 03
type: execute
wave: 2
depends_on: ["07-01"]
autonomous: true
requirements: [CALL-006, CALL-007, CALL-009]
files_modified:
  - apps/web/app/api/call-outcomes/[id]/route.ts
  - apps/web/lib/slack/blocks.ts
  - apps/web/lib/slack/sync-call-outcome-message.ts
  - apps/web/app/api/webhooks/slack/interactivity/route.ts

must_haves:
  truths:
    - "PATCH /api/call-outcomes/[id] validates {outcome, notes?} with Zod, enforces coach ownership, resolves via record_call_outcome_atomic, fires the matching downstream, writes the timeline event, and syncs Slack"
    - "A coach cannot resolve another coach's call outcome (403, no IDOR)"
    - "A duplicate or late resolve returns 409 with a reason and does not double-fire downstream"
    - "Slack shows three outcome buttons; a click resolves the outcome and retires the buttons via chat.update; resolving elsewhere also retires them"
  artifacts:
    - path: "apps/web/app/api/call-outcomes/[id]/route.ts"
      provides: "PATCH endpoint: Zod, ownership, atomic resolve, downstream, timeline, Slack sync"
      contains: "record_call_outcome_atomic"
    - path: "apps/web/lib/slack/blocks.ts"
      provides: "buildCallOutcomeBlocks with 3 action_ids"
      contains: "call_outcome_completed"
    - path: "apps/web/lib/slack/sync-call-outcome-message.ts"
      provides: "syncSlackCallOutcomeMessage chat.update retire"
      contains: "chat.update"
  key_links:
    - from: "apps/web/app/api/call-outcomes/[id]/route.ts"
      to: "record_call_outcome_atomic"
      via: "recordCallOutcomeAtomic wrapper"
      pattern: "recordCallOutcomeAtomic"
    - from: "apps/web/app/api/webhooks/slack/interactivity/route.ts"
      to: "record_call_outcome_atomic"
      via: "call_outcome_* action branch"
      pattern: "call_outcome_"
---

<objective>
Build the decision surfaces for Call Outcomes outside the dashboard: the `PATCH /api/call-outcomes/[id]` endpoint (the single resolve path used by every UI), the Slack Block Kit prompt + interactivity branch, and the `chat.update` sync that retires Slack buttons when an outcome is chosen on any surface.

Purpose: Lets a coach resolve a call from Slack or via the dashboard/lead-profile (which both POST to this API), atomically and idempotently, with Slack kept in sync.
Output: `app/api/call-outcomes/[id]/route.ts`, `buildCallOutcomeBlocks` in slack/blocks.ts, `lib/slack/sync-call-outcome-message.ts`, and the `call_outcome_*` branch in slack interactivity.
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
From 07-01: recordCallOutcomeAtomic(id, outcome, actor) in apps/web/lib/call-outcomes/record-atomic.ts
  -> { ok, reason, new_status }; outcome ∈ 'no_show'|'completed'|'converted'.
  call_outcomes row has coach_id, lead_id, status, outcome, notes.
From 07-02 (sibling wave-2; may land before/after): fireCallOutcomeDownstream({outcome,coachId,leadId,callOutcomeId})
  in apps/web/lib/call-outcomes/downstream.ts. If not yet present when this lands,
  import it and let typecheck drive ordering; do NOT inline-duplicate the downstream logic.

From apps/web/app/api/drafts/[id]/route.ts (the exact template):
  PATCH: createClient() -> auth.getUser() (401 if none) -> Zod safeParse (400) ->
  adminClient.from("drafts").select(coach_id,...).eq("id",id).maybeSingle() ->
  404 if missing, 403 if draft.coach_id !== user.id ->
  approveDraftAtomic(id,"dashboard") -> 409 {ok:false,reason} if !ok ->
  inngest.send(...) -> syncSlackDraftMessage(...) -> 200 {ok:true,new_status}.

From apps/web/lib/slack/blocks.ts: buildDraftReadyBlocks returns Block Kit array;
  buttons carry { value: draftId, action_id: "draft_approve"|"draft_edit"|"draft_hold" }.
From apps/web/app/api/webhooks/slack/interactivity/route.ts:
  verifySlackSignature({...}) already runs; findCoachIdByTeam(payload.user.team_id);
  branches keyed on action.action_id === "draft_approve" etc.; action.value carries the id.
From apps/web/lib/slack/sync-draft-message.ts: reads notification_log.external_id (the ts)
  for the message, then chat.update to retire buttons.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: PATCH /api/call-outcomes/[id] — Zod, ownership, atomic resolve, downstream, timeline, Slack sync</name>
  <read_first>
    - apps/web/app/api/drafts/[id]/route.ts (the exact structural template — mirror auth/Zod/ownership/atomic/409/Slack-sync flow)
    - apps/web/lib/call-outcomes/record-atomic.ts (recordCallOutcomeAtomic wrapper from 07-01)
    - apps/web/lib/call-outcomes/downstream.ts (fireCallOutcomeDownstream from 07-02 — import, do not duplicate)
    - apps/web/lib/supabase/server.ts + apps/web/lib/supabase/admin.ts (createClient vs adminClient usage)
  </read_first>
  <action>
    Create apps/web/app/api/call-outcomes/[id]/route.ts (server-only, dynamic="force-dynamic"):
    - `const BodySchema = z.object({ outcome: z.enum(["no_show","completed","converted"]), notes: z.string().max(2000).optional() });`
    - PATCH(request, { params }): const { id } = await params.
    - supabase = await createClient(); user = (await supabase.auth.getUser()).data.user; 401 if !user.
    - parsed = BodySchema.safeParse(await request.json().catch(()=>null)); 400 with issues if !success.
    - Fetch the row with adminClient: `.from("call_outcomes").select("id, coach_id, lead_id, status").eq("id", id).maybeSingle()`. 404 if missing. **403 if row.coach_id !== user.id** (ownership / no IDOR — CALL-009 security).
    - If parsed.data.notes provided: adminClient.from("call_outcomes").update({ notes }).eq("id", id).
    - result = await recordCallOutcomeAtomic(id, parsed.data.outcome, "dashboard"). If !result.ok return 409 { ok:false, reason: result.reason }.
    - On ok: write timeline event — map outcome→lead_event_type: no_show→'no_show', completed→'call_completed', converted→'call_converted'; INSERT lead_events { coach_id, lead_id, type }.
    - await fireCallOutcomeDownstream({ outcome: parsed.data.outcome, coachId: row.coach_id, leadId: row.lead_id, callOutcomeId: id }).
    - await syncSlackCallOutcomeMessage({ id, coachId: row.coach_id, outcome: parsed.data.outcome }) (Task 3).
    - return NextResponse.json({ ok: true, new_status: result.new_status }).
    - Optional: GET handler returning the coach's awaiting/upcoming rows (RLS-scoped) — primary load is SSR, so GET is optional; if added, scope by user.id only.
    - No PII (lead name/email) in any log line.
  </action>
  <acceptance_criteria>
    - `apps/web/app/api/call-outcomes/[id]/route.ts` contains `record_call_outcome_atomic` OR `recordCallOutcomeAtomic`
    - file contains `z.enum(["no_show","completed","converted"])`
    - file contains a 403 ownership check: `grep -c "403" apps/web/app/api/call-outcomes/[id]/route.ts` >= 1 and contains `coach_id !== user.id`
    - file contains `409` and `result.ok`
    - file contains `call_converted` (timeline mapping)
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -Eq "record_call_outcome_atomic|recordCallOutcomeAtomic" "apps/web/app/api/call-outcomes/[id]/route.ts" && grep -q '409' "apps/web/app/api/call-outcomes/[id]/route.ts" && grep -q "coach_id !== user.id" "apps/web/app/api/call-outcomes/[id]/route.ts" && echo OK</automated>
  </verify>
  <done>PATCH endpoint resolves atomically with ownership + Zod, fires downstream, writes timeline, syncs Slack; 409 on non-awaiting, 403 on foreign row.</done>
</task>

<task type="auto">
  <name>Task 2: buildCallOutcomeBlocks Block Kit (3 buttons)</name>
  <read_first>
    - apps/web/lib/slack/blocks.ts (buildDraftReadyBlocks — mirror its header + actions structure; value=id, action_id=intent)
    - .planning/phases/07-call-outcomes/07-CONTEXT.md (D-18 + Specific Requirements — exact button copy)
  </read_first>
  <action>
    Add to apps/web/lib/slack/blocks.ts:
    - `export function buildCallOutcomeBlocks(args: { leadName: string; callOutcomeId: string; callTime: string }): unknown[]` — header section text "How did the call with {leadName} go?" (+ a context line with callTime), then an `actions` block with three buttons, each `value: args.callOutcomeId`:
      * { text: "No show", action_id: "call_outcome_no_show" }
      * { text: "Call completed", style: "primary", action_id: "call_outcome_completed" }
      * { text: "Converted 🎉", action_id: "call_outcome_converted" }
    - Add a `export function buildCallOutcomeResolvedBlocks(outcome: 'no_show'|'completed'|'converted'): unknown[]` (no buttons) for the chat.update retire state, e.g. "✅ Recorded: {label}" (mirror buildApprovedBlocks/buildHeldBlocks).
  </action>
  <acceptance_criteria>
    - `apps/web/lib/slack/blocks.ts` contains `buildCallOutcomeBlocks`
    - file contains all three action_ids: `call_outcome_no_show`, `call_outcome_completed`, `call_outcome_converted`
    - file contains `buildCallOutcomeResolvedBlocks`
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "buildCallOutcomeBlocks" apps/web/lib/slack/blocks.ts && grep -q "call_outcome_no_show" apps/web/lib/slack/blocks.ts && grep -q "call_outcome_completed" apps/web/lib/slack/blocks.ts && grep -q "call_outcome_converted" apps/web/lib/slack/blocks.ts && echo OK</automated>
  </verify>
  <done>Block Kit builder emits the 3-button prompt + a buttonless resolved state, matching draft block conventions.</done>
</task>

<task type="auto">
  <name>Task 3: Slack interactivity call_outcome_* branch + syncSlackCallOutcomeMessage</name>
  <read_first>
    - apps/web/app/api/webhooks/slack/interactivity/route.ts (verifySlackSignature + findCoachIdByTeam + draft_approve branch — clone for call_outcome_*)
    - apps/web/lib/slack/sync-draft-message.ts (notification_log.external_id ts lookup + chat.update — template for sync-call-outcome-message.ts)
    - apps/web/lib/call-outcomes/record-atomic.ts (recordCallOutcomeAtomic)
    - apps/web/lib/call-outcomes/downstream.ts (fireCallOutcomeDownstream)
  </read_first>
  <action>
    Create apps/web/lib/slack/sync-call-outcome-message.ts: `syncSlackCallOutcomeMessage({ id, coachId, outcome })` — mirror syncSlackDraftMessage: look up notification_log.external_id (the Slack ts) for the call_outcome_pending message for this id; if none, return (never notified). Resolve the Slack bot token, then `chat.update` the message channel+ts with buildCallOutcomeResolvedBlocks(outcome) to retire the buttons. Swallow errors (stale button tolerated), no PII in logs.

    Extend apps/web/app/api/webhooks/slack/interactivity/route.ts with a branch:
    - After the existing signature verify + findCoachIdByTeam, when `action.action_id.startsWith("call_outcome_")`:
      * map action_id → outcome: call_outcome_no_show→'no_show', call_outcome_completed→'completed', call_outcome_converted→'converted'.
      * callOutcomeId = action.value.
      * **Verify ownership**: load call_outcomes row by id via adminClient; confirm row.coach_id === the coach resolved from team_id (no cross-team spoof). If mismatch, 200 ack with no action (do not resolve).
      * result = recordCallOutcomeAtomic(callOutcomeId, outcome, "slack"). On ok: write the timeline lead_event (same mapping as the API), fireCallOutcomeDownstream({...}), then syncSlackCallOutcomeMessage to retire buttons. On !ok (already resolved): still chat.update to retire (idempotent UX).
      * Respond 200 quickly (Slack 3s rule).
  </action>
  <acceptance_criteria>
    - `apps/web/lib/slack/sync-call-outcome-message.ts` contains `chat.update` and `notification_log`
    - `apps/web/app/api/webhooks/slack/interactivity/route.ts` contains `call_outcome_` and `recordCallOutcomeAtomic`
    - interactivity branch verifies coach/team ownership: `grep -c "coach_id" apps/web/app/api/webhooks/slack/interactivity/route.ts` >= 1
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "chat.update" apps/web/lib/slack/sync-call-outcome-message.ts && grep -q "call_outcome_" apps/web/app/api/webhooks/slack/interactivity/route.ts && grep -q "recordCallOutcomeAtomic" apps/web/app/api/webhooks/slack/interactivity/route.ts && echo OK</automated>
  </verify>
  <done>Slack button click resolves the outcome (signature-verified, ownership-checked, atomic) and retires buttons; cross-surface resolution also retires via sync.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| coach browser → PATCH /api/call-outcomes/[id] | Authenticated but must enforce ownership (no IDOR) |
| Slack → /api/webhooks/slack/interactivity | Untrusted POST; signature + team→coach mapping required |
| handlers → record_call_outcome_atomic (service role) | Atomic CAS prevents double-resolve / races |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-13 | Elevation/IDOR | PATCH resolves another coach's outcome | mitigate | 403 when row.coach_id !== user.id; row fetched before any mutation |
| T-07-14 | Spoofing | forged Slack interactivity POST | mitigate | verifySlackSignature (existing) runs first; reject on invalid |
| T-07-15 | Elevation | Slack click resolves an outcome from a foreign team | mitigate | findCoachIdByTeam(team_id) + verify row.coach_id === that coach before resolve |
| T-07-16 | Tampering | double-click / late provider no_show double-resolves | mitigate | record_call_outcome_atomic CAS on status='awaiting_outcome'; second call no-ops (409) |
| T-07-17 | Tampering | unvalidated outcome/notes body | mitigate | Zod z.enum outcome + notes max length at the boundary |
| T-07-18 | Info disclosure | lead PII in API/Slack logs | accept→mitigate | IDs only in logs; no lead name/email (CALL-016) |
</threat_model>

<verification>
- `pnpm --filter web typecheck` exits 0.
- PATCH route: Zod enum + 403 ownership + 409 + atomic + timeline + Slack sync present.
- Slack: 3 action_ids in blocks; interactivity branch verifies ownership + resolves atomically; sync uses chat.update.
</verification>

<success_criteria>
- A coach resolves a call from Slack or dashboard via one atomic, idempotent, ownership-checked path; Slack buttons retire on any surface (CALL-006, CALL-007, CALL-009).
</success_criteria>

<output>
After completion, create `.planning/phases/07-call-outcomes/07-03-SUMMARY.md`
</output>
