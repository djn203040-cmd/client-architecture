# Plan 03-03 Summary — Gmail Monitoring Stack

**Status:** Complete
**Completed:** 2026-05-20
**Commit:** fe362cf

---

## What Was Built

Full Gmail monitoring stack: real-time Pub/Sub path (60s SLA), polling fallback, watch renewal, bounce detection, and tracking pixel.

### Files Created

| File | Purpose |
|------|---------|
| `apps/web/lib/gmail/monitor.ts` | Pure utility — `setupGmailWatch` + `processHistoryUpdate`. No Inngest import. Returns `{ eventsToFire }` for unit-testability |
| `apps/web/lib/gmail/bounce-detector.ts` | `isBounceMessage` + `extractBouncedEmail` — pure header parsing |
| `apps/web/inngest/functions/gmail-watch.ts` | `gmailWatch` — renews all watches expiring within 48h; handles `invalid_grant` gracefully |
| `apps/web/inngest/functions/gmail-monitor.ts` | `gmailMonitor` (polling fallback) + `gmailNotificationReceived` (Pub/Sub real-time path) |
| `apps/web/app/api/webhooks/gmail/push/route.ts` | GCP Pub/Sub push receiver — always returns 200, decodes base64url, routes to coach |
| `apps/web/app/api/track/open/route.ts` | 1×1 GIF tracking pixel — no-cache headers, idempotent open logging to `email_events` |
| `apps/web/lib/email/template.ts` | `injectTrackingPixel` helper — wired in Phase 4 send path |

### Files Modified

| File | Change |
|------|--------|
| `apps/web/app/api/inngest/route.ts` | Registered `gmailWatch`, `gmailMonitor`, `gmailNotificationReceived` in `serve()` |

---

## Key Decisions

- **processHistoryUpdate is Inngest-free** — returns `{ eventsToFire }`, caller fires via `step.sendEvent()`. This enforces SEQ-004: no `inngest.send()` inside running Inngest functions.
- **Always-200 Pub/Sub receiver** — any non-2xx causes GCP exponential retry storms (T-03-13). All error paths ACK.
- **D-18 branch** — fresh email from `in_sequence` lead (no In-Reply-To) fires `LEAD_REPLIED` not intake card. Both branches in `processHistoryUpdate`.
- **base64url for tokens** — tracking pixel token and Pub/Sub payload both use base64url (not base64) to avoid URL encoding issues.
- **Idempotent open logging** — check for existing `opened` event before insert, preventing duplicate rows if pixel fires twice.
- **48h renewal window** — Gmail watches expire every 7 days; `gmail-watch.ts` renews at 48h remaining to avoid gaps.

---

## Requirements Covered

GMAIL-004, GMAIL-005, GMAIL-006, GMAIL-007, GMAIL-008, HEALTH-005, HEALTH-006, STATE-008, COMPLY-005, COMPLY-008

---

## What's Next

- **03-04** — Reply handler: Inngest function that reacts to `LEAD_REPLIED` events, pauses sequences, surfaces pending action card
- **03-05** — Bounce handler: reacts to `LEAD_BOUNCED`, marks lead, pauses sequence, notifies coach
