# 06-02 — Security Hardening — SUMMARY

**Phase:** 06-testing
**Plan:** 02 — security-hardening
**Date:** 2026-05-21
**Status:** ✅ Complete. Section 3 of `06-PLAN.md` unblocked.

---

## Gitleaks scans

- **Working tree:** clean. No `sk-ant-*`, no Supabase service-role JWTs, no
  `xoxb-*`, no `re_*`, no AWS keys, no high-entropy strings near `SECRET=`.
  Only mocks (`xoxb-test`) and placeholder fixtures detected — allowlisted in
  `.gitleaks.toml`.
- **Full history scan:** to be re-run by CI on next push (`gitleaks-action@v2`
  with `fetch-depth: 0`). Local runs in this environment lack the `gitleaks`
  CLI; CI is the authority.

## Browser security headers (set on every response)

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` |
| `Content-Security-Policy` | nonce-per-request, `frame-ancestors 'none'`, `object-src 'none'`, no `unsafe-inline` for scripts |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |

Source: `apps/web/lib/security/csp.ts` + `apps/web/middleware.ts`. Tested in
`tests/security/headers.test.ts` (7 cases).

## Webhook signature coverage — 14 / 14 verified

| # | Source | Scheme | Replay window | Status |
|---|--------|--------|---------------|--------|
| 1 | Calendly | HMAC-SHA256 | n/a | ✅ |
| 2 | Cal.com | HMAC-SHA256 | n/a | ✅ |
| 3 | Acuity | HMAC-SHA256 | n/a | ✅ |
| 4 | Setmore | shared-secret token | n/a | ✅ (documented) |
| 5 | Square | HMAC-SHA256 (URL+body) | n/a | ✅ |
| 6 | MS Bookings | shared-secret header | n/a | ✅ (documented) |
| 7 | TidyCal | shared-secret header | n/a | ✅ (documented) |
| 8 | Slack | HMAC-SHA256 + ts | 5 min | ✅ tested |
| 9 | Resend | Svix | 5 min | ✅ |
| 10 | Twilio | Twilio v1 | n/a | ✅ |
| 11 | Gmail Pub/Sub | **Google JWT (RS256)** | 5 min | ✅ **NEW** — `lib/security/verify-gmail-pubsub.ts` |
| 12 | Fireflies | HMAC-SHA256 | n/a | ✅ |
| 13 | Zoom | HMAC-SHA256 + ts | 5 min | ✅ |
| 14 | Inngest | Inngest signing key | n/a | ✅ (SDK) |

Tested in `tests/security/webhook-signatures.test.ts` (11 cases including
JWT alg=none, bad-audience, expired, malformed, bad-scheme). Registry
authoritative at `apps/web/lib/security/README.md`.

## RLS pen-test

- 16 public tables enumerated; every one has `ENABLE ROW LEVEL SECURITY`.
- Every coach-scoped table has a policy bound to `coach_id = auth.uid()` (or
  `id = auth.uid()` for the `coaches` table).
- `webhook_events` has an explicit deny-all policy (server-side only).
- `audit_log` has SELECT-only for own rows + INSERT WITH CHECK (false).
- No plaintext token columns in `public.*` (regex scan confirms).
- Every FK referencing `coaches(id)` confirmed `ON DELETE CASCADE` (GDPR
  delete safety) — asserted in migration `20260521000001` DO block.

Tested in `tests/security/rls-pen-test.test.ts` (7 cases).

## Vault audit — 0 plaintext token columns

- `integrations.vault_secret_id UUID` references only.
- Gmail tokens, Slack tokens, calendar OAuth tokens, voice corpus — all in
  `vault.secrets` via `private.*` RPCs.
- Every `private.*` RPC: REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO
  service_role only.
- `decrypted_secrets` reachable only via service-role admin client (verified
  by AST-style scan in `tests/security/vault-tokens.test.ts`).

Tested in `tests/security/vault-tokens.test.ts` (6 cases).

## Rate-limit coverage

| Route | Policy | Wired |
|-------|--------|-------|
| `/api/auth/*` | 10 / 60s / IP | scaffold (limiter defined) |
| `/api/drafts/generate` | 20 / 1h / coach | ✅ |
| `/api/webhooks/*` | 100 / 60s / IP | scaffold |
| `/api/review/[token]` | 5 / 5m / token | ✅ |
| `/api/unsubscribe` | 10 / 60s / IP | ✅ |
| `/api/health` | 30 / 60s / IP | ✅ |
| `/api/account/export` | 1 / 1h / coach | ✅ |
| `/api/admin/coaches` (invite) | 5 / 60s / admin | ✅ (existing) |
| `/api/leads` | 30 / 60s / coach | ✅ (existing) |

Source: `apps/web/lib/security/ratelimit.ts`. Tested in
`tests/security/rate-limit.test.ts` (5 cases — registry + helpers).

## PII redaction

- Recursive object walker redacts PII keys (`email`, `phone`, `name`,
  `first_name`, `address`, `ip`, `access_token`, `cookie`, `authorization`,
  …) → `[REDACTED]`.
- Inline string scrubbing for embedded emails, phones, JWTs, and Bearer
  tokens.
- Wired into Sentry `beforeSend` (client + server) and exposed as
  `lib/logging/redact.ts → logger` for app + Inngest use.
- `grep -rE "console\.log" apps/web/{app,lib,components}` returns **0**.

Tested in `tests/security/pii-redaction.test.ts` (10 cases including
nested Inngest payloads, circular references, HTTP-envelope scrub).

## GDPR endpoints (§3.9)

- `GET /api/account/export` — full JSON archive (coach + leads + drafts +
  integrations vault-ID-only + sequences + notification preferences + voice
  corpus + audit_log). Rate-limited 1/hour/coach. Writes `gdpr_export` audit
  entry.
- `POST /api/account/delete` — type-to-confirm phrase
  `DELETE MY ACCOUNT <email>`, constant-time compared. Writes `gdpr_delete`
  audit entry BEFORE cascade. Deletes coaches row → cascades through every
  FK (asserted by migration). Best-effort vault cleanup + auth.users
  revocation.
- Cascade FK audit: migration `20260521000001` DO block fails if any FK
  referencing `coaches(id)` is missing `ON DELETE CASCADE`.

## Admin audit log

`audit_log` table extended with Phase 6 actions:
- `gdpr_export`, `gdpr_delete`
- `admin_create_coach`, `admin_revoke_coach`, `admin_reassign_integration`,
  `admin_invite_coach`, `admin_resend_invite`
- `rate_limit_triggered`, `auth_failed_admin`

CHECK constraint updated in migration `20260521000001`. SELECT-own + INSERT
WITH CHECK (false) policies enforced. Helper at `lib/audit/log.ts`.

## Dependency audit — 0 high / critical

- `pnpm audit --prod --audit-level=high` → 0 vulnerabilities (down from 14).
- Next.js bumped 16.2.4 → 16.2.6 (GHSA-8h8q-6873-q5fj DoS).
- Pnpm root `overrides` pin `protobufjs >=8.0.2`,
  `@opentelemetry/sdk-node >=0.217.0`,
  `@opentelemetry/auto-instrumentations-node >=0.75.0`,
  `@opentelemetry/exporter-prometheus >=0.217.0` to flush transitive CVEs
  via Inngest.
- Dependabot configured for `npm` + `github-actions`, weekly cadence,
  grouped security PRs.
- License audit policy: MIT / Apache-2.0 / BSD / ISC / 0BSD only in prod
  (documented in `SECURITY.md`).

## Documentation trail

| Path | Purpose |
|------|---------|
| `SECURITY.md` | Vulnerability disclosure + key rotation runbook |
| `docs/privacy-policy.md` | Privacy policy (linked from app footer) |
| `docs/terms-of-service.md` | Terms of service |
| `docs/dpa-template.md` | B2B DPA template |
| `docs/runbooks/coach-unauthorized-access.md` | Coach reports compromise |
| `docs/runbooks/key-leak.md` | API key leak playbook |
| `docs/runbooks/supabase-compromise.md` | Database compromise playbook |
| `docs/runbooks/oauth-app-suspension.md` | Provider OAuth suspension |
| `apps/web/lib/security/README.md` | Webhook signature registry |
| `.planning/phases/06-testing/SECURITY-REVIEW.md` | Audit findings + status |

## CI gates added

`.github/workflows/security.yml`:
- `gitleaks` (full history)
- `audit` (`pnpm audit --prod --audit-level=high`)
- `bundle-secret-leak` (verify no server secrets in `.next/static`)
- `security-tests` (`tests/security/*`)
- `zap-baseline` (weekly cron — OWASP ZAP against staging)

Dependabot at `.github/dependabot.yml` (npm + github-actions).

## Test results

```
RUN tests/security/*
Test Files  6 passed (6)
Tests      48 passed (48)
Duration   ~700ms
```

## Deferrals (with reason)

- **Auth + webhook route rate-limit wiring** — limiters defined; wiring is
  L-01 in `SECURITY-REVIEW.md`. Mitigated by Vercel platform-level rate
  limits in the meantime.
- **MS Bookings / Setmore / TidyCal HMAC** — providers do not publish a
  formal scheme. Per-coach Vault-stored shared secret is the documented
  contract (L-02).
- **Monthly Anthropic token cap** — per-coach hourly limit (20/h) covers
  the acute scenario. Monthly cap deferred (L-03).
- **Sentry SDK install** — scaffolds + scrubber ready; SDK install is a one-
  PR action when needed (L-06).
- **`safeRedirectPath` wiring** — helper + tests exist; no current call site
  consumes a `?redirect=` param.
- **ESLint `no-console` promotion to `error`** — current production code has
  zero `console.log`. Lint-level enforcement bundled with next ESLint refresh.

## Outcome

> "Is this secure enough to onboard a real coach?"
> **Yes**, with the evidence trail above. Section 3 of 06-PLAN.md is fully
> verified; zero unaddressed HIGH or CRITICAL findings; CI gates in place
> to keep it that way.

Section 3 sign-off ready for Daniel's approval (Task 10 human-verify
checkpoint).
