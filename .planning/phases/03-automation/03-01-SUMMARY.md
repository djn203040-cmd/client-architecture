---
phase: 03-automation
plan: 01
subsystem: api, database, testing
tags: [calendar, webhooks, inngest, hmac, supabase, migration, vitest]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase schema, coaches/leads/calendar_events tables, integration_provider enum
  - phase: 02-intelligence
    provides: transcript webhook canonical pattern (rawBody → verify → dedup → insert → inngest.send)
provides:
  - TCalendarEvent unified type + TCalendarEventType in packages/shared
  - 7 calendar provider webhook routes with HMAC signature verification
  - apps/web/lib/calendar/index.ts with 7 normalizers + 4 signature verifiers (timingSafeEqual)
  - supabase migration: sequence_config JSONB on coaches, pending_actions table, email_events index
  - 8 Wave 0 test stubs covering CAL-004, CAL-005, SEQ-006, SEQ-007, SEQ-013, SEQ-014, GMAIL-008, COMPLY-001/002/005/007, STATE-010
affects: [03-02, 03-03, 03-04, 03-05, 03-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Calendar webhook route pattern (rawBody → verify → coach check → normalize → dedup → insert → inngest.send)
    - Per-provider HMAC signature verification with timingSafeEqual
    - Deterministic Inngest event ID via `${provider}-${externalEventId}`

key-files:
  created:
    - packages/shared/src/types/calendar.ts
    - apps/web/lib/calendar/index.ts
    - apps/web/app/api/webhooks/calendar/calendly/route.ts
    - apps/web/app/api/webhooks/calendar/cal-com/route.ts
    - apps/web/app/api/webhooks/calendar/acuity/route.ts
    - apps/web/app/api/webhooks/calendar/setmore/route.ts
    - apps/web/app/api/webhooks/calendar/square/route.ts
    - apps/web/app/api/webhooks/calendar/ms-bookings/route.ts
    - apps/web/app/api/webhooks/calendar/tidycal/route.ts
    - supabase/migrations/20260519000003_phase3_automation.sql
    - apps/web/tests/unit/pre-send-safety.test.ts
    - apps/web/tests/unit/calendar-webhook-verification.test.ts
    - apps/web/tests/unit/calendar-deduplication.test.ts
    - apps/web/tests/unit/reply-detection.test.ts
    - apps/web/tests/unit/bounce-detection.test.ts
    - apps/web/tests/unit/unsubscribe.test.ts
    - apps/web/tests/unit/sequence-concurrency.test.ts
    - apps/web/tests/integration/webhook-deduplication.test.ts
  modified:
    - packages/shared/src/types/index.ts

key-decisions:
  - "Setmore, MS Bookings, TidyCal use pass-through verification (no documented HMAC) — documented with TODO comment"
  - "No-show support only for Calendly and Cal.com per CAL-009/D-08"
  - "Square HMAC input includes full notification URL concatenated with raw body (no separator)"
  - "Acuity signature uses base64-encoded HMAC-SHA256 (not hex)"

patterns-established:
  - "Calendar webhook route: rawBody first → verify → coach exists check → normalize → dedup via UNIQUE constraint → insert → inngest.send with deterministic ID"
  - "Pass-through verifiers return true with TODO comment noting missing provider docs"
  - "Normalizers return null for unknown event types (caller returns 200 silently)"

requirements-completed:
  - CAL-001
  - CAL-002
  - CAL-003
  - CAL-004
  - CAL-005
  - CAL-006
  - CAL-007
  - CAL-008
  - CAL-009
  - SEQ-007
  - SEQ-014
  - STATE-002
  - STATE-003
  - STATE-010

# Metrics
duration: 15min
completed: 2026-05-19
---

# Phase 03-01: Calendar Abstraction Layer Summary

**7 calendar webhook routes with per-provider HMAC verification, unified TCalendarEvent type, sequence_config migration applied to Supabase, and 8 Wave 0 test stubs — all downstream plans now unblocked**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-19T21:38:00Z
- **Completed:** 2026-05-19T21:45:00Z
- **Tasks:** 8 (2 main tasks, 6 subtasks)
- **Files modified:** 19

## Accomplishments
- SQL migration applied to live Supabase: `sequence_config JSONB` on coaches, `pending_actions` table with RLS, composite index on `email_events(coach_id, gmail_message_id)`
- `apps/web/lib/calendar/index.ts` ships 7 normalizers + 4 timing-safe HMAC verifiers (Calendly, Cal.com, Acuity, Square) + 3 pass-through stubs (Setmore, MS Bookings, TidyCal)
- All 7 webhook routes follow canonical pattern; only Calendly + Cal.com fire `LEAD_NO_SHOW`, others fire only `LEAD_CALL_BOOKED`
- 8 test stubs covering every downstream test requirement — `pnpm test:unit` passes 99 tests, 35 todos

## Files Created/Modified
- `packages/shared/src/types/calendar.ts` — TCalendarEvent interface, TCalendarEventType
- `packages/shared/src/types/index.ts` — added `export * from "./calendar"`
- `apps/web/lib/calendar/index.ts` — 7 normalizers + 7 signature verifiers
- `apps/web/app/api/webhooks/calendar/calendly/route.ts` — no-show + booking_created
- `apps/web/app/api/webhooks/calendar/cal-com/route.ts` — no-show (manual) + booking_created
- `apps/web/app/api/webhooks/calendar/acuity/route.ts` — booking_created only
- `apps/web/app/api/webhooks/calendar/setmore/route.ts` — booking_created only
- `apps/web/app/api/webhooks/calendar/square/route.ts` — booking_created only
- `apps/web/app/api/webhooks/calendar/ms-bookings/route.ts` — booking_created only
- `apps/web/app/api/webhooks/calendar/tidycal/route.ts` — booking_created only
- `supabase/migrations/20260519000003_phase3_automation.sql` — applied to live DB
- 8 test stub files in `apps/web/tests/unit/` and `apps/web/tests/integration/`

## Decisions Made
- Square's HMAC is base64-encoded, not hex, and includes the full notification URL concatenated with body (per Square docs) — `notificationUrl + rawBody` with NO separator
- Acuity uses `base64(HMAC-SHA256(rawBody, apiKey))` while Calendly uses `"sha256=" + hex(HMAC)` — each verifier reflects the provider's documented algorithm
- Test stub paths use `apps/web/tests/` (vitest config root) not a root `/tests/` dir — plan used relative paths that map correctly

## Deviations from Plan
None — plan executed exactly as written. One observation: plan listed test paths as `tests/unit/...` (relative), which correctly maps to `apps/web/tests/unit/` where vitest is configured.

## Issues Encountered
None.

## User Setup Required
**7 environment variables needed** in Vercel and local `.env.local` when calendar providers are configured per-coach:
- `CALENDLY_WEBHOOK_SECRET`
- `CAL_COM_WEBHOOK_SECRET`
- `ACUITY_API_KEY`
- `SQUARE_WEBHOOK_SECRET`

Setmore, MS Bookings, TidyCal have no secret required (pass-through verification).

## Next Phase Readiness
- 03-02 (Inngest sequence functions) can start immediately — `sequence_config` column exists, `TCalendarEvent` type available, `LEAD_NO_SHOW` / `LEAD_CALL_BOOKED` events fire from all 7 routes
- 03-03 (Gmail monitor) has its test stub scaffolded (`reply-detection.test.ts`, `bounce-detection.test.ts`)
- All Wave 0 stubs present for Wave 2+ plans to fill in

---
*Phase: 03-automation*
*Completed: 2026-05-19*
