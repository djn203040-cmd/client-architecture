# 04-05 Summary — Twilio WhatsApp + SMS Channels

**Status:** Complete  
**Date:** 2026-05-20  
**Tests:** 17/17 GREEN (4 unit sms-body, 5 integration whatsapp-channel, 8 integration webhook-status)

---

## What Was Built

| File | What It Does |
|------|-------------|
| `apps/web/lib/twilio/client.ts` | `getTwilioClient()` lazy singleton — throws if env vars unset |
| `apps/web/lib/twilio/signature.ts` | `verifyTwilioSignature()` — wraps `twilio.validateRequest` |
| `apps/web/lib/notifications/channels/whatsapp-templates.ts` | `WHATSAPP_TEMPLATES` — draft_ready_v1 + draft_followup_v1 metadata + env-var keys |
| `apps/web/lib/notifications/channels/sms-body.ts` | `buildSmsBody()` — initial/followup/bounce variants, truncates lead name at 30, MAX_SMS_LENGTH=160 |
| `apps/web/lib/notifications/channels/whatsapp.ts` | `sendWhatsApp()` — Twilio Content API, selects template by followup_count, writes notification_log |
| `apps/web/lib/notifications/channels/sms.ts` | `sendSMS()` — MessagingServiceSid, buildShortReviewUrl (/r/{token}), belt-and-suspenders length check, writes notification_log |
| `apps/web/app/api/webhooks/twilio/status/route.ts` | POST status callback — verifies X-Twilio-Signature, maps MessageStatus, updates notification_log by external_id |

---

## Key Implementation Notes

### WhatsApp template variable shape
- `draft_ready_v1` uses 3 variables: `{"1": leadName, "2": sendTime, "3": reviewUrl}`
- `draft_followup_v1` uses 2 variables: `{"1": leadName, "2": reviewUrl}` (no sendTime)
- Template selection: `followup_count >= 1` → `draft_followup`, else `draft_ready`

### SMS uses /r/{token} (short link)
WhatsApp uses `/review/{token}` (full path). SMS uses `buildShortReviewUrl` to stay under 160 chars.

### coaches.phone column
`coaches` table uses a single `phone` column (from Phase 1 schema). There is no separate `whatsapp_phone` or `sms_phone` column. Both `sendWhatsApp` and `sendSMS` use `coaches.phone`. If separate WhatsApp/SMS numbers are needed in the future, a migration adding `whatsapp_phone` and `sms_phone` columns would be required, with fallback to `phone`.

### WhatsApp follow-up template variable count
`draft_followup_v1` has 2 variables (confirmed in code). If Meta's approval adds a third (e.g., send time), update `whatsapp-templates.ts` and `whatsapp.ts` accordingly.

### Template SIDs not provisioned yet
Production sends will return Twilio error 63016 ("template not found") until Daniel sets `TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID` and `TWILIO_WHATSAPP_DRAFT_FOLLOWUP_CONTENT_SID` in Vercel env after Meta approves the templates. Both adapters handle missing SIDs gracefully (log `failed`, don't throw).

### twilio package installed
`twilio@6.0.2` (or current latest) added to `apps/web` via `pnpm add twilio --filter web`.

### Twilio webhook signature mock pattern
In tests, mock `@/lib/twilio/signature` directly (not through the Twilio SDK mock) to avoid the `twilio.validateRequest` default-export property issue. See `webhook-status.test.ts` for the pattern.

---

## Env Vars Required (production)

| Var | Purpose |
|-----|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID (server-side only) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (server-side only, used for signature verify) |
| `TWILIO_WHATSAPP_FROM` | WhatsApp-enabled number, e.g., `+14155238886` |
| `TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID` | Meta-approved template SID for draft_ready_v1 |
| `TWILIO_WHATSAPP_DRAFT_FOLLOWUP_CONTENT_SID` | Meta-approved template SID for draft_followup_v1 |
| `TWILIO_MESSAGING_SERVICE_SID` | Messaging Service SID for SMS sends |

---

## Notes for 04-07 Dispatcher

- Both `sendWhatsApp` and `sendSMS` accept `TNotificationEvent` and return `TChannelResult`
- Import path: `@/lib/notifications/channels/whatsapp` and `@/lib/notifications/channels/sms`
- Channels do not throw — always return `{status: 'sent' | 'failed'}` and log to `notification_log`
- Dispatcher should check `notification_preferences.channels` to determine which channels to activate

---

## Deferred Items

| Item | Phase |
|------|-------|
| `messages.read` Twilio permission (for delivery verification flows) | Phase 5 if needed |
| Separate `whatsapp_phone` / `sms_phone` columns (currently shares `coaches.phone`) | Migration on request |
| SMS toll fraud rate-limiting (Upstash per-coach) | Plan 04-07 dispatcher |
| WhatsApp hard_bounce dedicated template | Out of scope Phase 4 — currently logs `no_template_for_event_type` |
