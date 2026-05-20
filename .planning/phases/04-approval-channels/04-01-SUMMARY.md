---
plan: 04-01
status: complete
commit: 781f0d0
---

## What shipped

3 migrations applied to `ktxgtpvilrydmedvzgft` (eu-central-1):

| Migration | Contents |
|---|---|
| 20260520000001_phase4_approval.sql | drafts.followup_count, drafts.review_token_nonce, notification_channel+'dashboard', notification_preferences table, consumed_tokens table, notification_log.payload |
| 20260520000002_advisory_lock_rpc.sql | 5 SECURITY DEFINER RPCs in private schema |
| 20260520000003_public_rpc_wrappers.sql | Public-schema wrappers (PGRST106 fallback) |

TS wrappers: `apps/web/lib/drafts/approve-atomic.ts`, `apps/web/lib/notifications/seed-preferences.ts`  
Shared types: `packages/shared/src/types/notifications.ts` (TNotificationEventType, TNotificationEvent, TChannelResult, TApproveAtomicResult)  
Types regenerated: `packages/database/src/types.ts`

Integration tests: 6/6 GREEN

---

## Open Question Resolution

### Open Question #3 — `.schema("private").rpc(...)` on live Supabase

**Result: DOES NOT WORK.**  
Error: `PGRST106 Invalid schema: private — Only the following schemas are exposed: public, graphql_public`

**Fallback applied:** Added `20260520000003_public_rpc_wrappers.sql` — thin public-schema wrappers that call the private functions. Same security: all wrappers are `SECURITY DEFINER` + `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO service_role`. The `adminClient.rpc("approve_draft_atomic", ...)` call (no `.schema()`) now works via the public wrapper.

All downstream plans (04-02 through 04-08) that call `approveDraftAtomic` / `holdDraftAtomic` / `consumeReviewToken` from the `approve-atomic.ts` wrapper will work correctly — they hit the public wrapper, which delegates to the private advisory-lock function.

### Open Question #2 — `resend@6.12.3` ships `resend.webhooks.verify` helper

Not investigated in 04-01. Note for plan 04-03: check whether `resend.webhooks.verify` exists before implementing the webhook handler; if absent, verify the `Resend-Signature` header manually using HMAC-SHA256.

---

## D-26 Amendment (B-5)

`notification_log.payload JSONB DEFAULT '{}'` was added via `IF NOT EXISTS` — no existing column altered or dropped. 04-07 Task 1 (dashboard channel adapter) can now write `payload: event.payload` to this column for Realtime delivery. CONTEXT.md D-26 note is now stale and should be read as "notification_log has one additional column: payload".

---

## Idempotency confirmed

Both migrations are fully idempotent (`IF NOT EXISTS`, `OR REPLACE`). Re-pushing produces no changes.

## Tests flipped GREEN

- `tests/integration/approve-atomic.test.ts` — 3/3 GREEN (happy path, concurrent CAS, not_pending guard)
- `tests/integration/notification-preferences-seed.test.ts` — 3/3 GREEN (seed, idempotent, preserve overrides)
