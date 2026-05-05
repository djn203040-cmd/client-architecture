---
phase: 01-foundation
plan: "01"
subsystem: monorepo-scaffold
tags:
  - turborepo
  - pnpm-workspaces
  - supabase-ssr
  - tailwind-v4
  - inngest
  - vitest
  - playwright
  - ci
dependency_graph:
  requires: []
  provides:
    - monorepo workspace structure (apps/web + 3 packages)
    - "@client/shared types + event constants"
    - "@client/database placeholder types"
    - "@client/ai-engine server-only guard"
    - Supabase browser/server/admin client factories
    - Inngest serve scaffold at /api/inngest
    - Instagram webhook verification scaffold
    - Tailwind v4 + OKLCH design tokens
    - Vitest + Playwright test infrastructure
    - CI workflow with security grep gates
  affects:
    - All Phase 1 plans 02-07 (depend on workspace structure)
    - Phase 3 Inngest functions (depend on event constants)
tech_stack:
  added:
    - "next@16.2.4"
    - "@supabase/ssr@0.10.2"
    - "@supabase/supabase-js@2.105.3"
    - "inngest@4.2.6"
    - "tailwindcss@4.2.4"
    - "vitest@4.1.5"
    - "@playwright/test@1.59.1"
    - "turbo@2.9.9"
    - "geist@1.3.1"
    - "framer-motion@12.38.0"
    - "@phosphor-icons/react@2.1.10"
    - "happy-dom@20.9.0 (upgraded from planned 16.1.1)"
  patterns:
    - Turborepo task pipeline with build/dev/lint/type-check/test
    - pnpm workspace:* protocol for internal packages
    - Supabase SSR cookie-based auth with getUser() (not getSession())
    - Tailwind v4 OKLCH tokens in :root, referenced via @theme inline
    - ai-engine three-layer client-side guard (browser field + runtime guard + CI audit)
key_files:
  created:
    - package.json
    - pnpm-workspace.yaml
    - turbo.json
    - .env.example
    - .nvmrc
    - apps/web/package.json
    - apps/web/next.config.ts
    - apps/web/tsconfig.json
    - apps/web/postcss.config.mjs
    - apps/web/eslint.config.mjs
    - apps/web/components.json
    - apps/web/middleware.ts
    - apps/web/app/globals.css
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx
    - apps/web/lib/supabase/browser.ts
    - apps/web/lib/supabase/server.ts
    - apps/web/lib/supabase/admin.ts
    - apps/web/inngest/client.ts
    - apps/web/app/api/inngest/route.ts
    - apps/web/app/api/webhooks/instagram/route.ts
    - apps/web/vitest.config.ts
    - apps/web/playwright.config.ts
    - apps/web/tests/setup.ts
    - "apps/web/tests/unit/* (4 files)"
    - "apps/web/tests/integration/* (8 files)"
    - "apps/web/tests/e2e/* (10 files)"
    - packages/shared/package.json
    - packages/shared/src/index.ts
    - packages/shared/src/types/index.ts
    - packages/shared/src/validators/index.ts
    - packages/shared/src/constants/events.ts
    - packages/database/package.json
    - packages/database/src/index.ts
    - packages/database/src/types.ts
    - packages/ai-engine/package.json
    - packages/ai-engine/src/index.ts
    - .github/workflows/ci.yml
  modified:
    - .gitignore (added .env.example negation)
decisions:
  - "Used happy-dom@20.9.0 instead of planned 16.1.1 (nonexistent on npm registry)"
  - "Vitest 4.x does not support --testPathPattern; uses directory path args instead"
  - "eslint.config.mjs uses FlatCompat with next/core-web-vitals (standard Next.js 15 ESLint pattern)"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-05"
  tasks_completed: 3
  files_created: 50
---

# Phase 01 Plan 01: Monorepo Skeleton + Scaffold Summary

Turborepo + pnpm monorepo skeleton with three workspace packages, Tailwind v4 OKLCH design tokens, Supabase SSR client factories, Inngest serve scaffold, Instagram webhook verification, complete test infrastructure, and CI workflow with security gates.

---

## What Was Built

### Workspace Structure

```
client-architecture/
├── apps/web/           — Next.js 16.2.4 app (all Phase 1 features land here)
├── packages/shared/    — @client/shared: types, validators stub, Inngest event constants
├── packages/database/  — @client/database: placeholder types (Plan 02 generates live types)
└── packages/ai-engine/ — @client/ai-engine: server-only guard (Phase 2 implementation)
```

All three internal packages resolve as symlinks in `apps/web/node_modules/@client/*` via pnpm workspace protocol.

### Installed Versions

| Package | Planned | Installed |
|---------|---------|-----------|
| next | 16.2.4 | 16.2.4 |
| @supabase/ssr | 0.10.2 | 0.10.2 |
| @supabase/supabase-js | 2.105.3 | 2.105.3 |
| inngest | 4.2.6 | 4.2.6 |
| tailwindcss | 4.2.4 | 4.2.4 |
| vitest | 4.1.5 | 4.1.5 |
| @playwright/test | 1.59.1 | 1.59.1 |
| turbo | 2.9.9 | 2.9.9 |
| happy-dom | 16.1.1 | 20.9.0 (deviation — see below) |

### File Locations

| Artifact | Path |
|----------|------|
| Supabase browser client | apps/web/lib/supabase/browser.ts |
| Supabase server client | apps/web/lib/supabase/server.ts |
| Supabase admin client | apps/web/lib/supabase/admin.ts |
| Middleware (auth refresh + route gates) | apps/web/middleware.ts |
| Inngest client singleton | apps/web/inngest/client.ts |
| Inngest serve route (maxDuration=300) | apps/web/app/api/inngest/route.ts |
| Instagram webhook scaffold (INFRA-010) | apps/web/app/api/webhooks/instagram/route.ts |
| Tailwind v4 globals + OKLCH tokens | apps/web/app/globals.css |
| shadcn components config | apps/web/components.json |

### CI Workflow Gates

| Job | Purpose | Threat IDs Covered |
|-----|---------|-------------------|
| security-grep | Blocks NEXT_PUBLIC_*SERVICE_ROLE in any .ts/.tsx/.env* file | T-1-01 |
| security-grep | Blocks port :5432 in .env.example (enforces Supavisor 6543) | INFRA-004 |
| type-check | pnpm --filter web type-check (TypeScript strict mode) | INFRA-006 |
| lint | ESLint no-console rule (COMPLY-009) | T-1-01, COMPLY-009 |
| unit-tests | vitest run — all unit + integration stubs | INFRA-007 |
| build | Next.js build + grep .next/static/ for ai-engine leakage | T-1-01, INFRA-008 |

### Test Stub Coverage Map

| Test File | Requirement ID | Implementing Plan |
|-----------|---------------|------------------|
| tests/unit/validators.test.ts | INFRA-005 | Plan 04 |
| tests/unit/state-machine.test.ts | STATE-001 | Plan 04 |
| tests/unit/scope-validation.test.ts | HEALTH-007 | Plan 05 |
| tests/unit/invalid-grant.test.ts | HEALTH-004 | Plan 05 |
| tests/integration/rls.test.ts | INFRA-001, ADMIN-005, VOICE-006 | Plan 02 |
| tests/integration/vault.test.ts | INFRA-003 | Plan 02 |
| tests/integration/gmail-oauth.test.ts | GMAIL-002 | Plan 05 |
| tests/integration/vault-storage.test.ts | GMAIL-003 | Plan 05 |
| tests/integration/do-not-contact.test.ts | STATE-007 | Plan 04 |
| tests/integration/state-transitions.test.ts | STATE-009 | Plan 04 |
| tests/integration/realtime-drafts.test.ts | DRAFT-012 | Plan 06 |
| tests/integration/ratelimit.test.ts | INFRA-009 | Plan 06 |
| tests/e2e/lead-create.spec.ts | LEAD-001 | Plan 04 |
| tests/e2e/lead-profile.spec.ts | LEAD-002 | Plan 04 |
| tests/e2e/lead-timeline.spec.ts | LEAD-003 | Plan 04 |
| tests/e2e/lead-notes.spec.ts | LEAD-004 | Plan 04 |
| tests/e2e/lead-list.spec.ts | LEAD-005 | Plan 04 |
| tests/e2e/admin-access.spec.ts | ADMIN-001 | Plan 03 |
| tests/e2e/admin-dashboard.spec.ts | ADMIN-002 | Plan 07 |
| tests/e2e/invite-coach.spec.ts | ADMIN-004 | Plan 03 |
| tests/e2e/gmail-connect.spec.ts | GMAIL-001 | Plan 05 |
| tests/e2e/health-card.spec.ts | HEALTH-001, HEALTH-002 | Plan 06 |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] happy-dom version 16.1.1 does not exist on npm registry**
- **Found during:** Task 1 (pnpm install)
- **Issue:** The RESEARCH.md specified `happy-dom: "16.1.1"` which does not exist on npm. Latest is `20.9.0`.
- **Fix:** Updated apps/web/package.json to use `happy-dom: "20.9.0"` (latest stable)
- **Files modified:** apps/web/package.json
- **Commit:** 6cfb6fb

**2. [Rule 1 - Bug] Vitest 4.x removed --testPathPattern CLI flag**
- **Found during:** Task 3 verification
- **Issue:** PLAN.md and VALIDATION.md reference `--testPathPattern='unit/'` which throws `CACError: Unknown option` in Vitest 4.x. The correct CLI is directory path arguments.
- **Fix:** Updated package.json scripts to use `vitest run tests/unit/` and `vitest run tests/integration/` instead.
- **Files modified:** apps/web/package.json
- **Commit:** b3f40a9

**3. [Rule 3 - Deviation] ESLint flat config pattern**
- **Found during:** Task 1
- **Issue:** The PLAN.md showed a simplified `eslint-config-next` import pattern that doesn't work for ESLint flat config with Next.js 15. The correct pattern uses `FlatCompat` with `next/core-web-vitals`.
- **Fix:** Used the standard Next.js 15 flat config pattern with `FlatCompat` to extend `next/core-web-vitals` and `next/typescript`, then added custom `no-console` rule.
- **Files modified:** apps/web/eslint.config.mjs
- **Commit:** 6cfb6fb

---

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `packages/shared/src/types/index.ts` — placeholder TLead*, TDraft*, etc. | Placeholder types | Plan 02 generates live types via `supabase gen types typescript` |
| `packages/database/src/types.ts` — `Database = Record<string, never>` | Placeholder types | Plan 02 generates after schema migration |
| `packages/shared/src/validators/index.ts` — empty export | Validator stub | Plan 04 populates CreateLeadSchema and other validators |
| `packages/ai-engine/src/index.ts` — only exports version constant | AI engine stub | Phase 2 implements Anthropic draft generation |
| All `it.todo` unit + integration tests | 33 test stubs | Each implementing plan fills these in |
| All `test.fixme` E2E specs | 10 E2E stubs | Each implementing plan fills these in |

These stubs are intentional and documented. They do not prevent this plan's goal (scaffold structure) from being achieved.

---

## Threat Flags

No new threat surface was introduced beyond what the plan's threat model explicitly covers (T-1-01, T-1-04). All three layers of the ai-engine guard (browser field, runtime guard, CI audit) are in place.

---

## Self-Check: PASSED

**Files verified:**

- [x] package.json — exists
- [x] pnpm-workspace.yaml — exists
- [x] turbo.json — exists
- [x] .env.example — exists, no :5432, has SUPABASE_SERVICE_ROLE_KEY comment
- [x] apps/web/node_modules/@client/shared — symlink confirmed
- [x] apps/web/node_modules/@client/ai-engine — symlink confirmed
- [x] packages/ai-engine/src/index.ts — contains typeof window check
- [x] packages/ai-engine/package.json — contains sideEffects: false
- [x] apps/web/middleware.ts — contains getUser(), no getSession() in non-comment code
- [x] apps/web/app/api/inngest/route.ts — maxDuration=300, GET/POST/PUT exported
- [x] apps/web/app/api/webhooks/instagram/route.ts — validates hub.verify_token, returns hub.challenge
- [x] apps/web/app/globals.css — OKLCH tokens for light (oklch(62% 0.14 50)) and dark (oklch(70% 0.14 50))
- [x] apps/web/components.json — "style": "new-york"
- [x] .github/workflows/ci.yml — 5 jobs, NEXT_PUBLIC_ grep, ai-engine audit

**Commits verified:**

- [x] 6cfb6fb — monorepo skeleton
- [x] be12267 — Tailwind/Supabase/Inngest/Instagram
- [x] b3f40a9 — test infrastructure + CI

**Test run verified:**

- [x] pnpm vitest run: 12 test files, 33 todos, exits 0
- [x] pnpm playwright test --list: 10 specs listed
- [x] pnpm --filter web type-check: exits 0
