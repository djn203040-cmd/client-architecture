# Security Posture & Controls Register

> **Purpose of this document.** This is the canonical, version-controlled record
> of every security decision, control, and control-test in **The Client
> Architecture**. It exists so that — in the event of a breach, audit,
> regulatory inquiry, or coach-side due-diligence request — the operator can
> demonstrate the exact state of security at any point in time.
>
> This document is read-only history. Add new entries; never edit past ones.
> Each major audit appends a new "Audit history" row.

**Repository:** `github.com/djn203040-cmd/client-architecture`
**Product:** The Client Architecture — managed AI follow-up system for coaching businesses
**Operator:** Daniel (Sonorous Digital) — `djn203040@gmail.com`
**Document owner:** Daniel
**Last formal audit:** 2026-05-21 (Phase 6 / 06-02)
**Next scheduled audit:** Quarterly (next: 2026-08-21)

---

## Table of Contents

1. [What this product handles](#1-what-this-product-handles)
2. [Security principles (architectural decisions)](#2-security-principles-architectural-decisions)
3. [Controls register](#3-controls-register)
4. [Threat model](#4-threat-model)
5. [Audit history](#5-audit-history)
6. [Incident response](#6-incident-response)
7. [Evidence inventory](#7-evidence-inventory)
8. [Change log](#8-change-log)
9. [Sign-off](#9-sign-off)

---

## 1. What this product handles

### Data categories

| Category | Examples | Sensitivity |
|---------|----------|-------------|
| **Coach account data** | Name, email, business name, OAuth tokens | High — PII + access tokens |
| **Lead contact data** | Name, email, phone supplied by coach or webhook | High — third-party PII |
| **Voice corpus** | 10–15 real message examples per coach | High — may contain lead-side identifiers |
| **Call transcripts** | Fireflies / Zoom recordings | High — potentially sensitive client content |
| **Sequence state** | Drafts, send history, opens, clicks, bounces | Medium |
| **Audit log** | Who did what, when | High — integrity-critical |

### Data subjects

- **Coaches** (direct customers) — 5–10 at launch, scaling
- **Coaches' leads** — third parties whose data flows through the system; coach is the data controller, Sonorous is the processor

### Jurisdictional scope

Operator is based in Denmark (EU). GDPR + Danish data protection law apply by default. Coaches may serve clients globally; obligations vary per coach's jurisdiction.

---

## 2. Security principles (architectural decisions)

These decisions are **locked**. Re-opening any of them requires a documented review entry in [§8 Change log](#8-change-log).

| # | Decision | Locked since | Rationale |
|---|---------|--------------|-----------|
| **P-01** | All OAuth tokens stored in Supabase Vault, never in plaintext columns | Phase 1 | Defense-in-depth: even if RLS fails, tokens encrypted at rest |
| **P-02** | Row-Level Security `ENABLE` + `FORCE` on every public table, scoped by `coach_id = auth.uid()` | Phase 1 | Tenant isolation primary control |
| **P-03** | Service-role Supabase key is server-only; CI grep blocks any `NEXT_PUBLIC_*SERVICE_ROLE` | Phase 1 | Prevents service-role leak to browser bundles |
| **P-04** | AI calls (Anthropic) are server-only; API key never reaches client code | Phase 1 | Cost-attack and key-leak prevention |
| **P-05** | Every webhook receiver verifies signature **before** processing the body | Phase 3 | Spoofing prevention (T-06-02-01) |
| **P-06** | Every API boundary input validated with Zod | Phase 1 | Input validation as a contract, not an afterthought |
| **P-07** | TypeScript strict mode, `noUncheckedIndexedAccess`, no `any` | Phase 1 | Type-level prevention of whole bug classes |
| **P-08** | Components under 200 lines; server components by default | Phase 1 | Smaller blast radius per vulnerability |
| **P-09** | Admin route (`/admin`) gated by email match **and** role flag (defense-in-depth) | Phase 1 | T-1-04 |
| **P-10** | All outbound channels (Gmail, Slack, Twilio) over HTTPS only; no `http://` allowed | Phase 3 | Transit encryption |
| **P-11** | PII redacted before egress to Sentry / Vercel logs / Inngest events | Phase 6 / 06-02 | GDPR data minimization at logging boundary |
| **P-12** | GDPR rights served programmatically (export + delete endpoints) | Phase 6 / 06-02 | Article 15 + 17 compliance |
| **P-13** | Every FK referencing `coaches(id)` must use `ON DELETE CASCADE` (asserted in migration) | Phase 6 / 06-02 | Deletion completeness — no orphan rows after account delete |
| **P-14** | Voice corpus (Layer 2 examples) encrypted in Vault, not stored as JSONB plaintext | Phase 6 / 06-02 | Sensitive content treated as a secret |
| **P-15** | No GPL / AGPL in production dependencies | Phase 6 / 06-02 | Avoids copyleft contamination of managed-service code |

---

## 3. Controls register

Controls are grouped by NIST CSF function. Each control lists the artefact, the test, and a brief rationale.

### 3.1 Identify

| Control ID | Description | Artefact | Test |
|-----------|-------------|----------|------|
| ID-01 | Asset inventory: every table in `public.*` is documented | `supabase/migrations/*` + `apps/web/tests/security/rls-pen-test.test.ts` `EXPECTED_TABLES` constant | Test fails if a new table lacks an entry |
| ID-02 | Sub-processor inventory maintained | `docs/privacy-policy.md` § Sub-processors | Quarterly review |
| ID-03 | Webhook source registry — all 14 providers documented | `apps/web/lib/security/README.md` | `webhook-signatures.test.ts` registry-sanity test |

### 3.2 Protect

| Control ID | Description | Artefact | Test |
|-----------|-------------|----------|------|
| PR-01 | OAuth tokens in Supabase Vault | `supabase/migrations/20260505000005_vault.sql` + `20260521000001` | `tests/security/vault-tokens.test.ts` (6 cases) |
| PR-02 | Voice corpus encrypted via Vault RPCs | `supabase/migrations/20260521000001` `private.store_voice_corpus` | `vault-tokens.test.ts` corpus RPC assertions |
| PR-03 | RLS enabled + coach-scoped on every public table | `20260505000004_rls.sql` + DO-block assertions in `20260521000001` | `rls-pen-test.test.ts` (7 cases) |
| PR-04 | Per-request CSP nonce + 6 security headers on every response | `apps/web/lib/security/csp.ts` + `middleware.ts` | `headers.test.ts` (7 cases) |
| PR-05 | Session cookies forced `HttpOnly + Secure + SameSite=lax` | `middleware.ts` `setAll()` cookie override | Manual + future Playwright e2e |
| PR-06 | Open-redirect guard for `?redirect=` params | `apps/web/lib/security/safe-redirect.ts` | `headers.test.ts` (2 cases) |
| PR-07 | Webhook signatures verified for all 14 providers | `apps/web/lib/security/verify-gmail-pubsub.ts`, `slack/signature.ts`, `twilio/signature.ts`, `resend/signature.ts`, `calendar/*` | `webhook-signatures.test.ts` (11 cases) |
| PR-08 | Rate limits on auth, drafts, review tokens, unsubscribe, health, GDPR export | `apps/web/lib/security/ratelimit.ts` + per-route wiring | `rate-limit.test.ts` (5 cases) |
| PR-09 | PII redactor wired into Sentry beforeSend + app logger | `apps/web/lib/logging/redact.ts` + `sentry.client.config.ts` + `sentry.server.config.ts` | `pii-redaction.test.ts` (10 cases) |
| PR-10 | No `console.log` in production code | grep audit | CI grep check + `pii-redaction` test envelope |
| PR-11 | Admin route double-gated (email + role) | `middleware.ts` | Test in `tests/integration/admin-auth.test.ts` |
| PR-12 | Server-side type-to-confirm for account deletion | `apps/web/app/api/account/delete/route.ts` constant-time compare | Manual + future integration test |
| PR-13 | OAuth scopes minimised (`gmail.send`, `gmail.modify`, `gmail.readonly` — no `gmail.full`) | `apps/web/app/api/auth/gmail/route.ts` scopes | Manual review during OAuth app submission |

### 3.3 Detect

| Control ID | Description | Artefact | Test |
|-----------|-------------|----------|------|
| DE-01 | Gitleaks scan on every PR (working tree + history) | `.github/workflows/security.yml` `gitleaks` job + `.gitleaks.toml` | CI status check |
| DE-02 | pnpm audit on every PR; fails on high/critical | `.github/workflows/security.yml` `audit` job | CI status check |
| DE-03 | Client-bundle secret-leak grep on every build | `.github/workflows/security.yml` `bundle-secret-leak` job | CI status check |
| DE-04 | OWASP ZAP baseline scan weekly | `.github/workflows/security.yml` `zap-baseline` cron | Weekly run, issues filed automatically |
| DE-05 | Sentry error monitoring (PII-scrubbed) | `apps/web/sentry.*.config.ts` | Live in production once DSN provisioned |
| DE-06 | Health-check endpoint with dependency status | `apps/web/app/api/health/route.ts` | Uptime monitor watches this |
| DE-07 | Audit log table receives every administrative + GDPR action | `audit_log` table + `lib/audit/log.ts` | Integration test |

### 3.4 Respond

| Control ID | Description | Artefact |
|-----------|-------------|----------|
| RS-01 | Runbook for coach-reported unauthorized access | `docs/runbooks/coach-unauthorized-access.md` |
| RS-02 | Runbook for API key leak | `docs/runbooks/key-leak.md` |
| RS-03 | Runbook for Supabase project compromise | `docs/runbooks/supabase-compromise.md` |
| RS-04 | Runbook for OAuth app suspension | `docs/runbooks/oauth-app-suspension.md` |
| RS-05 | Vulnerability disclosure policy | `SECURITY.md` |
| RS-06 | Key rotation procedure (per provider) | `SECURITY.md` § Key rotation runbook |

### 3.5 Recover

| Control ID | Description | Artefact |
|-----------|-------------|----------|
| RC-01 | Supabase Point-in-Time Recovery enabled | Supabase dashboard configuration |
| RC-02 | GDPR export endpoint (data portability) | `apps/web/app/api/account/export/route.ts` |
| RC-03 | GDPR delete endpoint with cascade audit | `apps/web/app/api/account/delete/route.ts` + migration `20260521000001` |
| RC-04 | DPA template ready to countersign | `docs/dpa-template.md` |

---

## 4. Threat model

Maintained alongside `06-02-security-hardening-PLAN.md` § `<threat_model>`. Summary:

| Threat ID | Category (STRIDE) | Component | Mitigation | Test |
|----------|-------------------|-----------|------------|------|
| T-06-02-01 | Spoofing | Forged Calendly/Slack/Gmail webhook | HMAC/JWT signature + 5-min replay window | `webhook-signatures.test.ts` |
| T-06-02-02 | Tampering | Cross-tenant write via direct Supabase client | RLS + pen-test asserts 0 affected rows | `rls-pen-test.test.ts` |
| T-06-02-03 | Repudiation | Daniel revokes coach; coach claims access continued | `audit_log` records action + actor + timestamp | Integration test |
| T-06-02-04 | Information Disclosure | OAuth tokens leaked via SQL injection or RLS bypass | Vault-only storage; pen-test asserts no plaintext columns | `vault-tokens.test.ts` |
| T-06-02-05 | Information Disclosure | PII in Sentry / Vercel logs | Redactor + Sentry beforeSend | `pii-redaction.test.ts` |
| T-06-02-06 | DoS | Anthropic cost runaway via `/api/drafts/generate` | Per-coach rate limit (20/hour) | `rate-limit.test.ts` |
| T-06-02-07 | DoS | Webhook flood from compromised provider | Per-source-IP rate limit on `/api/webhooks/*` | Limiter defined; wiring tracked |
| T-06-02-08 | Elevation of Privilege | Non-admin reaches `/admin` via crafted JWT | Middleware double-gates by email + role | `tests/integration/admin-auth.test.ts` |
| T-06-02-09 | Information Disclosure | Secret committed to git history | Gitleaks history scan + rotation procedure | `.github/workflows/security.yml` |
| T-06-02-10 | Tampering | Open redirect via `?redirect=` param | `safe-redirect.ts` allowlist | `headers.test.ts` |

---

## 5. Audit history

Each formal audit appends one row. Never edit past rows.

| Date | Type | Reviewer | Scope | Result | Report |
|------|------|----------|-------|--------|--------|
| **2026-05-21** | Phase 6 / 06-02 — Comprehensive security hardening | Claude (Anthropic) per `security-review` skill | Full codebase | ✅ **PASS** — 0 unaddressed HIGH or CRITICAL; 48/48 security tests passing; 0 high/critical CVEs | [`.planning/phases/06-testing/SECURITY-REVIEW.md`](../.planning/phases/06-testing/SECURITY-REVIEW.md) + [`06-02-SUMMARY.md`](../.planning/phases/06-testing/06-02-SUMMARY.md) |

### Audit summary 2026-05-21

**What was found:**
- 3 HIGH-severity issues — all fixed in this audit
- 4 MEDIUM defense-in-depth gaps — all fixed
- 6 LOW/INFO items — 2 fixed, 4 deferred with documented rationale
- 14 dependency CVEs — reduced to 0 via Next.js bump + pnpm overrides

**Key changes shipped:**
1. Gmail Pub/Sub now requires Google-signed JWT verification (`lib/security/verify-gmail-pubsub.ts`)
2. Per-request CSP nonce + 6 browser security headers on every response
3. Voice corpus moved to Supabase Vault (`private.store_voice_corpus` RPC)
4. GDPR `/api/account/export` + `/api/account/delete` endpoints
5. PII redactor wired into Sentry and app logger
6. Cascade-delete safety asserted in migration (`20260521000001`)
7. Rate limiters defined for 9 route groups; wired on the highest-risk 5
8. CI gates: gitleaks, pnpm audit, bundle-secret-leak, security-tests, weekly ZAP
9. Dependabot configured for weekly dependency PRs
10. SECURITY.md + privacy policy + ToS + 4 runbooks + DPA template

**Deferred (with rationale):**
- Wire rate-limiters on remaining `/api/auth/*` and `/api/webhooks/*` routes (Vercel platform limit covers gap)
- MS Bookings / Setmore / TidyCal HMAC (providers don't publish a scheme; per-coach shared-secret token used)
- Monthly Anthropic spend cap (hourly limit blocks the acute scenario)
- Sentry SDK install (scaffolds + scrubber ready; one-PR action)
- ESLint `no-console: error` promotion (zero `console.log` already verified)

---

## 6. Incident response

**Who you call:**
1. Daniel (operator) — primary on-call
2. Second person (TBD as the team grows)

**Severity classification:**

| Severity | Definition | Acknowledgement SLA | Fix SLA |
|---------|-----------|---------------------|---------|
| Critical | Data exfiltration confirmed, or service-role key compromised | 1 hour | 24 hours |
| High | Single-coach compromise, exploitable vuln in prod | 4 hours | 7 days |
| Medium | Defense-in-depth gap, no active exploitation | 24 hours | 30 days |
| Low | Hardening opportunity, info disclosure of non-PII | 7 days | best effort |

**Runbooks (always run the runbook, not improvise):**
- `docs/runbooks/coach-unauthorized-access.md`
- `docs/runbooks/key-leak.md`
- `docs/runbooks/supabase-compromise.md`
- `docs/runbooks/oauth-app-suspension.md`

**Regulatory notification deadlines:**
- GDPR Article 33: supervisory authority within **72 hours** of becoming aware
- Data subject notification: "without undue delay" if risk to rights/freedoms is more than low

---

## 7. Evidence inventory

If you need to prove a control was in place at a given moment, this is where to look:

| Evidence type | Location | Retention |
|---------------|----------|-----------|
| Source code state | Git history at `github.com/djn203040-cmd/client-architecture` | Permanent |
| CI test results | GitHub Actions runs | 90 days default; archive critical ones |
| Audit log (admin actions) | `audit_log` table | 24 months active; cold storage after |
| Sentry error events | Sentry dashboard | 90 days |
| Vercel access logs | Vercel dashboard | 30 days |
| Supabase auth events | `auth.audit_log_entries` | Per Supabase retention policy |
| Dependency vulnerability history | GitHub Dependabot alerts | Permanent in repo |
| This document's history | Git `log docs/SECURITY-POSTURE.md` | Permanent |

---

## 8. Change log

Append-only. Each entry: ISO date, author, one-line summary.

| Date | Author | Change |
|------|--------|--------|
| 2026-05-21 | Daniel (via Claude 06-02 execution) | Initial document — captures state after Phase 6 / 06-02 security hardening |

---

## 9. Sign-off

Each formal audit appends a sign-off row. Signature is the GitHub username (verifiable via the commit history).

| Audit | Reviewer | Approver (operator) | Date | Status |
|-------|----------|---------------------|------|--------|
| 06-02 — Security hardening | `claude` (via `security-review` skill) | `djn203040-cmd` (Daniel) | 2026-05-21 | ✅ Approved |

---

## Document maintenance

- **Update cadence:** after every formal audit; after any incident; whenever a P-XX principle is added or modified.
- **Owner:** Daniel.
- **Verification:** quarterly read-through to catch drift between this document and the actual system. Quarterly review note added to § Change log.
- **Visibility:** this file is tracked in Git. The repository is private to authorised personnel only; deliberate disclosure (to a coach during due diligence, to a regulator) is the operator's decision per request.

---

*The Client Architecture — operated by Sonorous Digital — The Modern Architect's Office.*
