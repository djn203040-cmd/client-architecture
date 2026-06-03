---
phase: 07-call-outcomes
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: false   # Task 2 pushes the migration to the live Supabase DB (interactive history repair may be needed)
requirements: [CALL-001, CALL-002, CALL-009, CALL-011, CALL-012, CALL-015, CALL-016]
files_modified:
  - supabase/migrations/20260603000001_call_outcomes.sql
  - supabase/migrations/20260603000002_call_outcomes_realtime.sql
  - packages/database/src/types.ts
  - packages/shared/src/types/index.ts
  - packages/shared/src/types/notifications.ts
  - packages/shared/src/constants/events.ts
  - apps/web/lib/calendar/upsert-lead.ts
  - apps/web/lib/calendar/process-event.ts
  - apps/web/lib/call-outcomes/record-atomic.ts
  - apps/web/app/api/webhooks/calendar/calendly/route.ts
  - apps/web/app/api/webhooks/calendar/cal-com/route.ts
  - apps/web/app/api/webhooks/calendar/acuity/route.ts
  - apps/web/app/api/webhooks/calendar/setmore/route.ts
  - apps/web/app/api/webhooks/calendar/square/route.ts
  - apps/web/app/api/webhooks/calendar/ms-bookings/route.ts
  - apps/web/app/api/webhooks/calendar/tidycal/route.ts

must_haves:
  truths:
    - "A booking on any of the 7 providers creates or updates a lead and a call_outcomes row, with a call_booked timeline event"
    - "A booking with no email creates a placeholder lead deduped by phone, flagged email_pending, and still gets a call_outcomes row"
    - "A new booking on a converted/lost/do_not_contact lead never downgrades that lead's status or contactability"
    - "A duplicate booking webhook does not create a second call_outcomes row (UNIQUE coach_id, external_event_id)"
    - "call_outcomes is RLS-scoped to coach_id (FORCE) and present in the realtime publication"
    - "record_call_outcome_atomic CAS-resolves awaiting_outcome rows once; double calls no-op"
  artifacts:
    - path: "supabase/migrations/20260603000001_call_outcomes.sql"
      provides: "call_outcomes table, 2 enums, call_converted event, RLS, record_call_outcome_atomic RPC"
      contains: "CREATE TYPE call_outcome_status"
    - path: "supabase/migrations/20260603000002_call_outcomes_realtime.sql"
      provides: "call_outcomes added to supabase_realtime publication"
      contains: "ADD TABLE public.call_outcomes"
    - path: "apps/web/lib/calendar/process-event.ts"
      provides: "single processCalendarEvent path all 7 handlers call"
      contains: "export async function processCalendarEvent"
    - path: "apps/web/lib/calendar/upsert-lead.ts"
      provides: "upsertLeadFromBooking with email->phone dedup and never-regress guard"
      contains: "export async function upsertLeadFromBooking"
    - path: "apps/web/lib/call-outcomes/record-atomic.ts"
      provides: "typed wrapper over record_call_outcome_atomic RPC"
      contains: "record_call_outcome_atomic"
  key_links:
    - from: "apps/web/app/api/webhooks/calendar/calendly/route.ts"
      to: "apps/web/lib/calendar/process-event.ts"
      via: "processCalendarEvent(event)"
      pattern: "processCalendarEvent"
    - from: "apps/web/lib/calendar/process-event.ts"
      to: "call_outcomes table"
      via: "insert on booking_created"
      pattern: "from\\(\"call_outcomes\"\\)"
---

<objective>
Lay the data + calendar foundation for the Call Outcomes module. Create the `call_outcomes` table (2 new enums, `call_converted` timeline event, RLS, realtime, atomic resolve RPC), push it to the live Supabase DB and regenerate types, add the shared types/constants, and centralize the 7 duplicated calendar webhook handlers behind one `processCalendarEvent` path that auto-creates leads and opens outcome rows.

Purpose: Every downstream plan (Inngest monitor, API/Slack, frontend) reads `call_outcomes`. This plan also fixes the standing no-lead-gap bug (D-12) so `LEAD_CALL_BOOKED` always fires.
Output: New migrations (pushed), regenerated `packages/database` types, shared types/events, `lib/calendar/{process-event,upsert-lead}.ts`, `lib/call-outcomes/record-atomic.ts`, and 7 thinned webhook handlers.
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
@CLAUDE.md

<interfaces>
<!-- Atomic RPC template (mirror its shape exactly for record_call_outcome_atomic). -->
From supabase/migrations/20260520000002_advisory_lock_rpc.sql:
  private.approve_draft_atomic(p_draft_id UUID, p_actor TEXT)
    RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status draft_status)
    — pg_try_advisory_xact_lock(hashtextextended(id::text,0)) -> SELECT FOR UPDATE
      -> CAS on status -> UPDATE; SECURITY DEFINER, search_path=public,private;
      REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO service_role.
  Public wrapper in 20260520000003_public_rpc_wrappers.sql re-exports it
  ( SELECT ok, reason, new_status FROM private.fn(...) ) — add the same wrapper.

From apps/web/lib/drafts/approve-atomic.ts (wrapper shape to mirror):
  approveDraftAtomic(draftId, actor): adminClient.rpc("approve_draft_atomic", {p_draft_id, p_actor})
    -> rowToResult({ ok, reason, new_status }).

From supabase/migrations/20260505000004_rls.sql (single-policy template):
  ALTER TABLE drafts ENABLE/FORCE ROW LEVEL SECURITY;
  CREATE POLICY "coaches_own_drafts" ON drafts FOR ALL TO authenticated
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

From supabase/migrations/20260505000006_realtime.sql:
  ALTER PUBLICATION supabase_realtime ADD TABLE public.drafts;

From packages/shared/src/constants/events.ts:
  LEAD_NO_SHOW="lead/no_show"; LEAD_CALL_BOOKED="lead/call_booked";
  LEAD_CALL_COMPLETED="lead/call_completed". (Add LEAD_CONVERTED="lead/converted".)

From apps/web/lib/calendar/index.ts — normalizers return TCalendarEvent | null with:
  { provider, externalEventId, leadEmail?, leadName?, leadPhone?, eventType, eventStartAt, eventEndAt, rawPayload }
  eventType ∈ booking_created | no_show | rescheduled | cancelled.

Current no-lead gap (apps/web/app/api/webhooks/calendar/calendly/route.ts:39-71):
  leadId only set when event.leadEmail matches; LEAD_CALL_BOOKED only fires `if (leadId)`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migration — call_outcomes table, enums, event, RLS, atomic RPC; shared types/constants</name>
  <read_first>
    - supabase/migrations/20260520000002_advisory_lock_rpc.sql (private.approve_draft_atomic — copy its CAS shape for record_call_outcome_atomic)
    - supabase/migrations/20260520000003_public_rpc_wrappers.sql (public wrapper pattern)
    - supabase/migrations/20260505000004_rls.sql (single-policy FORCE RLS pattern — lines 54-60 drafts)
    - supabase/migrations/20260505000001_enums.sql (lead_event_type — confirm call_converted absent; integration_provider enum)
    - supabase/migrations/20260505000002_tables.sql (drafts/leads/calendar_events column shapes to mirror)
    - packages/shared/src/types/index.ts (TApproveAtomicResult, draft type pattern via Database["public"]["Tables"])
    - packages/shared/src/types/notifications.ts (TNotificationEventType)
    - packages/shared/src/constants/events.ts (LEAD_* constants)
  </read_first>
  <action>
    Create supabase/migrations/20260603000001_call_outcomes.sql:
    1. `CREATE TYPE call_outcome_status AS ENUM ('scheduled','awaiting_outcome','resolved','cancelled');`
    2. `CREATE TYPE call_outcome_value AS ENUM ('no_show','completed','converted');`
    3. `ALTER TYPE lead_event_type ADD VALUE IF NOT EXISTS 'call_converted';` (put this in its OWN migration-statement section before any function uses it; Postgres requires the enum value committed before use — if the linter/push complains, split the ALTER TYPE into 20260603000000_*.sql ahead of this file).
    4. `CREATE TABLE call_outcomes (` with exactly the D-05 columns: id UUID PK DEFAULT gen_random_uuid(); coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE; lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE; calendar_event_id UUID REFERENCES calendar_events(id); provider integration_provider NOT NULL; external_event_id TEXT NOT NULL; scheduled_at TIMESTAMPTZ; ends_at TIMESTAMPTZ; status call_outcome_status NOT NULL DEFAULT 'scheduled'; outcome call_outcome_value; prompted_at TIMESTAMPTZ; reminder_sent_at TIMESTAMPTZ; decided_at TIMESTAMPTZ; decided_via TEXT; decided_by TEXT; status_locked_at TIMESTAMPTZ; notes TEXT; created_at TIMESTAMPTZ NOT NULL DEFAULT now(); updated_at TIMESTAMPTZ NOT NULL DEFAULT now(); CONSTRAINT call_outcomes_dedup UNIQUE (coach_id, external_event_id).
    5. Indexes: `CREATE INDEX idx_call_outcomes_coach_status ON call_outcomes(coach_id, status);` and `CREATE INDEX idx_call_outcomes_lead ON call_outcomes(lead_id);` and partial `CREATE INDEX idx_call_outcomes_poller ON call_outcomes(ends_at) WHERE status='scheduled' AND prompted_at IS NULL;` (supports D-14 poller).
    6. RLS (mirror drafts): ENABLE + FORCE ROW LEVEL SECURITY; `CREATE POLICY "coaches_own_call_outcomes" ON call_outcomes FOR ALL TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());`
    7. `private.record_call_outcome_atomic(p_id UUID, p_outcome call_outcome_value, p_actor TEXT) RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status call_outcome_status)` — direct copy of approve_draft_atomic: advisory lock via pg_try_advisory_xact_lock(hashtextextended(p_id::text,0)); SELECT status INTO v_current FROM call_outcomes WHERE id=p_id FOR UPDATE; if NULL -> ok=false reason='not_found'; if v_current <> 'awaiting_outcome' -> ok=false reason='not_awaiting:'||v_current; else UPDATE call_outcomes SET status='resolved', outcome=p_outcome, decided_at=now(), decided_via=p_actor, status_locked_at=now() WHERE id=p_id; RETURN ok=true reason='resolved_by:'||p_actor, new_status='resolved'. SECURITY DEFINER, SET search_path=public,private. REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO service_role.
    8. Public wrapper `record_call_outcome_atomic(p_id UUID, p_outcome call_outcome_value, p_actor TEXT)` SELECT-ing from private fn; REVOKE PUBLIC / GRANT service_role (mirror 20260520000003).
    9. Trigger-or-note for updated_at: add `BEFORE UPDATE` touch only if the project already has a shared moddatetime trigger (grep existing migrations); otherwise leave updated_at managed in app writes (match how drafts does it).

    Create supabase/migrations/20260603000002_call_outcomes_realtime.sql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.call_outcomes;` (mirror 20260505000006).

    Shared package edits:
    - packages/shared/src/constants/events.ts: add `export const LEAD_CONVERTED = "lead/converted";`
    - packages/shared/src/types/notifications.ts: add `'call_outcome_pending'` to TNotificationEventType union.
    - packages/shared/src/types/index.ts: add `export type TCallOutcome = Database["public"]["Tables"]["call_outcomes"]["Row"];` plus `export type TCallOutcomeStatus = Database["public"]["Enums"]["call_outcome_status"];` and `export type TCallOutcomeValue = Database["public"]["Enums"]["call_outcome_value"];` (mirror the existing draft type export). These will only type-check after Task 2 regenerates packages/database — that is expected ordering.
  </action>
  <acceptance_criteria>
    - `supabase/migrations/20260603000001_call_outcomes.sql` contains `CREATE TYPE call_outcome_status`
    - `supabase/migrations/20260603000001_call_outcomes.sql` contains `CREATE TYPE call_outcome_value`
    - `supabase/migrations/20260603000001_call_outcomes.sql` contains `CREATE TABLE call_outcomes` and `UNIQUE (coach_id, external_event_id)`
    - `supabase/migrations/20260603000001_call_outcomes.sql` contains `coaches_own_call_outcomes` and `FOR ALL TO authenticated`
    - `supabase/migrations/20260603000001_call_outcomes.sql` contains `record_call_outcome_atomic` and `pg_try_advisory_xact_lock`
    - `grep -c "call_converted" supabase/migrations/20260603000001_call_outcomes.sql` >= 1 (ALTER TYPE lead_event_type)
    - `supabase/migrations/20260603000002_call_outcomes_realtime.sql` contains `ADD TABLE public.call_outcomes`
    - `packages/shared/src/constants/events.ts` contains `LEAD_CONVERTED = "lead/converted"`
    - `grep -v '^//' packages/shared/src/types/notifications.ts | grep -c call_outcome_pending` >= 1
    - `packages/shared/src/types/index.ts` contains `export type TCallOutcome`
  </acceptance_criteria>
  <verify>
    <automated>grep -q "record_call_outcome_atomic" supabase/migrations/20260603000001_call_outcomes.sql && grep -q "ADD TABLE public.call_outcomes" supabase/migrations/20260603000002_call_outcomes_realtime.sql && grep -q 'LEAD_CONVERTED' packages/shared/src/constants/events.ts && echo OK</automated>
  </verify>
  <done>Migration files exist with table+2 enums+event+RLS+atomic RPC+public wrapper+realtime; shared events/notifications/types updated.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: [BLOCKING] Push migration to live Supabase + regenerate database types</name>
  <read_first>
    - .planning/phases/07-call-outcomes/07-CONTEXT.md (D-10 — regenerate packages/database after push)
    - supabase/migrations/20260603000001_call_outcomes.sql (the file written in Task 1)
    - packages/database/src/types.ts (the generated types file to overwrite)
  </read_first>
  <what-built>
    Task 1 wrote two migration files. They are NOT yet applied to the live DB
    (ref ktxgtpvilrydmedvzgft, eu-central-1). Until pushed, packages/database types
    do not include call_outcomes and a type-check would pass against a stale schema —
    a false-positive verification state. This task pushes and regenerates types.
  </what-built>
  <action>
    There is no psql / Supabase CLI on PATH — use `pnpm dlx supabase`. The migration
    history has drifted (project memory): repair BEFORE pushing.
    1. Export the access token: `export SUPABASE_ACCESS_TOKEN=...` (Daniel provides; do not log it).
    2. `pnpm dlx supabase link --project-ref ktxgtpvilrydmedvzgft` if not already linked.
    3. Inspect drift: `pnpm dlx supabase migration list`. For any remote-only / mismatched
       entries, run `pnpm dlx supabase migration repair --status applied <version>`
       (or `--status reverted`) as the list dictates, until local and remote agree on
       everything EXCEPT the two new 20260603* files.
    4. `pnpm dlx supabase db push` — applies 20260603000001 + 20260603000002.
    5. Regenerate types: `pnpm dlx supabase gen types typescript --project-id ktxgtpvilrydmedvzgft --schema public > packages/database/src/types.ts` (match the exact existing gen-types command/flags used in package.json scripts if one exists — grep `gen types`).
    6. `pnpm -w build` (or `pnpm --filter @client/shared build` then `pnpm --filter web typecheck`) to confirm TCallOutcome resolves against the regenerated types.
  </action>
  <acceptance_criteria>
    - `grep -c "call_outcomes" packages/database/src/types.ts` >= 1 (table present in generated types)
    - `grep -c "call_outcome_status" packages/database/src/types.ts` >= 1 (enum present)
    - `pnpm --filter web typecheck` exits 0 (TCallOutcome resolves)
  </acceptance_criteria>
  <verify>
    <automated>grep -q "call_outcomes" packages/database/src/types.ts && grep -q "call_outcome_status" packages/database/src/types.ts && echo PUSHED</automated>
  </verify>
  <resume-signal>Type "pushed" once `db push` succeeded and packages/database/src/types.ts contains call_outcomes, or paste any repair/push error.</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Centralize 7 calendar handlers behind processCalendarEvent + upsertLeadFromBooking; open call_outcomes; record-atomic wrapper</name>
  <read_first>
    - apps/web/app/api/webhooks/calendar/calendly/route.ts (current no-lead gap, lines 39-71 — the duplication to extract)
    - apps/web/lib/calendar/index.ts (TCalendarEvent normalizers — the processor sits ABOVE these, do not modify normalizers)
    - apps/web/lib/drafts/approve-atomic.ts (wrapper shape for lib/call-outcomes/record-atomic.ts)
    - supabase/migrations/20260530000002_calendar_events_dedup_event_type.sql (UNIQUE provider, external_event_id, event_type — one booking fires booking_created then later no_show)
    - apps/web/app/api/webhooks/calendar/cal-com/route.ts (second handler to confirm shared shape before refactoring all 7)
  </read_first>
  <action>
    Create apps/web/lib/calendar/upsert-lead.ts exporting `upsertLeadFromBooking(event: TCalendarEvent): Promise<string>` (returns leadId):
    - Dedup by (coach_id, email) when event.leadEmail present; else dedup by (coach_id, phone) (D-04).
    - If a lead exists: return its id. NEVER write status/do_not_contact on an existing lead whose status ∈ ('converted','lost','do_not_contact') OR do_not_contact=true (D-11 never-regress). For a benign existing lead you may refresh name/phone but MUST NOT downgrade status.
    - If no lead: insert with coach_id, name = event.leadName ?? placeholder (derive from invitee name; if none, `"Lead — "+provider+" booking"`; NEVER fabricate an email), email = event.leadEmail ?? null, phone = event.leadPhone ?? null, source = event.provider, status = 'call_booked'. When email absent set external_ids = { email_pending: true } (D-04). Return new id. Use adminClient (service role, server-only).

    Create apps/web/lib/calendar/process-event.ts exporting `processCalendarEvent(event: TCalendarEvent): Promise<void>`:
    - Insert the calendar_events row first (existing dedup: select by (provider, external_event_id, event_type); if exists, return early). Capture the inserted calendar_events.id.
    - branch on event.eventType:
      * booking_created: leadId = await upsertLeadFromBooking(event); UPDATE calendar_events.lead_id; INSERT lead_events { coach_id, lead_id, type:'call_booked', metadata } (timeline); INSERT call_outcomes { coach_id, lead_id, calendar_event_id, provider, external_event_id, scheduled_at: event.eventStartAt, ends_at: event.eventEndAt, status:'scheduled' } ON CONFLICT (coach_id, external_event_id) DO NOTHING; then `inngest.send({ id: <provider>-<externalEventId>, name: LEAD_CALL_BOOKED, data: { coachId, leadId, provider, externalEventId, eventStartAt, eventEndAt, callOutcomeId } })`. Because the lead now ALWAYS resolves, LEAD_CALL_BOOKED ALWAYS fires (D-12 fix).
      * no_show: find the matching call_outcomes row by (coach_id, external_event_id); if status='awaiting_outcome' OR 'scheduled', call record_call_outcome_atomic(id,'no_show','provider') via the wrapper; on ok fire LEAD_NO_SHOW (data incl leadId); leave Slack retirement to 07-03's sync (emit nothing extra here). (D-03 provider-authoritative auto-resolve.)
      * rescheduled: UPDATE call_outcomes SET scheduled_at=event.eventStartAt, ends_at=event.eventEndAt WHERE (coach_id, external_event_id); re-arm handled by 07-02's cancelOn/re-fire — emit LEAD_CALL_BOOKED-equivalent re-arm per 07-02 contract (note: monitor cancelOn rescheduled, then re-send). For THIS plan just update the window + emit `calendar/rescheduled` event with callOutcomeId.
      * cancelled: UPDATE call_outcomes SET status='cancelled' WHERE (coach_id, external_event_id); emit `calendar/cancelled` with callOutcomeId (07-02 cancels sequences).

    Create apps/web/lib/call-outcomes/record-atomic.ts: `recordCallOutcomeAtomic(id: string, outcome: TCallOutcomeValue, actor: string)` — direct mirror of approveDraftAtomic: adminClient.rpc("record_call_outcome_atomic", { p_id: id, p_outcome: outcome, p_actor: actor }); rowToResult({ ok, reason, new_status }); return { ok, reason, new_status }.

    Thin all 7 handlers (calendly, cal-com, acuity, setmore, square, ms-bookings, tidycal): keep signature verify + coach-exists check + normalize, then replace the inline dedup/lookup/insert/inngest block with a single `await processCalendarEvent(event);` and `return new Response("OK", { status: 200 });`. Remove now-dead imports (LEAD_NO_SHOW/LEAD_CALL_BOOKED) from the handlers.
  </action>
  <acceptance_criteria>
    - `apps/web/lib/calendar/process-event.ts` contains `export async function processCalendarEvent`
    - `apps/web/lib/calendar/process-event.ts` contains `from("call_outcomes")` and `LEAD_CALL_BOOKED`
    - `apps/web/lib/calendar/upsert-lead.ts` contains `export async function upsertLeadFromBooking` and `email_pending`
    - `apps/web/lib/calendar/upsert-lead.ts` contains a guard string matching `converted` (never-regress)
    - `apps/web/lib/call-outcomes/record-atomic.ts` contains `record_call_outcome_atomic`
    - Each of the 7 handler files contains `processCalendarEvent`: `grep -l processCalendarEvent apps/web/app/api/webhooks/calendar/*/route.ts | wc -l` == 7
    - No handler still contains the bare `if (inngestEventName && leadId)` gap pattern: `grep -rL "inngestEventName && leadId" apps/web/app/api/webhooks/calendar/*/route.ts | wc -l` == 7
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>test "$(grep -l processCalendarEvent apps/web/app/api/webhooks/calendar/*/route.ts | wc -l | tr -d ' ')" = "7" && grep -q "email_pending" apps/web/lib/calendar/upsert-lead.ts && grep -q "record_call_outcome_atomic" apps/web/lib/call-outcomes/record-atomic.ts && echo OK</automated>
  </verify>
  <done>All 7 handlers route through processCalendarEvent; bookings always create a lead + call_outcomes row + call_booked timeline; provider no_show auto-resolves; record-atomic wrapper exists.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| provider webhook → calendar handler | Untrusted POST from each of 7 calendar providers crosses here |
| handler → processCalendarEvent (service role) | Service-role DB writes; must stay coach-scoped |
| any authenticated coach → call_outcomes (RLS) | Cross-tenant read/write isolation enforced by RLS |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-01 | Spoofing | provider webhook POST | mitigate | Existing per-provider signature verify (verifyCalendlySignature etc.) runs BEFORE processCalendarEvent — refactor preserves it; coach-exists check stays |
| T-07-02 | Tampering | cross-tenant call_outcomes read/write | mitigate | RLS `coach_id = auth.uid()` FORCE on call_outcomes; service-role writes always set coach_id from the verified webhook coachId |
| T-07-03 | Elevation | record_call_outcome_atomic exposed to PUBLIC | mitigate | REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO service_role only (mirror approve_draft_atomic) |
| T-07-04 | Tampering | duplicate / late provider booking webhook | mitigate | calendar_events UNIQUE(provider,external_event_id,event_type) early-return + call_outcomes UNIQUE(coach_id,external_event_id) ON CONFLICT DO NOTHING |
| T-07-05 | Tampering | new booking downgrades a converted/lost lead | mitigate | upsertLeadFromBooking never-regress guard: never write status/do_not_contact on existing terminal/DNC leads |
| T-07-06 | Info disclosure | PII (lead name/email) in logs | accept→mitigate | No console.log of event payload / lead PII in processor (CLAUDE.md no-secrets rule; CALL-016) |
| T-07-07 | Repudiation | who/what resolved an outcome | mitigate | decided_via/decided_by + status_locked_at recorded by the RPC |
</threat_model>

<verification>
- `pnpm --filter web typecheck` exits 0 after Task 2 push + Task 3.
- Migration applied: `packages/database/src/types.ts` contains `call_outcomes` + `call_outcome_status`.
- All 7 handlers call `processCalendarEvent`; none retain the `inngestEventName && leadId` gap.
- A tsx read script (optional) confirms a manual booking insert produces one lead + one call_outcomes row.
</verification>

<success_criteria>
- call_outcomes table live in Supabase with RLS (FORCE) + realtime + atomic RPC.
- Shared TCallOutcome*, LEAD_CONVERTED, call_outcome_pending exported and type-checking.
- 7 webhook handlers thinned to verify→normalize→processCalendarEvent; no-lead gap closed (CALL-001/002/011/012/015/016, CALL-009 RPC).
</success_criteria>

<output>
After completion, create `.planning/phases/07-call-outcomes/07-01-SUMMARY.md`
</output>
