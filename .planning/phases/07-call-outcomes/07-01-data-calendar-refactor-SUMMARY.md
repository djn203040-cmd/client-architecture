---
phase: 07-call-outcomes
plan: 01
subsystem: database
tags: [supabase, postgres, rls, inngest-events, calendar-webhooks, slack-blockkit, typescript]

# Dependency graph
requires:
  - phase: 03-automation
    provides: 7 calendar webhook routes + Inngest calendar events (CAL-006/007/008)
  - phase: 06-call-outcomes (own milestone)
    provides: terminal-status rename closed -> lost (918ab8b)
provides:
  - call_outcomes table (2 enums, FORCE RLS, realtime publication, record_call_outcome_atomic CAS RPC)
  - leads.email made nullable (placeholder leads for email-less bookings)
  - call_converted added to lead_event_type enum
  - single processCalendarEvent + upsertLeadFromBooking path called by all 7 calendar webhooks
  - buildCallOutcomeBlocks / buildCallOutcomeResolvedBlocks Slack Block Kit surface (shared by wave 2)
  - recordCallOutcomeAtomic typed RPC wrapper
affects: [07-02-inngest-monitor-downstream, 07-03-api-slack, 07-04-frontend-calls-queue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single calendar-event ingestion path: all 7 provider handlers delegate to processCalendarEvent(event)"
    - "Never-regress guard on lead upsert: a new booking never downgrades a converted/lost/do_not_contact lead"
    - "CAS-style atomic resolution via record_call_outcome_atomic — double calls no-op"
    - "Email-less bookings -> placeholder lead deduped by phone, flagged email_pending"

key-files:
  created:
    - supabase/migrations/20260603000000_leads_email_nullable.sql
    - supabase/migrations/20260603000001_call_outcomes.sql
    - supabase/migrations/20260603000002_call_outcomes_realtime.sql
    - apps/web/lib/calendar/process-event.ts
    - apps/web/lib/calendar/upsert-lead.ts
    - apps/web/lib/call-outcomes/record-atomic.ts
    - apps/web/lib/slack/blocks.ts
    - packages/shared/src/types/calendar.ts
  modified:
    - packages/database/src/types.ts
    - packages/shared/src/types/index.ts
    - packages/shared/src/types/notifications.ts
    - packages/shared/src/constants/events.ts
    - apps/web/app/api/webhooks/calendar/{calendly,cal-com,acuity,setmore,square,ms-bookings,tidycal}/route.ts
    - apps/web/components/leads/LeadEventIcon.tsx

key-decisions:
  - "leads.email made nullable rather than a sentinel value — cleaner for email_pending placeholder leads"
  - "record_call_outcome_atomic is the single mutation surface for resolving outcomes (API + Slack both route through it)"
  - "Reschedule re-emits LEAD_CALL_BOOKED so the wave-2 monitor re-arms against the new time"
  - "LeadEventIcon gets a placeholder call_converted entry here (enum exhaustiveness); final icon/label styling owned by 07-04"

patterns-established:
  - "processCalendarEvent: 7 provider routes normalize then call one ingestion path"
  - "upsertLeadFromBooking: email-then-phone dedup + never-regress status guard"

requirements-completed: [CALL-001, CALL-002, CALL-009, CALL-011, CALL-012, CALL-015, CALL-016]

# Metrics
duration: ~75min (incl. live DB push checkpoint)
completed: 2026-06-03
---

# Phase 7 — Plan 07-01: Data + Calendar Processing Refactor Summary

**Every calendar booking across all 7 providers now flows through a single `processCalendarEvent` path that creates/updates a lead and opens a `call_outcomes` record — closing the standing gap where webhooks never auto-created leads.**

## Performance

- **Tasks:** 3 (Task 2 was a human-action live-DB-push checkpoint, executed with operator sign-off)
- **Files created:** 8 | **modified:** ~13

## Accomplishments
- `call_outcomes` table live in production Supabase: 2 enums (`call_outcome_status`, `call_outcome_value`), FORCE RLS scoped to `coach_id`, realtime publication, `record_call_outcome_atomic` CAS RPC.
- All 7 calendar webhooks (Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal) centralized behind `processCalendarEvent` + `upsertLeadFromBooking`, with `call_booked` timeline events.
- Email-less bookings create phone-deduped placeholder leads flagged `email_pending`; new bookings never regress a converted/lost/do_not_contact lead.
- Shared Slack Block Kit (`buildCallOutcomeBlocks`) and `recordCallOutcomeAtomic` wrapper exported as the stable surface both wave-2 plans import.

## Task Commits

1. **Task 1: Migration + enums + RLS + atomic RPC + shared types + Slack blocks** — `a9b5722` (feat)
2. **Task 3: Centralize 7 calendar handlers behind processCalendarEvent** — `77b1ff7` (feat)
3. **Task 2: Apply migration to live Supabase + regen DB types** — `8618b08` (feat)

Supporting: deferred-items log `7fdde0f` (docs).

## Checkpoint Resolution

Task 2 (live DB push) was an `autonomous: false` human-action gate. Operator chose "inspect first":
- `supabase migration list` showed **zero drift** — every prior migration aligned Local==Remote; only the 3 new `20260603*` files unapplied. No `migration repair` required.
- `supabase db push` applied all 3 migrations cleanly.
- `db:gen-types` script uses bare `supabase` (not on PATH) and its `>` redirect truncated `types.ts` to empty; regenerated correctly via `pnpm dlx supabase gen types` (1365 lines).
- Post-regen `tsc --noEmit`: 0 call-outcome errors. The `call_converted` enum addition surfaced one exhaustiveness error in `LeadEventIcon.tsx` (a regression from 07-01's enum) — fixed with a `call_converted` map entry.

## Known Issues / Deferred
- 25 pre-existing `tsc` errors remain in `lib/unsubscribe-token.ts`, `lib/voice/parse-speakers.ts`, and 3 test files — predate this plan, untouched by Phase 7. See `deferred-items.md`.
- `db:gen-types` script should use `pnpm dlx supabase` (bare `supabase` not on PATH; `>` truncates `types.ts` on failure). Flagged, not fixed (out of scope).
- `type-check` OOMs under default Node heap; needs `NODE_OPTIONS=--max-old-space-size=8192`.

## Self-Check: PASSED
- 7/7 calendar handlers call `processCalendarEvent`
- `call_outcomes` FORCE-RLS scoped to `coach_id` + in realtime publication
- `record_call_outcome_atomic` present and typed
- No call-outcome type errors after regen
