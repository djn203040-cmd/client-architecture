---
phase: 03-automation
plan: 05
subsystem: compliance
tags: [can-spam, unsubscribe, bounce, inngest, gmail]

# Dependency graph
requires:
  - phase: 03-02
    provides: sequences/drafts table schema + cancellation patterns
  - phase: 03-03
    provides: gmail-monitor fires LEAD_BOUNCED with coachId/messageId, bounce-detector.ts

provides:
  - generateUnsubscribeToken + verifyUnsubscribeToken + buildUnsubscribeUrl (HMAC-SHA256 + timingSafeEqual)
  - /api/unsubscribe no-auth GET route — verifies token, marks lead unsubscribed, cancels sequences/drafts, fires LEAD_UNSUBSCRIBED
  - /unsubscribe glass card confirmation page (COMPLY-003)
  - bounceHandler Inngest function — LEAD_BOUNCED → extract email → mark lead.bounced, cancel sequences, queue notification_log row
affects: [03-06, 04-approval-channels, phase-4-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns: [hmac-sha256-signed-tokens, timing-safe-comparison, no-auth-public-route, inngest-graceful-exit-on-missing-data]

key-files:
  created:
    - apps/web/lib/unsubscribe-token.ts
    - apps/web/app/api/unsubscribe/route.ts
    - apps/web/app/unsubscribe/page.tsx
    - apps/web/inngest/functions/bounce-handler.ts
  modified:
    - apps/web/app/api/inngest/route.ts

key-decisions:
  - "UNSUBSCRIBE_SECRET env var required — throws at token generation time if missing (fail-fast)"
  - "/api/unsubscribe uses adminClient only — no session required (CAN-SPAM requirement)"
  - "Lead ownership verified via .eq('coach_id', coachId) before any DB mutation (T-03-20 mitigation)"
  - "Idempotent: already-unsubscribed leads short-circuit to success page without re-processing"
  - "bounceHandler gracefully exits (not throws) when email can't be extracted — prevents infinite retries"
  - "notification_log row inserted in Phase 3 — Phase 4 owns multi-channel delivery (NOTIFY-001–008)"
  - "Soft bounces deliberately excluded — only MAILER-DAEMON events reach this handler (COMPLY-008)"

patterns-established:
  - "Token format: base64url(payload).hexHmac — two-part dot-separated, timing-safe verify"
  - "No-auth public routes: adminClient only, redirect-on-error (no 4xx to end-user)"
  - "Inngest early return { ok: false, reason } for graceful exit without retry storm"

requirements-completed: [COMPLY-001, COMPLY-002, COMPLY-003, COMPLY-004, COMPLY-005, COMPLY-007, COMPLY-008, STATE-006, STATE-008]

# Metrics
duration: 15min
completed: 2026-05-20
---

# Phase 03-05: Compliance Layer Summary

**CAN-SPAM unsubscribe token lib, /api/unsubscribe route, /unsubscribe confirmation page, and LEAD_BOUNCED Inngest handler**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-05-20
- **Tasks:** 2
- **Files created:** 4, **modified:** 1

## Accomplishments
- `unsubscribe-token.ts`: HMAC-SHA256 signed tokens with timing-safe comparison; `buildUnsubscribeUrl` ready to embed in email footers (COMPLY-001)
- `/api/unsubscribe`: no-auth GET route verifies token, confirms coach ownership, updates lead + sequences + drafts + lead_events, fires `LEAD_UNSUBSCRIBED` to terminate any sleeping Inngest sequences (SEQ-008)
- `/unsubscribe` page: glass card, no login, three states (success / invalid token / not found), COMPLY-003 compliant
- `bounceHandler`: 4-step Inngest function — extracts email from MAILER-DAEMON message via Gmail API, finds lead, sets `lead.bounced = true`, cancels sequences, queues `notification_log` row for Phase 4 delivery
- `bounceHandler` registered in `serve()` — 7 functions total

## Files Created/Modified
- `apps/web/lib/unsubscribe-token.ts` — generateUnsubscribeToken, verifyUnsubscribeToken, buildUnsubscribeUrl
- `apps/web/app/api/unsubscribe/route.ts` — no-auth CAN-SPAM unsubscribe endpoint
- `apps/web/app/unsubscribe/page.tsx` — on-brand glass card confirmation page
- `apps/web/inngest/functions/bounce-handler.ts` — LEAD_BOUNCED handler, 4 steps
- `apps/web/app/api/inngest/route.ts` — bounceHandler registered

## Decisions Made
- Token payload includes `coachId` — cross-coach token forgery impossible even with a valid token (T-03-20)
- `notification_log` row inserted at bounce time; Phase 4 reads `status: "pending"` rows and delivers via Twilio/Slack/Resend
- `bounceHandler` returns `{ ok: false }` (not throw) when email can't be extracted — prevents Inngest retry storm on unparseable bounce messages

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
- Add `UNSUBSCRIBE_SECRET` env var to Vercel (any random 32-char string). Without it, `generateUnsubscribeToken` will throw at send time.
- Add `NEXT_PUBLIC_APP_URL` env var if not already set (used in `buildUnsubscribeUrl`).

## Next Phase Readiness
- 03-05 ✅ complete — compliance layer wired
- 03-06 (notification channels) is next: Twilio/Slack/Resend dispatch for `notification_log` rows
- Phase 3 Wave 4 complete after 03-06

---
*Phase: 03-automation*
*Completed: 2026-05-20*
