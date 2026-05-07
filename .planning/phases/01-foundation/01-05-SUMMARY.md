---
phase: 01-foundation
plan: 05
subsystem: gmail-oauth
tags: [gmail, oauth, vault, googleapis, vitest, playwright, security]

# Dependency graph
requires:
  - phase: 01-01
    provides: monorepo + apps/web vitest config + Playwright config
  - phase: 01-02
    provides: private.store_gmail_tokens + private.get_gmail_tokens RPCs + integrations table + vault_secret_id column
  - phase: 01-03
    provides: auth session (createClient server) + middleware auth gate

provides:
  - apps/web/lib/gmail/auth.ts — OAuth2 client factory + buildAuthorizeUrl
  - apps/web/lib/gmail/scope-validation.ts — validateGmailScopes + parseScopeString
  - apps/web/lib/gmail/error-handler.ts — isInvalidGrantError + handleInvalidGrant + OAuthInvalidGrantError
  - apps/web/lib/gmail/client.ts — getGmailClientForCoach with tokens event refresh + invalid_grant proxy
  - /api/auth/gmail/authorize GET route — authenticated → Google consent, unauthenticated → /login
  - /api/auth/gmail/callback GET route — 4-step OAuth pipeline into Vault + integrations row
  - Unit tests: scope-validation (4 assertions), invalid-grant (6 assertions)
  - Integration tests: gmail-oauth + vault-storage (skipIf-gated for live DB)
  - E2E test: gmail-connect.spec.ts (1 live test + 2 fixme stubs)
  - .planning/HEALTH-008-OAUTH-REVIEW.md — operator tracking doc for GCP project setup

affects:
  - Plan 06 (coach dashboard health card) — reads integrations.status + vault_secret_id set here
  - Plan 07 (admin dashboard) — integration health visible after this plan connects Gmail
  - Phase 3 (Inngest sequences) — getGmailClientForCoach used in every email-send step

# Tech tracking
tech-stack:
  added:
    - googleapis (OAuth2 client, gmail.send/readonly/modify scopes)
  patterns:
    - "OAuth flow: access_type=offline + prompt=consent enforced at buildAuthorizeUrl — never omit prompt=consent"
    - "Vault-first: tokens persisted to private.store_gmail_tokens BEFORE integrations status updated"
    - "invalid_grant is terminal: marks integration disconnected + pauses all active sequences + inserts notification_log placeholder"
    - "Token auto-refresh: oauth2Client.on('tokens', ...) merges new tokens into Vault on every expiry cycle"
    - "Type deviation: private schema RPCs DO appear in generated types (packages/database/src/types.ts) — @ts-expect-error NOT needed (INFRA-003 pattern confirmed)"

key-files:
  created:
    - apps/web/lib/gmail/auth.ts
    - apps/web/lib/gmail/scope-validation.ts
    - apps/web/lib/gmail/error-handler.ts
    - apps/web/lib/gmail/client.ts
    - apps/web/app/api/auth/gmail/authorize/route.ts
    - apps/web/app/api/auth/gmail/callback/route.ts
    - .planning/HEALTH-008-OAUTH-REVIEW.md
  modified:
    - apps/web/tests/unit/scope-validation.test.ts
    - apps/web/tests/unit/invalid-grant.test.ts
    - apps/web/tests/integration/gmail-oauth.test.ts
    - apps/web/tests/integration/vault-storage.test.ts
    - apps/web/tests/e2e/gmail-connect.spec.ts

key-decisions:
  - "private schema RPCs appear in generated types — @ts-expect-error directives removed; cleaner than plan's template code"
  - "tokens type: import('googleapis').Auth.Credentials used for callback route type annotation"
  - "Integration test skipIf guard: URL stub check + SERVICE_ROLE JWT shape check (pattern from 01-02 SUMMARY deviation)"
  - "HEALTH-008 tracking doc created as pending_submission — non-blocking checkpoint, Daniel acts independently"

# Metrics
duration: ~5min
completed: 2026-05-07
---

# Phase 1 Plan 05: Gmail OAuth Pipeline Summary

**Full Gmail OAuth 2.0 pipeline: coach authorizes via Google consent, tokens land in Supabase Vault, scopes validated before connection, invalid_grant is a terminal event that disconnects the integration and pauses sequences**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-05-07
- **Tasks:** 3 of 3 (Task 3 non-blocking)
- **Files modified/created:** 12

## Accomplishments

### OAuth Pipeline

- `lib/gmail/auth.ts`: `createOAuth2Client()` + `buildAuthorizeUrl(coachId)` — enforces `access_type: "offline"` and `prompt: "consent"` (GMAIL-002, Pitfall 2)
- `lib/gmail/scope-validation.ts`: `validateGmailScopes(grantedScopes)` returning `{ ok, missing, granted }` — used in callback before marking connected (HEALTH-007)
- `lib/gmail/error-handler.ts`: `isInvalidGrantError()` (3 detection paths: code, response.data.error, message substring), `handleInvalidGrant(coachId)` (3 DB operations), `OAuthInvalidGrantError` typed class (HEALTH-004)
- `lib/gmail/client.ts`: `getGmailClientForCoach(coachId)` — fetches tokens from Vault via `private.get_gmail_tokens`, wires `oauth2Client.on("tokens", ...)` for auto-refresh persistence, wraps gmail client in Proxy that catches `invalid_grant` on any API call

### OAuth Routes

- `/api/auth/gmail/authorize`: unauthenticated → `/login`, authenticated → Google consent URL with all 3 scopes
- `/api/auth/gmail/callback`: 4-step contract:
  1. Exchange code → tokens (catch: `oauth_exchange_failed`)
  2. Check `tokens.refresh_token` present (catch: `oauth_no_refresh_token`)
  3. `validateGmailScopes(granted)` (catch: `insufficient_scopes`)
  4. `private.store_gmail_tokens` → Vault (catch: `oauth_vault_failed`)
  5. Update `integrations` row to `connected` with `vault_secret_id` + `scopes`

### Tests

| File | Type | Assertions | Status |
|------|------|-----------|--------|
| tests/unit/scope-validation.test.ts | Unit | 4 live | Passing |
| tests/unit/invalid-grant.test.ts | Unit | 6 live | Passing |
| tests/integration/gmail-oauth.test.ts | Integration | 1 (skipIf-gated) | Skips on CI |
| tests/integration/vault-storage.test.ts | Integration | 2 (skipIf-gated) | Skips on CI |
| tests/e2e/gmail-connect.spec.ts | E2E | 1 live + 2 fixme | Listed in Playwright |

### Operator Tracking

- `.planning/HEALTH-008-OAUTH-REVIEW.md`: step-by-step guide for Daniel to create the GCP project, configure the OAuth consent screen, generate credentials, add test users, and submit for brand + sensitive scope verification. **Status: pending_submission.**

## Callback 4-Step Contract

```
GET /api/auth/gmail/callback?code={code}&state={coachId}&scope={scopes}

1. oauth2Client.getToken(code)  → tokens
   └─ fail → redirect /settings?error=oauth_exchange_failed
2. tokens.refresh_token present?
   └─ missing → redirect /settings?error=oauth_no_refresh_token
3. validateGmailScopes(parseScopeString(scope))
   └─ under-scoped → redirect /settings?error=insufficient_scopes&missing=...
4. adminClient.schema("private").rpc("store_gmail_tokens", { p_coach_id, p_tokens })
   └─ fail → redirect /settings?error=oauth_vault_failed
5. adminClient.from("integrations").update({ status: "connected", vault_secret_id, scopes })
   └─ redirect /settings?connected=gmail
```

## invalid_grant Handler Behavior

When `isInvalidGrantError(e)` returns true during any Gmail API call:
1. `integrations` row: `status = "disconnected"`, `error_message = "OAuth revoked — reconnect required"`
2. `sequences` rows: `status = "paused"` for all `status = "active"` rows for this coach
3. `notification_log` INSERT: `channel = "email"`, `event_type = "oauth_disconnected"`, `status = "pending"` (Phase 4 sends actual notification)
4. Throws `OAuthInvalidGrantError` — callers MUST NOT retry

## Outstanding: HEALTH-008

Google OAuth app verification submission is pending Daniel's action. See `.planning/HEALTH-008-OAUTH-REVIEW.md`.

**Phase 3 hard blocker:** OAuth app must exit Testing mode before sequences deploy. Testing mode refresh tokens expire after 7 days.

## Task Commits

1. `a9f522e` feat(01-05): task 1 — OAuth2 factory + scope validation + invalid_grant handler + unit tests
2. `a26a983` feat(01-05): task 2 — Gmail OAuth authorize + callback routes + integration + e2e tests
3. `0d22945` chore(01-05): task 3 — HEALTH-008 OAuth verification tracking doc (non-blocking)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unnecessary @ts-expect-error directives**
- **Found during:** Task 1 + Task 2 (type-check)
- **Issue:** Plan template code included `@ts-expect-error: private schema not in generated types (INFRA-003)` comments on private RPC calls. However, the generated `packages/database/src/types.ts` (from Plan 02) DOES include `private.Functions` with correct `get_gmail_tokens` and `store_gmail_tokens` signatures. The `@ts-expect-error` directives caused type-check to fail with "Unused '@ts-expect-error' directive."
- **Fix:** Removed `@ts-expect-error` from `lib/gmail/client.ts` (2 removals) and integration test files (2 removals). The code is fully typed without them.
- **Files modified:** lib/gmail/client.ts, tests/integration/gmail-oauth.test.ts, tests/integration/vault-storage.test.ts
- **Committed in:** a9f522e + a26a983

**2. [Rule 1 - Bug] Fixed tokens type annotation in callback route**
- **Found during:** Task 2 (type-check)
- **Issue:** Plan used `Awaited<ReturnType<...>>["tokens"]` type extraction pattern that TypeScript could not resolve due to `void` return type in the generic chain
- **Fix:** Used `import("googleapis").Auth.Credentials` directly — the correct googleapis type for the `tokens` property
- **Files modified:** apps/web/app/api/auth/gmail/callback/route.ts
- **Committed in:** a26a983

---

**Total deviations:** 2 auto-fixed bugs. No scope creep.

## Known Stubs

None — all implementation files contain full business logic. Integration tests skip when no live DB is present (by design, not stubs).

## Threat Flags

No new threat surface beyond the plan's threat model. The callback validates `state` (coachId) against the integrations upsert — the TODO for HMAC-signed state is documented in the plan's threat register (T-1-state-csrf: accept disposition). No new endpoints or auth paths introduced beyond `/api/auth/gmail/authorize` and `/api/auth/gmail/callback`.

## Self-Check: PASSED

- FOUND: apps/web/lib/gmail/auth.ts
- FOUND: apps/web/lib/gmail/scope-validation.ts
- FOUND: apps/web/lib/gmail/error-handler.ts
- FOUND: apps/web/lib/gmail/client.ts
- FOUND: apps/web/app/api/auth/gmail/authorize/route.ts
- FOUND: apps/web/app/api/auth/gmail/callback/route.ts
- FOUND: .planning/HEALTH-008-OAUTH-REVIEW.md
- FOUND commit a9f522e (Task 1 — feat)
- FOUND commit a26a983 (Task 2 — feat)
- FOUND commit 0d22945 (Task 3 — chore)
- TYPE-CHECK: PASS (pnpm type-check exits 0)
- UNIT TESTS: 36 passed (4 test files)
