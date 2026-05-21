# Webhook Signature Registry

Every webhook receiver verifies its signature **before** reading the body for
processing. Replay windows and idempotency requirements are documented per
provider below. All 14 sources are gated by signature verification + (where
applicable) timestamp checks + idempotency-key dedup.

| # | Provider | Endpoint | Scheme | Timestamp window | Idempotency key |
|---|----------|----------|--------|------------------|-----------------|
| 1 | Calendly | `/api/webhooks/calendar/calendly` | HMAC-SHA256 (`calendly-webhook-signature`) | 3 min | `event.uuid` |
| 2 | Cal.com | `/api/webhooks/calendar/cal-com` | HMAC-SHA256 (`x-cal-signature-256`) | n/a | `bookingId` |
| 3 | Acuity | `/api/webhooks/calendar/acuity` | HMAC-SHA256 (`x-acuity-signature`) | n/a | `appointmentId` |
| 4 | Setmore | `/api/webhooks/calendar/setmore` | shared-secret query token | n/a | `event_id` |
| 5 | Square | `/api/webhooks/calendar/square` | HMAC-SHA256 (`x-square-hmacsha256-signature`) — URL+body | n/a | `event_id` |
| 6 | MS Bookings | `/api/webhooks/calendar/ms-bookings` | shared-secret header | n/a | `subscriptionId+changeType` |
| 7 | TidyCal | `/api/webhooks/calendar/tidycal` | shared-secret header | n/a | `booking.id` |
| 8 | Slack | `/api/webhooks/slack/interactivity` | HMAC-SHA256 (`x-slack-signature` + `x-slack-request-timestamp`) | 5 min | `payload.trigger_id` |
| 9 | Resend | `/api/webhooks/resend` | Svix (`svix-id` + `svix-timestamp` + `svix-signature`) | 5 min | `svix-id` |
| 10 | Twilio | `/api/webhooks/twilio/status` | Twilio v1 (`x-twilio-signature`) | n/a | `MessageSid` |
| 11 | Gmail Pub/Sub | `/api/webhooks/gmail/push` | Google JWT (RS256) against JWKS | 5 min (`exp`) | `message.messageId` |
| 12 | Fireflies | `/api/webhooks/transcripts/fireflies` | HMAC-SHA256 (`x-hub-signature`) | n/a | `transcript_id` |
| 13 | Zoom | `/api/webhooks/transcripts/zoom` | HMAC-SHA256 (`x-zm-signature` + `x-zm-request-timestamp`) | 5 min | `payload.object.uuid` |
| 14 | Inngest | `/api/inngest` | Inngest signing key (handled by SDK) | n/a | Inngest event ID |

> **Note on MS Bookings / Setmore / TidyCal:** these providers do not publish a
> formal HMAC scheme. Receivers use a per-coach shared-secret query token
> stored in Vault and verified before processing. Documented and accepted.

## Replay protection

For sources that include a timestamp header, we reject requests where the
clock skew is > 5 minutes. Sources without a timestamp rely on idempotency-key
dedup (`webhook_events` unique constraint on `(source, external_event_id)`).

## Idempotency table

```sql
create table if not exists webhook_events (
  id bigint generated always as identity primary key,
  source text not null,
  external_event_id text not null,
  received_at timestamptz default now(),
  unique (source, external_event_id)
);
```

Receivers insert into `webhook_events` on a successful verification; a
duplicate insert returns the original `received_at` and the handler short-
circuits with a 200 OK without reprocessing.

## CORS

Webhook endpoints are server-to-server only. CORS is denied at the edge — no
`Access-Control-Allow-Origin` is ever set on `/api/webhooks/*`. Forged
preflight or browser-origin requests fall through to 401 (signature missing).

## Cross-references

- `lib/security/verify-gmail-pubsub.ts` — JWT verifier with JWKS cache
- `lib/slack/signature.ts` — Slack v0 signing with 5-min skew window
- `lib/twilio/signature.ts` — Twilio HMAC via official SDK
- `lib/resend/signature.ts` — Svix wrapper
- `lib/calendar/*` — Calendly/Cal.com/Acuity/Square verifiers
- `lib/transcripts/lead-matching.ts` — Fireflies + Zoom verifiers

## Threat coverage

Maps to threat-model entries `T-06-02-01` (spoofed webhook), `T-06-02-07`
(webhook flood). Forged-payload tests in `tests/security/webhook-signatures.test.ts`.
