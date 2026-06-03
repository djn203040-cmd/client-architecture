# Phase 7: Call Outcomes - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning
**Source:** Scope session + locked product decisions (PRD Express equivalent)

<domain>
## Phase Boundary

Close the post-call loop. Today, calendar bookings flow into the system but **no lead is ever auto-created** (webhooks only look up by email; on a miss `lead_id` stays null and no Inngest event fires), and there is **no surface for the coach to say how a call went** — only a half-built `pending_actions` / `wait-for-coach-decision` stub that nothing drives.

Phase 7 delivers a first-class **Call Outcomes** module that:

1. **Monitors every calendar event** across all 7 providers. On a booking it creates the lead if new (or updates the existing one), sets `call_booked`, writes a `call_booked` timeline event, and opens a `call_outcomes` record.
2. **Waits for the call to happen**, then 30 minutes after its scheduled end asks the coach one question — **No Show / Call Completed / Converted** — the only three states a coach picks manually.
3. **Surfaces the prompt in three places**, mirroring the drafts feature: a dedicated `/calls` queue page, inside the lead profile, and as interactive **Slack buttons**.
4. **Drives downstream** on the chosen outcome: status change, timeline event, and the correct Inngest sequence (no-show track / follow-up track / mark-won).

This feature is, structurally, a **second draft-queue**: same queue / Slack / realtime / timeline machinery as drafts, a different payload, and three outcome buttons instead of approve/hold. It supersedes the `pending_actions` (`type='call_follow_up'`) stub.

**Out of scope:** changing the existing sequence cadence logic, the AI draft engine, or the voice model. Phase 7 adds the outcome-capture layer and the calendar→lead auto-create path; it reuses everything downstream.

</domain>

<decisions>
## Implementation Decisions

### Locked product decisions (from scope session — non-negotiable)

- **D-01 (Converted is non-terminal — keep the lead live):** When the coach picks **Converted**, set `leads.status = 'converted'`, cancel the active **intake / follow-up / no-show** sequences, and write a `call_converted` timeline event. **Do NOT** set `do_not_contact`, and **do NOT** treat it like `closed`. The lead must stay fully monitored: the Gmail reply handler keeps catching their inbound mail and transcript ingestion keeps working, so the coach can keep using AI drafts on the now-active client. A quiet **Module 2 ("The Threshold Experience") CTA** is shown on converted leads (reuse the lock CTA copy from CLAUDE.md — not a hard upsell wall). **This requires auditing every terminal-status guard** (e.g. `runPreSendSafetyCheck`, re-engagement enrollment gating) so `converted` is treated as *live, just not auto-nurtured* — never lumped with `closed` / `do_not_contact`.
- **D-02 (Prompt timing — call end + 30 min):** The "How did the call go?" prompt fires 30 minutes after the call's scheduled end time (`calendar_events` / outcome `ends_at` + buffer). The buffer is **configurable per coach** — store it in `coaches.sequence_config` (the existing per-coach config JSONB the no-show/follow-up cadences already live in), defaulting to 30 minutes.
- **D-03 (Provider no-show auto-resolves):** Calendly and Cal.com send their own automatic `no_show` webhooks (already normalized by `lib/calendar/index.ts`). The provider is authoritative: an incoming provider `no_show` **auto-resolves** the `call_outcomes` row to `no_show` (`decided_via = 'provider'`), fires `lead/no_show`, and retires the Slack prompt — the coach is **not** asked. Providers without a no-show webhook (Setmore, MS Bookings, TidyCal, Acuity, Square) rely on the manual prompt.
- **D-04 (No-email bookings get a placeholder lead):** Some providers omit an email. Create the lead anyway using name/phone, dedup by `(coach_id, phone)` when email is absent, and flag it for email enrichment (`leads.external_ids.email_pending = true`). It still gets a `call_outcomes` row and a prompt, so nothing slips.

### Data model

- **D-05 (New `call_outcomes` table — mirrors `drafts`):** New migration `supabase/migrations/20260603000001_call_outcomes.sql`. Columns:
  - `id UUID PK`
  - `coach_id UUID NOT NULL` (FK coaches, ON DELETE CASCADE) — RLS scope
  - `lead_id UUID NOT NULL` (FK leads, ON DELETE CASCADE)
  - `calendar_event_id UUID` (FK calendar_events, nullable) — the booking that spawned it
  - `provider integration_provider NOT NULL`
  - `external_event_id TEXT NOT NULL`
  - `scheduled_at TIMESTAMPTZ` / `ends_at TIMESTAMPTZ` — the call window
  - `status call_outcome_status NOT NULL DEFAULT 'scheduled'`
  - `outcome call_outcome_value` (nullable until resolved)
  - `prompted_at`, `reminder_sent_at`, `decided_at` `TIMESTAMPTZ`
  - `decided_via TEXT` (`'dashboard' | 'slack' | 'lead_profile' | 'provider' | 'auto'`), `decided_by TEXT`
  - `status_locked_at TIMESTAMPTZ` — advisory-lock CAS marker (mirror drafts)
  - `notes TEXT` (optional coach note about the call)
  - `created_at`, `updated_at TIMESTAMPTZ`
  - **Dedup:** `UNIQUE(coach_id, external_event_id)`.
- **D-06 (Two new enums — lifecycle separate from outcome):**
  - `call_outcome_status`: `scheduled | awaiting_outcome | resolved | cancelled` (the call lifecycle)
  - `call_outcome_value`: `no_show | completed | converted` (the chosen outcome, null until `resolved`)
  Keeping lifecycle and outcome on two columns (like drafts separate `status` from terminal state) makes queue filtering clean: Awaiting = `status='awaiting_outcome'`, Upcoming = `status='scheduled'`, History = `status='resolved'`.
- **D-07 (Enum extensions):**
  - Add `call_converted` to the `lead_event_type` enum (timeline). `no_show`, `call_completed`, `call_booked` already exist; `converted` exists only as a `lead_status`, not a timeline event — add the event so it renders with its own icon.
  - Add `call_outcome_pending` to `TNotificationEventType` in `packages/shared/src/types/notifications.ts`.
- **D-08 (RLS + realtime):** `coaches_own_call_outcomes` policy — `FOR ALL TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid())`, FORCE-enabled, matching the single-policy pattern in `20260505000004_rls.sql`. Add `call_outcomes` to the realtime publication (new migration following `20260505000006_realtime.sql`) so the queue updates live like drafts.
- **D-09 (Atomic RPC):** `record_call_outcome_atomic(p_id, p_outcome, p_actor)` — advisory lock via `pg_try_advisory_xact_lock()` + `SELECT FOR UPDATE` + CAS on `status='awaiting_outcome'`, returns `{ ok, reason, new_status }`. Direct structural copy of `approve_draft_atomic` in `20260520000002_advisory_lock_rpc.sql`, living in the `private` schema. A wrapper `lib/call-outcomes/record-atomic.ts` mirrors `lib/drafts/approve-atomic.ts`.
- **D-10 (Shared types):** Add to `packages/shared/src/types/index.ts`: `TCallOutcome = Database["public"]["Tables"]["call_outcomes"]["Row"]`, `TCallOutcomeStatus`, `TCallOutcomeValue`. Regenerate `packages/database` types after the migration is pushed.

### Calendar processing refactor (auto lead creation)

- **D-11 (Centralize the 7 webhook handlers):** Today `app/api/webhooks/calendar/{provider}/route.ts` (×7) each duplicate the lead lookup + dedup + Inngest dispatch. Extract a single shared processor in `apps/web/lib/calendar/`:
  - `upsertLeadFromBooking(event)` — dedup by `(coach_id, email)`; fall back to `(coach_id, phone)` when email absent (D-04); create with `source = <provider>`, `status = 'call_booked'` if new; **never regress** an existing `converted`/`closed`/`do_not_contact` lead's status or contactability on a new booking.
  - `processCalendarEvent(event)` — the one path all 7 handlers call. Insert the `calendar_events` row (existing dedup), then branch on `event.eventType`:
    - `booking_created` → upsert lead, set `call_booked`, write `call_booked` timeline event, insert `call_outcomes` (`scheduled`), fire `LEAD_CALL_BOOKED`.
    - `no_show` (provider) → resolve the matching `call_outcomes` row to `no_show` (D-03), fire `LEAD_NO_SHOW`, retire Slack prompt.
    - `rescheduled` → update `scheduled_at`/`ends_at` on the outcome, re-arm the monitor.
    - `cancelled` → set the outcome `cancelled`, cancel active sequences.
  The 7 handlers become thin: verify signature → normalize → `processCalendarEvent`.
- **D-12 (Fix the no-lead gap):** This is the standing bug. `LEAD_CALL_BOOKED` currently only fires when a lead is found. After D-11, a booking always resolves to a lead, so the event always fires. Existing `cancelOn: LEAD_CALL_BOOKED` consumers (no-show / re-engage / scheduled-send sequences) keep working unchanged.

### Inngest

- **D-13 (`call-outcome-monitor` function):** Trigger on `LEAD_CALL_BOOKED`, `cancelOn` cancelled/rescheduled. `sleepUntil(ends_at + buffer)` (buffer from `coaches.sequence_config`, D-02), then flip the `call_outcomes` row to `awaiting_outcome`, set `prompted_at`, and emit `notification/call_outcome_pending`. Register in `apps/web/app/api/inngest/route.ts`.
- **D-14 (Resilience poller cron):** Per the documented scheduled-send-resilience concern (Inngest `sleepUntil`-only work can strand if a run is lost), add a Vercel cron → Inngest event that finds `call_outcomes` where `status='scheduled' AND ends_at < now() - buffer AND prompted_at IS NULL` and flips them to `awaiting_outcome`. This is the safety net so a lost run never loses a call. Follow the existing Vercel Cron → Inngest pattern from Phase 3.
- **D-15 (Downstream wiring on decision):** Fired from the API/Slack handlers after a successful atomic record:
  - No Show → `LEAD_NO_SHOW` → existing `sequence-no-show.ts` (unchanged).
  - Completed → `LEAD_CALL_COMPLETED` → **simplify** `sequence-call-completed.ts`: drop its internal `pending_actions` insert + `waitForEvent('wait-for-coach-decision')` (that decision is now *this feature*) and enroll directly into the follow-up track. Migrate/retire the `pending_actions` `call_follow_up` usage.
  - Converted → new `LEAD_CONVERTED` event: cancel active sequences, set `status='converted'` (D-01 semantics — not `closed`), write `call_converted` timeline event.
- **D-16 (Notification dispatcher):** Add a `call_outcome_pending` case in `inngest/functions/notification-dispatcher.ts` that fans out to Slack / email / WhatsApp per the coach's `notification_preferences`, exactly like `draft_ready`. Add `call_outcome_pending` to the `notification_preferences` matrix so coaches can toggle the channel.

### API

- **D-17 (`PATCH /api/call-outcomes/[id]`):** Zod body `{ outcome: 'no_show' | 'completed' | 'converted', notes?: string }`. Auth + coach scope, calls `record_call_outcome_atomic`, fires the matching downstream event (D-15), writes the timeline event, calls `syncSlackCallOutcomeMessage`. Returns `{ ok: true, new_status }` or `409 { ok: false, reason }`. Mirrors `app/api/drafts/[id]/route.ts`. Optional `GET /api/call-outcomes` for the queue (primary load is SSR + realtime, like drafts).

### Slack

- **D-18 (Block Kit + interactivity):** Add `buildCallOutcomeBlocks({ leadName, callOutcomeId, callTime })` to `apps/web/lib/slack/blocks.ts` — header "How did the call with {lead} go?", three buttons: `call_outcome_no_show`, `call_outcome_completed` (primary), `call_outcome_converted`, each `value = callOutcomeId`. Extend `app/api/webhooks/slack/interactivity/route.ts` with a `call_outcome_*` branch (signature verification + `team_id → coach` lookup already exist). Add `syncSlackCallOutcomeMessage({ id, coachId, outcome })` mirroring `lib/slack/sync-draft-message.ts` (`chat.update` to retire buttons; reuse `notification_log` to find the message `ts`).

### Frontend

- **D-19 (`/calls` queue page):** New route `apps/web/app/(dashboard)/calls/page.tsx`, heading "How did the call go?". Add a `{ href: "/calls", label: "Calls", Icon: PhoneCall }` item to `ITEMS` in `apps/web/components/shell/SidebarNav.tsx`. SSR-fetch + a `useCallOutcomeRealtime` hook cloned from `components/drafts/draft-realtime.tsx`. Tabs: **Awaiting** / **Upcoming** / **History**. A `CallOutcomeCard` with three large outcome buttons reusing the `ApproveButton` fill animation (`components/ui/approve-button.tsx`) and the glass-card + Framer Motion patterns from `DraftCard.tsx`. Celebration empty state + skeleton, like `CelebrationEmptyState.tsx`.
- **D-20 (Lead-profile panel):** `LeadCallOutcomePanel` rendered in `app/(dashboard)/leads/[id]/page.tsx` alongside `LeadDraftsPanel`, showing any awaiting call with the three buttons, realtime scoped by `leadId`. On a `converted` lead, render the quiet Module 2 CTA (D-01).
- **D-21 (Timeline):** Add `call_converted` icon + tone to `apps/web/components/leads/LeadEventIcon.tsx` and a label in `app/(dashboard)/leads/[id]/activity-timeline.tsx`. `call_booked` / `no_show` / `call_completed` already render. Run `/impeccable audit` on the new `/calls` page + `CallOutcomeCard` before merge.

### Claude's Discretion

- Exact nav label ("Calls" vs "Call Outcomes") and queue heading wording — planner picks; recommendation "Calls".
- Whether `call-outcome-monitor` reads the buffer via a small `lib/call-outcomes/config.ts` helper or inline — planner decides.
- Cron cadence for the resilience poller (every 5 min vs 15 min) — planner picks; recommendation 15 min.
- Whether `LEAD_CONVERTED` is a brand-new Inngest function or handled inline in the API handler (cancel sequences + status update) — planner finalizes; inline is acceptable if it stays idempotent.
- Exact placeholder-lead name format for no-email bookings — planner picks (e.g. derive from provider invitee name; never invent an email).
- Whether the reminder (D following the draft 24h CTA) is in-scope for v1 or deferred — see Deferred.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture decisions (locked)
- `CLAUDE.md` — Module 2 lock CTA copy ("The Threshold Experience — your client's first 48 hours, built from your sales call. [Book a call]") for the converted-lead CTA (D-01); design rules (glass/frosted, warm uplifting, NOT neon green / dark purple / tech-bro); RLS-on-every-table, Zod-on-every-boundary, no-secrets-in-logs.
- `.planning/ROADMAP.md` — Phase 7 entry (goal, 4 sub-plans, exit criteria).
- `.planning/REQUIREMENTS.md` — CALL-001 … CALL-016 (full text); CAL-006/007/008, STATE-002/003/004, STATE-009.

### Schema (deployed — read before adding tables/enums)
- `supabase/migrations/20260505000001_enums.sql` — `lead_status` (has `call_booked`, `no_show`, `call_completed`, `converted`, `closed`), `lead_event_type` (has `call_booked`, `no_show`, `call_completed` — D-07 adds `call_converted`), `integration_provider`, `lead_source`.
- `supabase/migrations/20260505000002_tables.sql` — `leads` (id, coach_id, name, email, phone, source, status, do_not_contact, external_ids JSONB, last_activity_at), `calendar_events` (coach_id, provider, external_event_id, lead_id nullable, event_type, payload), `lead_events` (timeline), `notification_log` (Slack `ts` in `external_id`).
- `supabase/migrations/20260530000002_calendar_events_dedup_event_type.sql` — `UNIQUE(provider, external_event_id, event_type)` dedup (one booking fires both `booking_created` and later `no_show`).
- `supabase/migrations/20260519000003_phase3_automation.sql` — `pending_actions` (`type='call_follow_up'`) — the stub Phase 7 supersedes (D-15).
- `supabase/migrations/20260520000002_advisory_lock_rpc.sql` — `approve_draft_atomic` / `hold_draft_atomic` (template for `record_call_outcome_atomic`, D-09); `private.store_slack_token`.
- `supabase/migrations/20260505000004_rls.sql` — single-policy RLS pattern (template for D-08).
- `supabase/migrations/20260505000006_realtime.sql` — realtime publication (add `call_outcomes`).

### Existing code (reuse and extend)
- `apps/web/lib/calendar/index.ts` — `TCalendarEvent` normalizers for all 7 providers; the home for `processCalendarEvent` + `upsertLeadFromBooking` (D-11).
- `apps/web/app/api/webhooks/calendar/{calendly,cal-com,acuity,setmore,square,ms-bookings,tidycal}/route.ts` — the 7 handlers to route through the shared processor; current no-lead-gap at calendly/route.ts:39-47.
- `packages/shared/src/constants/events.ts` — `LEAD_CALL_BOOKED`, `LEAD_NO_SHOW`, `LEAD_CALL_COMPLETED` (add `LEAD_CONVERTED`).
- `apps/web/inngest/functions/sequence-no-show.ts` — fires on `LEAD_NO_SHOW` (unchanged consumer).
- `apps/web/inngest/functions/sequence-call-completed.ts` — D-15 simplifies this (drop `pending_actions` + `wait-for-coach-decision`).
- `apps/web/inngest/functions/notification-dispatcher.ts` — add `call_outcome_pending` case (D-16).
- `apps/web/app/api/inngest/route.ts` — register `call-outcome-monitor` + cron handler.
- `apps/web/app/api/drafts/[id]/route.ts` — template for `PATCH /api/call-outcomes/[id]` (D-17).
- `apps/web/lib/drafts/approve-atomic.ts` — template for `lib/call-outcomes/record-atomic.ts` (D-09).
- `apps/web/lib/slack/blocks.ts` — add `buildCallOutcomeBlocks` (D-18).
- `apps/web/app/api/webhooks/slack/interactivity/route.ts` — add `call_outcome_*` branch; signature verify via `lib/slack/signature.ts`; coach lookup by `team_id`.
- `apps/web/lib/slack/sync-draft-message.ts` — template for `syncSlackCallOutcomeMessage` (D-18).
- `apps/web/components/drafts/draft-realtime.tsx` — template for `useCallOutcomeRealtime` (D-19).
- `apps/web/components/drafts/DraftCard.tsx`, `components/ui/approve-button.tsx`, `components/drafts/CelebrationEmptyState.tsx` — UI templates for `CallOutcomeCard` + empty/loading states (D-19).
- `apps/web/app/(dashboard)/drafts/page.tsx` + `components/drafts/DraftQueueScaffold.tsx` — SSR + tabs + realtime queue template.
- `apps/web/components/shell/SidebarNav.tsx` — add `/calls` nav item (D-19).
- `apps/web/app/(dashboard)/leads/[id]/page.tsx` + `components/LeadDraftsPanel.tsx` — where `LeadCallOutcomePanel` mounts (D-20).
- `apps/web/components/leads/LeadEventIcon.tsx` + `app/(dashboard)/leads/[id]/activity-timeline.tsx` — add `call_converted` icon + label (D-21).
- `apps/web/lib/safety/` (the `runPreSendSafetyCheck` home) + re-engagement enrollment gating — audit for `converted` handling (D-01).

### Phase decisions that carry forward
- `.planning/phases/03-automation/03-CONTEXT.md` — `runPreSendSafetyCheck`, the Inngest sequence model, Vercel Cron → Inngest pattern (D-14), `LEAD_CALL_BOOKED`/`LEAD_NO_SHOW`/`LEAD_CALL_COMPLETED` semantics.
- `.planning/phases/04-approval-channels/04-CONTEXT.md` — Slack bot-token + Block Kit + interactivity + `chat.update` sync; `notification_preferences` matrix; advisory-lock CAS.
- `.planning/phases/06-testing/06-04-calendar-integrations-PLAN.md` — the 7-provider calendar connect/disconnect surface this builds on.

### External docs (researcher should verify if research runs)
- **Inngest** `sleepUntil` + `cancelOn` semantics and lost-run behavior (justifies the D-14 poller).
- **Vercel Cron** schedule syntax + the existing cron→Inngest bridge.
- **Slack Block Kit** interactive button + `chat.update` retire-buttons pattern (already used for drafts — match it).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The **drafts feature is the full template** for this phase: queue page (SSR + tabs + realtime), `DraftCard`, `useDraftRealtime`, `PATCH /api/drafts/[id]` with atomic RPC, Slack blocks + interactivity + `sync-draft-message`, timeline writes. Phase 7 clones each with `call_outcomes` payloads.
- `lib/calendar/index.ts` already normalizes all 7 providers to `TCalendarEvent` — the refactor adds a processor *above* the normalizers, it does not touch them.
- The `lead_status` enum already has every state Phase 7 needs (`call_booked`, `no_show`, `call_completed`, `converted`); only `lead_event_type` needs `call_converted`.
- The advisory-lock RPC pattern (`approve_draft_atomic`) is copy-ready for `record_call_outcome_atomic`.

### Established Patterns
- **Webhook → normalize → process → Inngest** — Phase 7 inserts a shared `processCalendarEvent` between normalize and Inngest.
- **SSR + Supabase realtime** (not React Query) — the queue and lead-profile panels follow `useDraftRealtime`.
- **Atomic CAS via `private` RPC** — every state transition that can race goes through an advisory-lock RPC.
- **Slack: post Block Kit → store `ts` in `notification_log` → `chat.update` to retire buttons** — match exactly.
- **Vercel Cron → Inngest event** — the resilience poller (D-14) reuses this.

### Integration Points (new files)
- `supabase/migrations/20260603000001_call_outcomes.sql` (table, 2 enums, `call_converted` event, RLS, realtime, `record_call_outcome_atomic` RPC).
- `apps/web/lib/calendar/process-event.ts` + `upsert-lead.ts` (D-11) — or extend `lib/calendar/index.ts`.
- `apps/web/inngest/functions/call-outcome-monitor.ts` + the resilience cron handler (D-13/14).
- `apps/web/lib/call-outcomes/record-atomic.ts`, `apps/web/app/api/call-outcomes/[id]/route.ts` (D-09/17).
- `apps/web/lib/slack/sync-call-outcome-message.ts`; additions to `lib/slack/blocks.ts` + `interactivity/route.ts` (D-18).
- `apps/web/app/(dashboard)/calls/page.tsx`, `components/calls/CallOutcomeCard.tsx`, `CallQueueScaffold.tsx`, `call-outcome-realtime.tsx`, `LeadCallOutcomePanel.tsx` (D-19/20).
- `packages/shared/src/types/index.ts` (+ `notifications.ts`, `constants/events.ts`) — `TCallOutcome*`, `call_outcome_pending`, `LEAD_CONVERTED`.

</code_context>

<specifics>
## Specific Requirements

- **Three outcomes only** — `No Show`, `Call Completed`, `Converted`. No fourth state, no free-form status from the prompt.
- **Prompt copy** — header "How did the call with {lead} go?"; buttons "No show", "Call completed" (primary), "Converted 🎉". Same wording on the dashboard card, the lead-profile panel, and Slack.
- **Buffer default** — 30 minutes after `ends_at`; per-coach override in `coaches.sequence_config.call_outcome_buffer_minutes`.
- **No auto-resolve on timeout** — unlike drafts (which can auto-send in autonomous Mode B), an outcome is ground truth only the coach knows, so an `awaiting_outcome` row **waits indefinitely**; it never auto-decides. (A reminder is optional — see Deferred.)
- **Converted CTA copy** — exactly the CLAUDE.md Module 2 line: "The Threshold Experience — your client's first 48 hours, built from your sales call." with a "Book a call" link.
- **Dedup** — `call_outcomes UNIQUE(coach_id, external_event_id)`; a duplicate booking webhook must not create a second outcome row.
- **Idempotency** — `record_call_outcome_atomic` CAS on `status='awaiting_outcome'`; a late provider `no_show` or a double-click resolves once and no-ops thereafter.
- **Never regress a lead** — a new booking on a `converted`/`closed`/`do_not_contact` lead creates a fresh `call_outcomes` row but does **not** downgrade the lead's status or contactability.
- **Placeholder lead** — no-email booking → `leads.external_ids.email_pending = true`, dedup by phone, never fabricate an email address.
- **Slack action values** — `value = callOutcomeId` (UUID), `action_id ∈ {call_outcome_no_show, call_outcome_completed, call_outcome_converted}` — matches the draft pattern of action_id-carries-intent, value-carries-id.
- **Security** — `call_outcomes` RLS `coach_id = auth.uid()` FORCE; Zod on `PATCH`; Slack signature verified; service-role only server-side; no PII in logs (CALL-016, INFRA-001/005).

</specifics>

<deferred>
## Deferred Ideas

- **24h reminder CTA** (mirroring the draft follow-up cascade) — a nudge if an `awaiting_outcome` sits untouched. Deferred from v1: the prompt waits indefinitely and surfaces in `/calls` Awaiting; add the reminder only if coaches forget to triage. `reminder_sent_at` is in the schema so it's a non-breaking add later.
- **Post-sale onboarding sequence for Converted leads** — Converted only stops nurture in v1; a dedicated client-onboarding track is Module 2/3 territory, not Phase 7.
- **Outcome analytics** (show-rate, conversion-rate per coach in `/admin`) — deferred; the data is captured in `call_outcomes` for a later admin surface.
- **Bulk triage** — selecting multiple awaiting calls and resolving in one action. Deferred; single-card flow ships first.
- **Coach note required on No Show** — capturing why someone didn't show. Deferred; `notes` is optional in v1.
- **Calendar event monitoring beyond bookings** (reschedules surfaced to the coach as events) — v1 handles reschedule silently (re-arms the monitor); surfacing it is deferred.

</deferred>

---

*Phase: 07-call-outcomes*
*Context gathered: 2026-06-03 via scope session + locked decisions*
