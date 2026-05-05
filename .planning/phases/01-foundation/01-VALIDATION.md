---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + Playwright 1.59.x |
| **Config file** | `apps/web/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `pnpm --filter web vitest run --testPathPattern="unit/"` |
| **Full suite command** | `pnpm --filter web vitest run && pnpm --filter web playwright test` |
| **Estimated runtime** | ~30s unit, ~3min full suite |

**Note:** Vitest does not support async Server Components. Server Component pages and layouts must be tested via Playwright (E2E), not Vitest.

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web vitest run --testPathPattern="unit/"` (unit tests only, < 10s)
- **After every plan wave:** Run `pnpm --filter web vitest run` (all unit + integration)
- **Before `/gsd-verify-work`:** Full suite (`vitest run && playwright test`) green
- **Max feedback latency:** 10 seconds (unit), 30 seconds (integration)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | INFRA-007 | — | N/A | build | `turbo build` exits 0 | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | INFRA-006 | — | N/A | type-check | `pnpm --filter web type-check` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | INFRA-008 | T-1-01 | ai-engine absent from client bundle | build analysis | `pnpm build && grep -r "ai-engine" .next/static/ \|\| echo "clean"` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | INFRA-001 | T-1-02 | RLS prevents cross-coach data access | integration | `vitest run tests/integration/rls.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | INFRA-003 | T-1-03 | SECURITY DEFINER functions in private schema | integration | `vitest run tests/integration/vault.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | INFRA-004 | — | No port 5432 in connection strings | config check | `grep -rn ":5432" .env.example && exit 1 \|\| exit 0` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | STATE-001 | — | Lead state enum values match DB | unit | `vitest run tests/unit/state-machine.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 1 | VOICE-006 | — | draft_edits table exists in schema | integration | `vitest run tests/integration/rls.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | ADMIN-004 | T-1-04 | Daniel can invite coach; no public signup | E2E | `playwright test tests/e2e/invite-coach.spec.ts` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | ADMIN-001 | T-1-04 | /admin redirects non-admin users | E2E | `playwright test tests/e2e/admin-access.spec.ts` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | LEAD-001 | — | Coach can create a lead | E2E | `playwright test tests/e2e/lead-create.spec.ts` | ❌ W0 | ⬜ pending |
| 1-04-02 | 04 | 2 | LEAD-002 | — | Lead profile renders all fields | E2E | `playwright test tests/e2e/lead-profile.spec.ts` | ❌ W0 | ⬜ pending |
| 1-04-03 | 04 | 2 | LEAD-003 | — | Activity timeline shows typed events | E2E | `playwright test tests/e2e/lead-timeline.spec.ts` | ❌ W0 | ⬜ pending |
| 1-04-04 | 04 | 2 | LEAD-004 | — | Coach notes auto-save on blur | E2E | `playwright test tests/e2e/lead-notes.spec.ts` | ❌ W0 | ⬜ pending |
| 1-04-05 | 04 | 2 | LEAD-005 | — | Lead list search + filter works | E2E | `playwright test tests/e2e/lead-list.spec.ts` | ❌ W0 | ⬜ pending |
| 1-04-06 | 04 | 2 | STATE-007 | T-1-02 | do_not_contact flag blocks sends | integration | `vitest run tests/integration/do-not-contact.test.ts` | ❌ W0 | ⬜ pending |
| 1-04-07 | 04 | 2 | STATE-009 | — | State transitions logged to activity timeline | integration | `vitest run tests/integration/state-transitions.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 3 | GMAIL-001 | T-1-05 | Gmail OAuth flow completes + marks connected | E2E (mock) | `playwright test tests/e2e/gmail-connect.spec.ts` | ❌ W0 | ⬜ pending |
| 1-05-02 | 05 | 3 | GMAIL-002 | T-1-05 | OAuth callback stores refresh token to Vault | integration | `vitest run tests/integration/gmail-oauth.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-03 | 05 | 3 | GMAIL-003 | T-1-05 | integrations table has no raw tokens | integration | `vitest run tests/integration/vault-storage.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-04 | 05 | 3 | HEALTH-004 | T-1-06 | invalid_grant marks integration disconnected | unit | `vitest run tests/unit/invalid-grant.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-05 | 05 | 3 | HEALTH-007 | T-1-06 | Under-scoped token blocks connection | unit | `vitest run tests/unit/scope-validation.test.ts` | ❌ W0 | ⬜ pending |
| 1-06-01 | 06 | 3 | HEALTH-001 | — | Health card shows connected status | E2E | `playwright test tests/e2e/health-card.spec.ts` | ❌ W0 | ⬜ pending |
| 1-06-02 | 06 | 3 | HEALTH-002 | — | Health card lights red on broken connection | E2E | `playwright test tests/e2e/health-card.spec.ts` | ❌ W0 | ⬜ pending |
| 1-06-03 | 06 | 3 | DRAFT-012 | — | Realtime subscription fires on draft INSERT | integration | `vitest run tests/integration/realtime-drafts.test.ts` | ❌ W0 | ⬜ pending |
| 1-06-04 | 06 | 3 | INFRA-005 | — | Zod validation on all API boundaries | unit | `vitest run tests/unit/validators.test.ts` | ❌ W0 | ⬜ pending |
| 1-06-05 | 06 | 3 | INFRA-009 | — | Rate limiting returns 429 on excess requests | integration | `vitest run tests/integration/ratelimit.test.ts` | ❌ W0 | ⬜ pending |
| 1-07-01 | 07 | 3 | ADMIN-002 | T-1-04 | Admin sees all coaches + system health | E2E | `playwright test tests/e2e/admin-dashboard.spec.ts` | ❌ W0 | ⬜ pending |
| 1-07-02 | 07 | 3 | ADMIN-005 | T-1-04 | Admin queries use service role; no cross-RLS | integration | `vitest run tests/integration/rls.test.ts` | ❌ W0 | ⬜ pending |
| 1-CI-01 | all | CI | INFRA-002 | T-1-01 | NEXT_PUBLIC_ prefix ban on service role key | CI lint | `grep -rn "NEXT_PUBLIC_.*service_role" --include="*.ts" --include="*.tsx" && exit 1 \|\| exit 0` | ❌ W0 | ⬜ pending |
| 1-CI-02 | all | CI | COMPLY-009 | — | No sensitive data in console.log | CI lint | ESLint no-console rule with token/secret patterns | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Priority order (highest security risk first):

- [ ] `apps/web/vitest.config.ts` — configure happy-dom, next/headers mock, path aliases
- [ ] `apps/web/playwright.config.ts` — configure base URL, auth state reuse, test reporters
- [ ] Framework install: `pnpm add -D vitest @vitejs/plugin-react happy-dom @playwright/test`
- [ ] `apps/web/tests/integration/rls.test.ts` — covers INFRA-001, ADMIN-005, VOICE-006 (highest security priority)
- [ ] `apps/web/tests/unit/validators.test.ts` — covers INFRA-005 (Zod schemas for lead, coach, draft)
- [ ] `apps/web/tests/unit/state-machine.test.ts` — covers STATE-001 (enum values match DB)
- [ ] `apps/web/tests/unit/scope-validation.test.ts` — covers HEALTH-007
- [ ] `apps/web/tests/unit/invalid-grant.test.ts` — covers HEALTH-004
- [ ] `apps/web/tests/integration/vault.test.ts` — covers INFRA-003
- [ ] `apps/web/tests/integration/gmail-oauth.test.ts` — covers GMAIL-002, GMAIL-003
- [ ] `apps/web/tests/e2e/lead-create.spec.ts` — stub, covers LEAD-001
- [ ] `apps/web/tests/e2e/admin-access.spec.ts` — stub, covers ADMIN-001
- [ ] `apps/web/tests/e2e/gmail-connect.spec.ts` — stub with mock OAuth, covers GMAIL-001
- [ ] `.github/workflows/ci.yml` — type-check, vitest, lint gates; NEXT_PUBLIC_ grep check

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gmail OAuth sends refresh token exactly once | GMAIL-002 | Google doesn't issue second refresh token without `prompt: consent` — hard to mock reliably | Revoke OAuth access in Google account settings, reconnect, verify `integrations.vault_secret_id` updated |
| Google OAuth app exits Testing mode | HEALTH-008 | Requires submitting to Google for review — external process | Submit app via Google Cloud Console; verify coaches can connect without 7-day expiry warning |
| Supabase EU region selected | INFRA-001 | Cannot change after project creation | Verify region in Supabase dashboard project settings before any data is written |
| Admin /admin access from coach account | ADMIN-001 | Defense-in-depth check beyond E2E stub | Log in as a coach account, navigate to /admin directly — must see 403/redirect |

---

## Threat Model Reference

| Threat ID | Description | STRIDE | Mitigation | Test |
|-----------|-------------|--------|------------|------|
| T-1-01 | ai-engine / service role key exposed to client bundle | Elevation of Privilege | NEXT_PUBLIC_ prefix ban + build analysis grep | 1-01-03, 1-CI-01 |
| T-1-02 | Cross-coach data access via RLS bypass | Information Disclosure | FORCE ROW LEVEL SECURITY + coach_id = auth.uid() on all policies | 1-02-01, 1-04-06, 1-07-02 |
| T-1-03 | SECURITY DEFINER functions exposed via PostgREST | Elevation of Privilege | Private schema; REVOKE ALL from PUBLIC | 1-02-02 |
| T-1-04 | Coach accesses /admin or creates coach accounts | Elevation of Privilege | Middleware check + component-level forbidden(); service role server-side only | 1-03-01, 1-03-02, 1-07-01 |
| T-1-05 | OAuth token theft from database column | Information Disclosure | Vault storage; integrations table stores only UUID reference | 1-05-02, 1-05-03 |
| T-1-06 | Gmail OAuth fails silently (invalid_grant / under-scoped) | Tampering | Explicit error handling; scope validation post-consent; integration marked disconnected | 1-05-04, 1-05-05 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s (unit), < 30s (integration)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
