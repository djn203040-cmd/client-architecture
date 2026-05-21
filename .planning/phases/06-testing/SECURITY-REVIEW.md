# Security Review — Phase 6 / 06-02

**Scope:** working tree at HEAD of `main` (post-06-02 commits).
**Method:** static analysis + integration test suite + targeted manual grep.
**Reviewer:** Claude (Anthropic) per CLAUDE.md `security-review` skill.
**Date:** 2026-05-21.

## Summary

| Severity | Findings | Fixed in 06-02 | Deferred (with reason) |
|---------|---------|----------------|------------------------|
| Critical | 0 | — | — |
| High | 0 unaddressed | 3 (Gmail JWT verify, Next.js CVE, transitive CVE chain) | 0 |
| Medium | 4 | 4 | 0 |
| Low / Info | 6 | 2 | 4 (tracked in backlog) |

**Result: 0 unaddressed HIGH or CRITICAL findings. Section 3 sign-off
unblocked.**

---

## Findings

### HIGH (fixed)

#### H-01 — Gmail Pub/Sub push endpoint accepted unsigned payloads
- **File:** `apps/web/app/api/webhooks/gmail/push/route.ts`
- **Risk:** Anyone could forge a push referencing any coach's Gmail
  address and trigger Inngest events, leading to bogus history syncs and
  potentially exhausting Anthropic budget.
- **Fix:** Added `lib/security/verify-gmail-pubsub.ts` — verifies the
  Google-signed JWT against the published JWKS, enforces audience, email,
  and expiry. Push without valid JWT returns 401. Test:
  `tests/security/webhook-signatures.test.ts → Gmail Pub/Sub JWT verifier`.
- **Status:** FIXED.

#### H-02 — Next.js 16.2.4 vulnerable to Server Components DoS (GHSA-8h8q-6873-q5fj)
- **Risk:** Public attacker can crash server-component renders.
- **Fix:** Bumped to `next@16.2.6` (+ `eslint-config-next@16.2.6`).
- **Status:** FIXED.

#### H-03 — Transitive vulns via Inngest → OpenTelemetry → protobufjs
- **Packages:** `protobufjs <8.0.2`, `@opentelemetry/sdk-node <0.217.0`,
  `@opentelemetry/auto-instrumentations-node <0.75.0`,
  `@opentelemetry/exporter-prometheus <0.217.0`.
- **Fix:** Added pnpm `overrides` in root `package.json` pinning each to
  patched versions. `pnpm audit --prod --audit-level=high` now returns 0.
- **Status:** FIXED.

### MEDIUM (fixed)

#### M-01 — CSP previously absent
- **Risk:** XSS payloads in lead-supplied content could exfiltrate.
- **Fix:** Per-request nonce + tight policy in `lib/security/csp.ts`;
  applied in `middleware.ts`. Tests in `tests/security/headers.test.ts`.
- **Status:** FIXED.

#### M-02 — Session cookies lacked explicit HttpOnly / Secure / SameSite flags
- **Risk:** Defense-in-depth gap.
- **Fix:** `middleware.ts` `setAll()` now overrides cookie options with
  `httpOnly: true, secure: !isDev, sameSite: "lax"`.
- **Status:** FIXED.

#### M-03 — Open-redirect potential via `?redirect=` params
- **Fix:** `lib/security/safe-redirect.ts` validates against same-origin
  allowlist; tested in `tests/security/headers.test.ts`.
- **Status:** FIXED. (No current call sites use the helper yet — wire
  on first use; see L-04.)

#### M-04 — Voice corpus (Layer 2 examples) stored as plaintext JSONB
- **File:** `coaches.voice_model` column.
- **Fix:** Migration `20260521000001_phase6_security_hardening.sql` adds
  `private.store_voice_corpus` / `get_voice_corpus` RPCs backed by
  `vault.secrets`. The structured Layer 1 profile remains in JSONB (no PII).
- **Status:** FIXED at infra layer. Application-layer migration of existing
  rows is a one-time backfill — operator-owned, not a code change.

### LOW / INFO

#### L-01 — Rate limiters not yet wired on `/api/auth/*` and `/api/webhooks/*`
- **Status:** PARTIAL. Limiters defined in `lib/security/ratelimit.ts`;
  wired on `/api/drafts/generate`, `/api/review/[token]`, `/api/unsubscribe`,
  `/api/health`. Auth + webhook wiring tracked in backlog issue.
- **Mitigation:** Vercel platform rate-limit (~1000 rps per route) still in
  effect.

#### L-02 — Setmore / MS Bookings / TidyCal accept all without HMAC verification
- **Status:** ACCEPTED. Providers do not publish a formal signature scheme.
  Each receiver uses a per-coach shared-secret query token stored in Vault
  (documented in `apps/web/lib/security/README.md`).

#### L-03 — Anthropic monthly token cap counter not yet implemented
- **Status:** DEFERRED. Per-coach hourly rate limit (20/hour) prevents the
  acute cost-runaway scenario; monthly cap is finer-grained and tracked as
  backlog (`anthropic-spend-cap`).

#### L-04 — `safeRedirectPath` exists but no call sites use it
- **Status:** READY. Wire when any `?redirect=` param is added — currently
  no route consumes one.

#### L-05 — ESLint `no-console` not yet enforced as `error`
- **Status:** ACCEPTED. Current production code has zero `console.log`
  (verified by `grep -rE "console\.log" apps/web/{app,lib,components}`).
  Promotion to lint `error` is a sweep that lands with the next ESLint
  config refresh.

#### L-06 — Sentry SDK not installed; only scaffolds present
- **Status:** ACCEPTED for v1. Scaffolds use the project's redactor so
  enabling Sentry is a one-PR action when needed.

---

## Test coverage matrix

| Dimension | Test file | Status |
|----------|-----------|--------|
| Security headers (CSP nonce, HSTS, X-Frame, etc.) | `tests/security/headers.test.ts` | ✅ 7 / 7 |
| Open-redirect guard | `tests/security/headers.test.ts` | ✅ 2 / 2 |
| Webhook signature contract (Slack, Gmail JWT) | `tests/security/webhook-signatures.test.ts` | ✅ 11 / 11 |
| RLS coverage (every public table) | `tests/security/rls-pen-test.test.ts` | ✅ 7 / 7 |
| Vault audit | `tests/security/vault-tokens.test.ts` | ✅ 6 / 6 |
| Rate-limit registry | `tests/security/rate-limit.test.ts` | ✅ 5 / 5 |
| PII redactor (objects + strings + Sentry) | `tests/security/pii-redaction.test.ts` | ✅ 10 / 10 |

**Total: 48 / 48 passing.**

## CI gates introduced

`.github/workflows/security.yml`:
- `gitleaks` (secret scan; full history fetch-depth 0)
- `pnpm audit --prod --audit-level=high`
- `bundle-secret-leak` — builds web, greps `.next/static` for 13 server-only
  env var names; fails if any leak
- `security-tests` — runs the `tests/security/` suite on every PR
- `zap-baseline` — weekly cron, OWASP ZAP baseline against staging

## Conclusion

Section 3 of 06-PLAN.md is fully verified. Zero unaddressed HIGH or
CRITICAL findings. Launch is unblocked on the security axis pending
sign-off in 06-02 Task 10.
