# Phase 5 — Plan Check

**Date:** 2026-05-20
**Phase:** 05-polish
**Plans verified:** 5 (05-01 through 05-05)
**Verdict:** PASS (no blockers; 5 warnings)

---

## Dimension scorecard

| Dimension | Score | Notes |
|---|---|---|
| 1. Requirement coverage (MODULE-001/002/003 + VOICE-005) | PASS | MODULE-001/002/003 owned by `05-01`; VOICE-005 owned by `05-02` (StepVoice reuses Phase 2 builder + enforces ≥8). |
| 2. Exit-criteria coverage (8 ROADMAP bullets) | PASS | Each criterion maps to a task + acceptance test. See table below. |
| 3. LOCKED decisions D-01…D-23 honored | PASS w/ tracked deviation | All 23 implemented; D-22 filename renamed to `20260520000004_phase5_polish.sql` (collision with existing `20260520000001_phase4_approval.sql`). Inline note in 05-03. |
| 4. RESEARCH risks mitigated | PASS | All 10 pitfalls referenced in task actions + threat-model rows. |
| 5. CLAUDE.md compliance | PASS | RLS on audit_log + storage; service-role server-only; Vault tokens cleared on disconnect; Zod at API boundaries; 200-line cap verified; no neon green / dark purple / tech-bro; `/impeccable audit` is its own gating plan (05-05). |
| 6. Dependency chain coherence | PASS | Wave 1: 05-03 → Wave 2: 05-01 ‖ 05-02 → Wave 3: 05-04 → Wave 4: 05-05. Topologically valid. |
| 7. Task atomicity | PASS | Every `auto` task has Files + Action + Verify + Done. |
| 8. Deferred-ideas exclusion | PASS | No `module_interest` analytics, no operator-only destructives, no real-transcript-paste, etc. |
| 9. Scope sanity | PASS w/ note | 05-04 Task 3 is large (3 specs + CI workflow); 05-02 Task 2 packs 12 files. Both have size guards in verify. |

---

## Exit-criteria → covering plan + acceptance test

| Exit criterion | Plan | Acceptance |
|---|---|---|
| Module 2 sell screen live with correct copy | 05-01 Task 2 | grep `"your client's first 48 hours, built from your sales call"` + `locked-module-pages.spec.ts` |
| Module 3 sell screen live with correct copy | 05-01 Task 2 | grep `"thirty days before they leave, we remind them why they stayed"` |
| New coach onboarding < 15 min | 05-02 Task 3 + 05-04 onboarding-completion.spec.ts | Stopwatch + E2E golden path |
| Playwright: duplicate sequence | 05-04 Task 2 | `duplicate-sequence-prevention.spec.ts` (expects 409) |
| Playwright: cross-tenant isolation | 05-04 Task 2 | `cross-tenant-isolation.spec.ts` asserts status === 404 (Pitfall 9 honored) |
| Playwright: pre-send safety | 05-04 Task 2 | `pre-send-safety-check.spec.ts` iterates terminal states |
| Playwright: full approval flow | 05-04 Task 2 | `full-approval-flow.spec.ts` with Gmail mock |
| All components pass `/impeccable audit` | 05-05 Task 1+2 | Per-component .md + IMPECCABLE-SUMMARY.md; DraftCard ≥ 19/20 re-validated |

---

## RESEARCH pitfalls → mitigation reference

| # | Pitfall | Mitigation |
|---|---|---|
| 1 | Cal.com namespace collision | 05-01 Task 1 — distinct namespaces `threshold`/`continuation` |
| 2 | next/font in client component | 05-01 Task 1 — `lib/fonts.ts` server-only |
| 3 | Local Supabase port conflicts | 05-04 Task 1 — `global-setup.ts` aborts cleanly |
| 4 | Avatar upload size DoS | 05-03 Task 2 — Content-Length pre-checked → 413 |
| 5 | Demo lead leaks into real list | 05-02 Task 1 — `external_ids->>demo != 'true'` filter + E2E assertion |
| 6 | Onboarding redirect loop | 05-02 Task 2 — sibling route groups; dedicated "exactly one redirect" sub-test |
| 7 | Legacy settings page.tsx shadows redirect | 05-03 Task 3 — in-route stubs + `next.config.ts` redirects (defense in depth) |
| 8 | `auth.uid()` null in storage RLS | 05-03 Task 2 — server-mediated avatar upload |
| 9 | Cross-tenant 404 vs 200-empty | 05-04 Task 2 — `expect(res.status()).toBe(404)` + grep guard |
| 10 | Stale "8 examples" check | 05-02 Task 1 — server-side voice example count |

---

## Warnings (5)

### W1 — Quoting bug in 05-01 Task 2 verify command (FIXED)
**Location:** `05-01-locked-module-pages-PLAN.md` line 250
**Status:** Fixed inline — replaced trailing `"` with proper backslash-escaped spaces (`Claude\ code/Program\ for\ coaches`).

### W2 — Wave 0 unit-test stubs not owned by any plan
**Issue:** RESEARCH §Validation Architecture lists 5 unit/integration test files (`tests/unit/onboarding/`, `tests/integration/settings/`, `tests/integration/db/`, `tests/unit/redirects.test.ts`) that are referenced by verify blocks in 05-02 Task 1 and 05-03 Task 2. Those verify blocks use `|| echo "MISSING"` soft-fail, which silently bypasses the unit-test gate.
**Recommendation:** Either (a) add a Wave 0 plan (`05-00`) that scaffolds these stubs, or (b) fold stub creation into each plan's Task 1 and remove the soft-fail escape hatch.
**Severity:** Warning — E2E coverage in 05-04 backstops the gap, but tightening is recommended before execute.

### W3 — 05-02 Task 2 packs 12 files
**Issue:** Route group layout + dynamic step + 5 step components + banner + admin column + dashboard layout edit, all in one task.
**Mitigation:** Each file is small; verify includes a `wc -l` size guard. Executor should commit between sub-steps.

### W4 — Demo-approve route Phase 4 advisory-lock interaction
**Issue:** Assumption A3 (Phase 4 `approveDraftAtomic` RPC) is flagged but not pre-verified. If executor skips the audit step, the demo-approve route may fail.
**Recommendation:** Add a pre-task grep of `apps/web/app/api/drafts/[id]/route.ts` for `approveDraftAtomic` to 05-02 Task 1.

### W5 — 05-05 audit-count buffer too lenient
**Issue:** `test "$AUDIT_COUNT" -ge "$((COMPONENT_COUNT - 5))"` allows 5 missing non-`ui/` audits.
**Recommendation:** Replace with hard `ui/` exclusion: `COMPONENT_COUNT=$(find apps/web/components -type f -name "*.tsx" -not -path "*/ui/*" | wc -l)` then require exact match.

---

## Acceptable deviations from CONTEXT.md (documented inline)

- **D-22 migration filename**: renamed to `20260520000004_phase5_polish.sql` (collision-forced).
- **D-13 settings 301 redirects**: ships both `next.config.ts` AND in-route stubs (defense in depth per Pitfall 7).
- **D-14 timezone column**: uses `ADD COLUMN IF NOT EXISTS` after grep of existing migrations.

---

## PLAN CHECK PASS

Execution can proceed via `/gsd-execute-phase 5`. W1 is fixed inline; W2–W5 are non-blocking but should be addressed during Wave 1 execution.
