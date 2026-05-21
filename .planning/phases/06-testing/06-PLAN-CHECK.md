# Phase 6 — Plan Check

**Date:** 2026-05-21
**Verified by:** gsd-plan-checker (two iterations)
**Verdict:** **pass-with-fixes** (all fixes applied; remaining notes are non-blocking)

---

## Sub-plan inventory

| Plan | Title | Wave | Depends on | Type |
|------|-------|------|------------|------|
| 06-01 | Automated test suite + CI matrix | 1 | — | autonomous |
| 06-02 | Security hardening | 1 | — | not autonomous (human checkpoint) |
| 06-03 | Manual UAT prep + sign-off | 2 | 06-01, 06-02 | not autonomous |

Master checklist: `06-PLAN.md` (canonical source of truth for §1–§3 checkboxes).

---

## Iteration 1 — initial review

**5 BLOCKERS:**
1. 06-02 frontmatter `wave: 2` (should be 1 to match parallel claim) — **FIXED**
2. 06-01/06-02 write-overlap on `sentry.{client,server}.config.ts` and `.eslintrc.cjs` — **FIXED** (ownership split: 06-01 scaffold only, 06-02 owns beforeSend body and no-console rule)
3. §1.1 type-safety audit had no concrete task in 06-01 — **FIXED** (new Task 5.5: `scripts/audit-types.sh` + CI gate)
4. §3.9 GDPR endpoints (export + cascade delete) were only documented, not built — **FIXED** (new Task 6.5 in 06-02)
5. §3.2 voice corpus encryption not covered by Vault audit — **FIXED** (extended 06-02 Task 4 with step 3: pgsodium wrap for voice_models JSONB)

**4 WARNINGS:**
6. Must-haves lacked spec counts — **FIXED** (06-01 now says "17+ unit / 16+ integration / 17+ Playwright, one per bullet")
7. Dark-mode axe + reduced-motion missing — **FIXED** (06-01 Task 4: chromium-light + chromium-dark Playwright projects, reduced-motion spec)
8. Safari iOS / Chrome Android (§1.7) — **FIXED** (deferred to 06-03 §2.12 explicitly; documented in interfaces inheritance)
9. MFA enrollment marked auto but requires Daniel's phone — **FIXED** (06-02 verifies factor enabled + UI surface; Daniel's enrollment in 06-03 §2.8)

---

## Iteration 2 — re-verification

All 5 BLOCKERS confirmed resolved with verifiable artifacts. All 4 WARNINGS addressed.

**2 minor new notes (non-blocking):**

- **N1** — Task 6 human-verify checklist updated to include `pnpm audit:types`. **FIXED.**
- **N2** — Task 6.5 (GDPR) references audit helper from Task 7. Resolved by adding an explicit ordering note + step 0 fallback so Task 6.5 can build the helper inline if Task 7 has not run yet. **FIXED.**

**Final verdict:** **PASS.** Ready for execution.

---

## Exit criteria alignment

ROADMAP Phase 6 exit criteria → sub-plan artifact mapping:

| Exit criterion | Artifact |
|---|---|
| CI green on `main` | 06-01 Task 5 (`.github/workflows/test.yml`) + Task 5.5 (type-audit) + Task 6 (human-verify) |
| Daniel personally completed §2 UAT and signed off | 06-03 Task 5 + `LAUNCH-SIGN-OFF.md` |
| Zero gitleaks findings | 06-02 Task 1 + CI gate |
| Zero `pnpm audit` high/critical | 06-02 Task 7 + CI gate |
| Zero `/security-review` open high/critical | 06-02 Task 9 + `SECURITY-REVIEW.md` |
| RLS cross-tenant pen-tested | 06-02 Task 4 (`tests/security/rls-pen-test.test.ts`) |
| 14 webhook sources signature-verified | 06-02 Task 3 (`tests/security/webhook-signatures.test.ts`) |
| Launch authorization signed by Daniel | 06-03 Task 4 (template) + Task 5 (signing) |

All six criteria mapped to concrete files and tasks.

---

## Coverage map (master 06-PLAN.md → sub-plans)

| Master section | Owner | Notes |
|---|---|---|
| §1.1 Type Safety & Lint | 06-01 Task 5.5 | new task added |
| §1.2 Unit Test Coverage | 06-01 Task 2 | 17 specs, one per bullet |
| §1.3 Integration Tests | 06-01 Task 3 | 16 specs |
| §1.4 Playwright E2E | 06-01 Task 4 | 17 specs, extends 05-04 |
| §1.5 Performance & Load | 06-01 Task 5 | Lighthouse + k6 |
| §1.6 Accessibility | 06-01 Task 4 | axe in spec; dark + light + reduced-motion |
| §1.7 Cross-Browser & Responsive | 06-01 Task 4 + 06-03 §2.12 | Real-device parts deferred to UAT |
| §1.8 Build & Deploy Gates | 06-01 Task 5 | size-limit + CI matrix |
| §1.9 DB Migrations & Integrity | 06-01 Task 5 | db-integrity job |
| §1.10 Observability | 06-01 Task 5 | Sentry scaffold; /api/health |
| §2.1–§2.14 Manual UAT | 06-03 Tasks 2–5 | Checklist surfaced in /admin/uat |
| §3.1 Secrets & API Keys | 06-02 Task 1 | gitleaks + .env.example + client-bundle grep |
| §3.2 Encryption at Rest | 06-02 Task 4 step 3 | Voice corpus + Vault audit |
| §3.3 Encryption in Transit | 06-02 Task 2 | HSTS + HTTPS audit |
| §3.4 Authn & Authz | 06-02 Task 5 | Cookies + /admin double gate + MFA verify |
| §3.5 RLS | 06-02 Task 4 | Programmatic pen-test |
| §3.6 Input Validation | 06-02 Task 2 + 3 | SSRF guard + Zod (existing) + open-redirect |
| §3.7 Webhook Signatures | 06-02 Task 3 | All 14 |
| §3.8 Rate Limiting | 06-02 Task 5 | 6 route groups |
| §3.9 Data Privacy & PII | 06-02 Task 6 + 6.5 | Redactor + GDPR endpoints |
| §3.10 Dependency Security | 06-02 Task 7 | Dependabot + pnpm audit |
| §3.11 Browser Headers | 06-02 Task 2 | CSP + HSTS + etc. |
| §3.12 Code-Level Security | 06-02 Task 2 | XSS audit + safe-redirect |
| §3.13 Third-Party Risk | 06-02 Task 8 | Documented in SECURITY.md |
| §3.14 Compliance Docs | 06-02 Task 8 | SECURITY + privacy + ToS + DPA template |
| §3.15 Incident Readiness | 06-02 Task 8 | 4 runbooks |
| §3.16 Automated Security Audits | 06-02 Task 1 + 7 + 9 | gitleaks + pnpm audit + OWASP ZAP scheduled |

No gaps.

---

## Execution recommendation

- Run 06-01 and 06-02 in parallel (Wave 1). Ownership split eliminates merge conflicts.
- Run 06-03 after both 06-01 and 06-02 ship (Wave 2). 06-03 inherits MFA enrollment (§2.8) and Safari iOS / Chrome Android (§2.12) from the deferrals.
- Daniel personally signs `LAUNCH-SIGN-OFF.md` only when CI is green (06-01) and SECURITY-REVIEW.md is clean (06-02).

---

*Plan check version 1.0 — 2026-05-21*
