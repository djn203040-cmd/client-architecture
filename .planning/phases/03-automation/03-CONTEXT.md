# Phase 3: Automation - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the full automation layer: calendar webhooks for all 7 providers (with per-provider no-show detection), Inngest sequence engine with a complete state machine (no-show and call-completed tracks, per-coach configurable cadence, cancelOn safety), Gmail Pub/Sub monitoring for reply detection and sequence pausing, reply handling with AI draft generation, compliance layer (unsubscribe link + hard bounce enforcement), and Gmail lead intake monitoring. Phase 3 wires everything built in Phases 1–2 into a working end-to-end sequence for the first time.

</domain>

<decisions>
## Implementation Decisions

### Sequence Cadence and Tracks

- **D-01:** No-show track — 5 touchpoints at Day 1, 3, 7, 14, 21 from the sequence start.
- **D-02:** Call-completed track — 3 touchpoints at Day 1, 4, 10 from sequence start.
- **D-03:** Terminal state — when all touchpoints are exhausted with no lead reply, auto-close the lead (`lead.status → closed`, `sequence.status → completed`). No coach notification needed.
- **D-04:** Cadence is per-coach and configurable. Stored as `sequence_config JSONB` on the `coaches` table. UI lives at `Settings → Sequence Settings` (new tab in the existing settings page). Default values are the cadences above.
- **D-05:** Schema migration required: add `sequence_config JSONB DEFAULT '{"no_show_delays":[1,3,7,14,21],"call_completed_delays":[1,4,10]}' ` to the `coaches` table. No other new tables needed for sequence config.
- **D-06:** Enrollment trigger — calendar webhook fires automatically for supported providers. Manual trigger (the already-scaffolded "Start Intake Sequence" button in `SequenceStatusPanel`) also works for all providers and for the call-completed track.
- **D-07:** Re-enrollment — a new calendar event for a lead who already had a sequence creates a fresh sequence. Concurrency key on `coach_id + lead_id` prevents two active sequences running simultaneously. Previous sequence is marked completed/cancelled.

### Calendar Provider Strategy

- **D-08:** No-show webhook auto-triggering — supported for providers with native no-show webhooks (Calendly, Cal.com, Acuity confirmed). For Setmore, MS Bookings, and TidyCal: research during Phase 3 implementation determines if no-show webhooks exist. If not, fallback is manual trigger only via the lead profile button.
- **D-09:** Call-completed track — ALWAYS manual. Calendar events (booking-completed or attendee-present signals) are never used to auto-enroll in the call-completed sequence. Instead:
  - When a booked call time passes, fire an Inngest job (using `step.sleepUntil` scheduled 30 minutes after the event end time).
  - That job creates a "Pending Actions" card on the dashboard: `"[Lead name] — How did the call go?"`
  - Card options: **Closed** (sets `lead.status → converted`, dismisses card) / **Start follow-up** (enrolls lead in call-completed sequence, dismisses card) / **Rescheduled** (dismisses card; new booking fires a fresh card).
  - Card is persistent — never auto-dismisses. No auto-enrollment on ignore.
- **D-10:** Pending Actions section — new dashboard section rendered above the `DraftQueueScaffold`. Appears only when there are pending items. Both call follow-up cards and lead intake prompt cards live here.
- **D-11:** Provider capability disclosure — tooltip on hover over the connected provider icon in `IntegrationHealthCard` (e.g., "Auto: no-show detected automatically" vs "Manual: click Start Sequence after a no-show"). Onboarding wizard explains this thoroughly during provider connection.

### Gmail Monitoring and Reply Handling

- **D-12:** Gmail Pub/Sub from day one. One shared Google Cloud Pub/Sub topic for the entire system. Webhook receives push notifications and routes to the correct coach by email address. Watch renewed every 6 days via Vercel Cron → Inngest `gmail/watch_renew` event (already defined in `events.ts`).
- **D-13:** Polling fallback — when Pub/Sub watch is unavailable (expired, failed, dev environment): poll each coach's Gmail history every 5 minutes via a Vercel Cron → Inngest job. At 5–10 coaches, this is well within Gmail API quotas.
- **D-14:** Reply detection scope — only monitor replies to emails sent by our system. Track `Message-ID` of every outbound email. Replies are detected by matching the `In-Reply-To` header.
- **D-15:** Sequence pause SLA — within 60 seconds of Gmail detecting the lead's reply (matches ROADMAP.md exit criteria). Pub/Sub push notification achieves this reliably; polling fallback cannot guarantee 60s but prevents sends at the next poll cycle.
- **D-16:** When a lead reply is detected:
  1. `lead.status → replied`, `sequence.status → paused`.
  2. Cancel all pending Inngest steps via the sequence's `inngest_run_id` (Inngest cancelOn event).
  3. Fire an AI draft generation request (reply draft, using the `replied` state prompt from Phase 2 D-14 state framing table).
  4. Reply draft surfaces in `DraftQueueScaffold` — same tab as regular sequence drafts. No separate tab.
- **D-17:** Post-reply sequence behavior — sequence ends permanently when a lead replies. No auto-resume. Coach can manually re-enroll via the lead profile button if they want to send more messages after their reply conversation.
- **D-18:** If a lead is already `in_sequence` and emails the coach — treated as a reply. Existing reply-handling flow (D-16) kicks in. No separate "intake monitoring" card is generated.
- **D-19:** Unsubscribe mid-sequence — when lead clicks the unsubscribe link: `lead.status → unsubscribed`, `sequence.status → cancelled`, all pending drafts → `cancelled`. Handled via Inngest `cancelOn` event. CAN-SPAM compliant.
- **D-20:** Hard bounce — when a Gmail send fails permanently: `lead.bounced = true`, sequence cancelled, coach notified (via available channels).

### Lead Intake Monitoring

- **D-21:** Trigger signal — new inbound email to the coach's Gmail from an email address that exists in the `leads` table (exact email address match). No NLP or keyword detection. Gmail monitoring (Pub/Sub or polling) powers this detection.
- **D-22:** When a known lead emails the coach and is NOT in an active sequence — surface a "Pending Actions" card: `"[Lead name] emailed you — start their intake sequence?"` with Yes (enroll) / Dismiss.
- **D-23:** No lead state change is made just from receiving an inbound email. Coach action determines the outcome.

### Inngest Function Organization

- **D-24:** All Inngest functions live in `apps/web/inngest/functions/`. One file per event type (not one monolithic file). Functions are registered in `apps/web/app/api/inngest/route.ts` serve() call. Suggested files:
  - `sequence-no-show.ts` — handles `lead/no_show` event, starts 5-touchpoint track
  - `sequence-call-completed.ts` — handles call follow-up card creation and `lead/call_completed` enrollment
  - `sequence-step.ts` — fires each touchpoint (generates draft, schedules next step)
  - `gmail-watch.ts` — handles `gmail/watch_renew` event and watch setup
  - `gmail-monitor.ts` — polling fallback job
  - `reply-handler.ts` — handles `lead/replied` event

### Pre-Send Safety Check

- **D-25:** The safety check runs inside each Inngest sequence step immediately before generating/sending a draft. It blocks on:
  1. Terminal lead states: `unsubscribed`, `do_not_contact`, `bounced`, `converted`, `closed`.
  2. Sequence status is not `active` (cancelled, paused, held, completed) — check against the database, not just Inngest in-memory state.
  If blocked: cancel the sequence, log the reason, no email sent.

### Claude's Discretion
- Which of Setmore, MS Bookings, TidyCal support no-show webhooks — researcher verifies during Phase 3 planning; fallback behavior is locked (D-08).
- XML structure and exact schema of the `step.sleepUntil` timing calculations.
- Idempotency handling for duplicate calendar webhooks — the `calendar_events` UNIQUE constraint (provider + external_event_id) already handles this at the DB level; the Inngest function should catch the constraint violation and exit gracefully.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture decisions (locked)
- `CLAUDE.md` — Architecture table: Inngest (not n8n), Gmail API sends AS coach, Vercel Cron → Inngest events for cron triggers, Upstash Redis for rate limiting, TypeScript strict, no `any`
- `.planning/ROADMAP.md` — Phase 3 plans list, requirements covered (STATE, AI-008/009, SEQ-001–015, COMPLY-001–008, HEALTH-005/006, GMAIL-004–008, CAL-001–009, LEAD-006/007), exit criteria

### Schema (deployed — check before adding columns)
- `supabase/migrations/20260505000002_tables.sql` — `sequences` table (inngest_run_id, track, scheduled_steps JSONB), `calendar_events` table (UNIQUE deduplication), `leads` table (bounced, do_not_contact columns)
- `supabase/migrations/20260505000001_enums.sql` — `lead_status` enum (all 11 values including `unsubscribed`, `bounced`, `do_not_contact`), `sequence_status` enum, `integration_provider` enum (all 7 calendar providers)
- Phase 3 requires a new migration: add `sequence_config JSONB` to `coaches` table

### Existing code (reuse and extend)
- `apps/web/inngest/client.ts` — Inngest singleton (`id: "client-architecture"`); `maxDuration = 300` already set in route
- `apps/web/app/api/inngest/route.ts` — serve() endpoint; Phase 3 registers all new functions here (currently empty array)
- `packages/shared/src/constants/events.ts` — all event constants already defined: `LEAD_NO_SHOW`, `LEAD_CALL_COMPLETED`, `LEAD_REPLIED`, `LEAD_BOUNCED`, `LEAD_UNSUBSCRIBED`, `GMAIL_WATCH_RENEW`, etc.
- `apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx` — "Start Intake Sequence" button scaffold; Phase 3 wires it to Inngest
- `apps/web/components/drafts/DraftQueueScaffold.tsx` — existing tab-based queue; reply drafts surface here (no new tab needed)
- `apps/web/app/api/webhooks/transcripts/fireflies/route.ts` — established webhook signature verification pattern to follow for calendar webhooks
- `apps/web/lib/gmail/` — `client.ts`, `auth.ts`, `error-handler.ts`, `thread.ts` already exist; Phase 3 adds monitoring logic

### Phase 2 decisions that carry forward
- `.planning/phases/02-intelligence/02-CONTEXT.md` — D-14 state framing table (especially `replied` and `call_completed` prompt framing used by reply drafts and call-completed sequence)
- `.planning/phases/02-intelligence/02-CONTEXT.md` — D-16 hard block states (`unsubscribed`, `do_not_contact`, `bounced`) — same states blocked by pre-send safety check (D-25)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/inngest/client.ts` — Inngest singleton ready to register functions; no changes needed to the client itself
- `apps/web/components/drafts/DraftQueueScaffold.tsx` — reply drafts surface here without a new tab; Phase 2 already added Unmatched tab pattern
- `apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx` — "Start Intake Sequence" button needs to call the enrollment API route; Phase 3 adds the API route and wires it
- `packages/shared/src/constants/events.ts` — all Phase 3 event names already defined; no new constants needed

### Established Patterns
- Webhook signature verification: see `apps/web/app/api/webhooks/transcripts/` for HMAC verify → Supabase insert → Inngest event fire pattern; calendar webhooks follow the same structure
- `calendar_events` UNIQUE(provider, external_event_id) constraint handles deduplication at the DB level; Inngest function catches the constraint violation and returns early (idempotency)
- Draft generation: Phase 2 AI engine already handles state-aware generation; Phase 3 sequence steps call the same `generateDraft` function

### Integration Points
- `apps/web/app/api/inngest/route.ts` — register all new Inngest functions here; currently `functions: []`
- `apps/web/app/(dashboard)/page.tsx` (or dashboard layout) — add "Pending Actions" section above `DraftQueueScaffold`
- `apps/web/app/(dashboard)/settings/` — add "Sequence Settings" tab with per-coach cadence configuration UI
- `supabase/migrations/` — new Phase 3 migration file for `sequence_config` column on `coaches`

</code_context>

<specifics>
## Specific Requirements

- The "Pending Actions" section must only render when there are pending items — never show an empty state section; hide entirely when nothing is pending.
- Call follow-up cards use exactly 3 options: **Closed** / **Start follow-up** / **Rescheduled**. No more, no less.
- The 30-minute delay before a call follow-up card appears uses Inngest `step.sleepUntil(eventEndTime + 30min)` — not a cron.
- Per-coach sequence cadence stored as `sequence_config JSONB` with structure: `{"no_show_delays": [1,3,7,14,21], "call_completed_delays": [1,4,10]}` where values are days from sequence start.
- Provider tooltip on `IntegrationHealthCard` distinguishes "Auto" vs "Manual" mode for no-show detection; do not add a persistent badge.
- Onboarding wizard (Phase 5) must include a dedicated step explaining which calendar providers support automatic no-show detection.
- Gmail Pub/Sub: one shared topic. Webhook route receives push notifications and routes to coach by email address match.

</specifics>

<deferred>
## Deferred Ideas

- **Per-lead cadence override at enrollment time** — user considered letting coaches override cadence per-lead when starting a sequence. Deferred: adds complexity to the enrollment flow. Per-coach cadence via Settings covers the use case.
- **"Add to sequence?" multi-channel notification (Phase 4)** — the lead intake monitoring card shows on the dashboard in Phase 3. Phase 4 extends this prompt to WhatsApp/Slack/email notification channels (same as draft approval channels).
- **Autonomous mode for sequences (Phase 4)** — auto-send drafts without coach approval. Phase 3 generates and surfaces drafts; Phase 4 adds autonomous mode toggle.

</deferred>

---

*Phase: 3-Automation*
*Context gathered: 2026-05-19*
