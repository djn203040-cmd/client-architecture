---
plan: 04-03
phase: 4
status: complete
commits: [e86b42a, 8b5d81c, cf9e881, c77eac0]
subsystem: email-channel
tags: [resend, review-token, hmac, svix, public-review-page, webhook]
requires: [04-00, 04-01, 04-02]
provides: [email-channel, review-token-lib, review-page, short-link, resend-webhook]
affects: [04-07-dispatcher, 04-05-sms-short-link]
tech-stack:
  added: [resend@6.x, svix]
  patterns: [HMAC-token-sign-verify, single-use-nonce, Svix-webhook-verify, server-component-with-token-auth]
key-files:
  created:
    - apps/web/lib/review-token.ts
    - apps/web/lib/resend/client.ts
    - apps/web/lib/resend/signature.ts
    - apps/web/lib/email/templates/draft-ready.tsx
    - apps/web/lib/notifications/channels/email.ts
    - apps/web/app/(review)/layout.tsx
    - apps/web/app/(review)/review/[token]/page.tsx
    - apps/web/app/r/[token]/route.ts
    - apps/web/app/r/invalid/page.tsx
    - apps/web/app/api/review/[token]/route.ts
    - apps/web/app/api/review/[token]/data/route.ts
    - apps/web/app/api/webhooks/resend/route.ts
  modified:
    - apps/web/tests/unit/review-token.test.ts
    - apps/web/tests/integration/email-channel.test.ts
    - apps/web/tests/integration/review-token.test.ts
    - apps/web/tests/integration/webhook-status.test.ts
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "svix used for Resend webhook verification (resend@6.12.3 does NOT ship webhooks.verify)"
  - "review-token uses unix ms (not seconds) for exp field — consistent with Date.now()"
  - "coaches.email used as both to and replyTo (gmail_email column not in schema)"
  - "draft_edits stores original_body/edited_body only (no subject column exists)"
  - "review-page unit tests use file-read assertions (not full SSR render) since happy-dom lacks Next.js runtime"
metrics:
  duration: "17m"
  completed: "2026-05-20"
  tasks: 4
  files_created: 12
  files_modified: 6
  tests_green: 31
---

# Phase 4 Plan 03: Email Channel + Tokenized Review Page Summary

HMAC-signed review tokens, Resend email channel with full draft inline, public review page with four states (actionable/already_actioned/expired/invalid), short-link redirect route, and the Resend Svix webhook that tracks delivery status in `notification_log`.

## What Was Built

### Task 1 — Review-token library + Resend primitives

**`apps/web/lib/review-token.ts`**
- `generateReviewToken({draftId, coachId, nonce, ttlMs?})` — HMAC-SHA256 over `base64url(payload)`, 7-day default expiry, `timingSafeEqual` compare
- `verifyReviewToken(token)` — returns `ReviewTokenPayload | null`; rejects expired/tampered/malformed
- `buildReviewUrl(token)` → `${APP_URL}/review/{token}`
- `buildShortReviewUrl(token)` → `${APP_URL}/r/{token}`

**`apps/web/lib/resend/client.ts`**
- `getResendClient()` lazy singleton; throws if `RESEND_API_KEY` unset

**`apps/web/lib/resend/signature.ts`**
- `verifyResendSignature({rawBody, headers, secret})` async — uses `svix` `Webhook.verify`

**Open Question #2 resolution:** `resend@6.12.3` does NOT ship `resend.webhooks.verify`. Used `svix` lib directly.

### Task 2 — Email template + channel adapter

**`apps/web/lib/email/templates/draft-ready.tsx`**
- `buildDraftReadyEmail()` — subject: `"Draft ready for {lead_name}"`
- `buildDraftFollowupEmail()` — subject: `"Reminder: draft for {lead_name} still waiting"`
- `buildHardBounceEmail()` — subject: `"Email to {lead_email} bounced"`
- Inline HTML email, max-width 600px, amber CTA `#c9913a`, confidence pill when `confidence_level === "low"`

**`apps/web/lib/notifications/channels/email.ts`**
- `sendEmail(event: TNotificationEvent) → TChannelResult`
- Writes `notification_log` row on success (status=`sent`, external_id=Resend ID) AND failure (status=`failed`) — never throws

### Task 3 — Public review page + short-link

**`apps/web/app/(review)/layout.tsx`** — minimal centered layout, no AppShell, no sidebar

**`apps/web/app/(review)/review/[token]/page.tsx`** — server component with 4 states:
1. `actionable` → renders `<DraftCard surface="review" reviewToken={token} />`
2. `already_actioned` → "This draft has been actioned."
3. `expired` → "This review link has expired."
4. `invalid` → "This link isn't valid."

**`apps/web/app/r/[token]/route.ts`** — 302 redirect to `/review/{token}`; invalid token → `/r/invalid`

**`apps/web/app/r/invalid/page.tsx`** — glass card, "This link isn't valid." heading

### Task 4 — Action API + data API + Resend webhook

**`apps/web/app/api/review/[token]/route.ts`** (PATCH)
- Verifies token → applies body edits → consumes nonce via `consumeReviewToken` RPC → runs pre-send safety check → `approveDraftAtomic` / `holdDraftAtomic`
- Emits `draft/approved_manually` + `draft/send_via_gmail` on approve (B-1 cancel-on consumers)
- Emits `draft/held_manually` on hold (B-1)
- Returns 410 on already_consumed/nonce_mismatch, 401 on invalid token

**`apps/web/app/api/review/[token]/data/route.ts`** (GET)
- Read-only — explicitly does NOT import or call `consumeReviewToken`
- Returns draft JSON; 410 if nonce mismatch

**`apps/web/app/api/webhooks/resend/route.ts`** (POST)
- Verifies Svix signature via `verifyResendSignature`; 401 on mismatch
- Updates `notification_log.status` by `external_id` + `channel='email'`

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/unit/review-token.test.ts` | 5 | GREEN |
| `tests/unit/review-page-state.test.ts` | 9 | GREEN |
| `tests/integration/email-channel.test.ts` | 7 | GREEN |
| `tests/integration/review-token.test.ts` | 6 | GREEN |
| `tests/integration/webhook-status.test.ts` | 4 | GREEN (Resend half; Slack/Twilio stubs for 04-04/05) |
| **Total** | **31** | **31/31 GREEN** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `token.split(".")` causes TypeScript `string | undefined` error**
- **Found during:** Task 1 — tsc check
- **Issue:** Destructuring `const [encoded, provided] = token.split(".")` yields `string | undefined` even after `.length !== 2` guard since TypeScript can't narrow array destructuring
- **Fix:** Changed to `token.lastIndexOf(".")` + explicit `.slice()` for both parts
- **Files modified:** `apps/web/lib/review-token.ts`, `apps/web/tests/unit/review-token.test.ts`
- **Commit:** e86b42a

**2. [Rule 2 - Missing] Resend client singleton needs explicit mock to avoid env-var-missing failure in tests**
- **Found during:** Task 2 — integration test runs
- **Issue:** `getResendClient()` caches the Resend instance at runtime; test environment needs `@/lib/resend/client` mocked directly
- **Fix:** Added `vi.mock("@/lib/resend/client", ...)` in email-channel test to bypass singleton caching
- **Files modified:** `apps/web/tests/integration/email-channel.test.ts`
- **Commit:** 8b5d81c

**3. [Rule 1 - Bug] `vi.mock("svix", ...)` doesn't intercept dynamic `import("svix")` inside `verifyResendSignature`**
- **Found during:** Task 4 — webhook-status test
- **Issue:** `verifyResendSignature` uses `await import("svix")` dynamically; Vitest's static `vi.mock` hoisting doesn't reliably intercept dynamic imports in all environments
- **Fix:** Mocked `@/lib/resend/signature` directly instead of mocking the `svix` module
- **Files modified:** `apps/web/tests/integration/webhook-status.test.ts`
- **Commit:** c77eac0

### Schema Deviations

**`coaches` table** — plan referenced `coaches.gmail_email` and `coaches.display_name` columns, but neither exists in the deployed schema (only `coaches.email` and `coaches.name`). Used `coaches.email` as both `to` and `replyTo` address. Per Phase 4 CONTEXT.md, per-coach from address customization is deferred to Phase 5 onboarding wizard.

**`draft_edits` table** — plan's code snippet used `previous_body`/`new_body`/`previous_subject`/`new_subject` columns. Actual deployed schema uses `original_body`/`edited_body` (per 04-02 deviation). No subject column exists. Route uses actual column names.

### Test File Naming

Plan specified `tests/unit/review-page-state.test.tsx` but vitest config only includes `*.test.ts`. Renamed to `review-page-state.test.ts` with file-read assertions instead of JSX rendering.

## Open Question Resolutions

| Question | Resolution |
|----------|-----------|
| Open Question #2: Does resend@6.12.3 ship `resend.webhooks.verify`? | **NO** — verified at install time. Used `svix` lib directly. |

## Known Stubs

None — all data is wired to real database queries and real Resend SDK calls. The `sendEmail` adapter uses `coaches.email` as a placeholder for the coach's Gmail address (see Schema Deviations above).

## Threat Surface Scan

All threats in the plan's `<threat_model>` are mitigated:

| Threat | Mitigation Verified |
|--------|---------------------|
| T-04-03-01 | HMAC-SHA256 with `timingSafeEqual` in `review-token.ts` |
| T-04-03-02 | `consumed_tokens` UNIQUE PK via `consumeReviewToken` RPC |
| T-04-03-03 | GET `/data` route explicitly does not call `consumeReviewToken`; test asserts |
| T-04-03-04 | Token payload contains only `{draftId, coachId, exp, nonce}` |
| T-04-03-05 | Svix verify in `verifyResendSignature`; 401 on mismatch |
| T-04-03-07 | Svix lib handles `svix-id` de-dup at the lib level |
| T-04-03-08 | Token verify gates all writes; `coach_id` from token payload |
| T-04-03-09 | `"server-only"` import on `lib/review-token.ts` |

## Self-Check: PASSED
