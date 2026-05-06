---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [supabase, next-auth, shadcn, zod, playwright, upstash, ratelimit, middleware]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js app scaffold, Supabase client helpers (server, browser, admin), middleware skeleton
  - phase: 01-02
    provides: Supabase Postgres schema — coaches table with RLS, Vault for secrets

provides:
  - invite-only auth flow (no public signup)
  - POST /api/admin/coaches — admin-only invite endpoint
  - /login page with InviteLoginCard (glass UI)
  - /invite/[token] + /invite/accept pages with InviteAcceptCard
  - Server Actions: signInAction, setPasswordAction
  - Zod validators: LoginSchema, InviteCoachSchema, SetPasswordSchema
  - shadcn/ui base components (12 total)
  - Rate limiter (adminInviteLimiter) via Upstash Redis
  - Middleware T-1-04: /admin/* redirect + /api/admin/* JSON 401

affects: [01-04, 01-05, 02-01, 03-01]

# Tech tracking
tech-stack:
  added:
    - "@upstash/ratelimit — sliding window rate limiting"
    - "@upstash/redis — Redis client for Upstash"
    - "shadcn/ui@4.7.0 — 12 base components (button, input, card, label, sheet, dialog, dropdown-menu, tabs, badge, textarea, skeleton, separator)"
    - "zod — already installed; InviteCoachSchema / LoginSchema / SetPasswordSchema added"
  patterns:
    - "Glass card UI: backdrop-blur-md bg-white/10 dark:bg-white/5 border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    - "Two-layer admin gate: middleware redirects /admin/* (302) + route handler returns 401 for /api/admin/*"
    - "Null-safe rate limiter: limiter is null in local dev (no Upstash creds), no-op fallthrough"
    - "TInviteCoachInput imported from @client/shared/validators shared package"
    - "inviteCoach rolls back auth user if coaches INSERT fails"

key-files:
  created:
    - apps/web/app/api/admin/coaches/route.ts
    - apps/web/lib/auth/invite-coach.ts
    - apps/web/lib/security/ratelimit.ts
    - apps/web/app/(auth)/login/page.tsx
    - apps/web/app/(auth)/login/login-form.tsx
    - apps/web/app/(auth)/invite/[token]/page.tsx
    - apps/web/app/(auth)/invite/[token]/accept-form.tsx
    - apps/web/app/(auth)/invite/accept/page.tsx
    - apps/web/app/(auth)/auth-actions.ts
    - apps/web/components/auth/InviteLoginCard.tsx
    - apps/web/components/auth/InviteAcceptCard.tsx
    - packages/shared/src/validators/auth.ts
    - packages/shared/src/validators/index.ts
    - apps/web/tests/unit/validators.test.ts
    - apps/web/tests/e2e/admin-access.spec.ts
    - apps/web/tests/e2e/invite-coach.spec.ts
  modified:
    - apps/web/middleware.ts (added /api/admin/* JSON 401 gate)
    - apps/web/components/ui/* (12 shadcn components installed)

key-decisions:
  - "Middleware returns 401 JSON (not redirect) for /api/admin/* so programmatic callers get machine-readable errors"
  - "Route handler re-checks admin role (defense-in-depth) even after middleware gate — T-1-04"
  - "Rate limiter is null when Upstash env vars absent — no-op fallthrough keeps local dev working"
  - "inviteCoach rolls back the Supabase Auth user if the coaches INSERT fails — no orphaned auth users"
  - "Playwright ADMIN-004 live test sends without auth cookie and asserts 302/307/401 (all valid per middleware vs handler path)"
  - "test.fixme used for tests requiring provisioned test DB or admin JWT — tracked for Phase 5 CI infra"

patterns-established:
  - "Pattern: Null-safe limiter — always check `if (limiter)` before calling `.limit()`. Enables gradual Upstash rollout."
  - "Pattern: Server Action error returns `{ error: string }` — client components read `state?.error`"
  - "Pattern: useActionState replaces deprecated useFormState in React 19 / Next.js 15"

requirements-completed: [ADMIN-001, ADMIN-004, ADMIN-005, INFRA-005, INFRA-009]

# Metrics
duration: 45min
completed: 2026-05-06
---

# Phase 01 Plan 03: Auth + Invite Flow Summary

**Invite-only auth path built end-to-end: Supabase Admin invite email → /invite/accept password set → /leads dashboard, with two-layer admin gate on /api/admin/coaches and Upstash sliding-window rate limiting**

## Performance

- **Duration:** ~45 min (multi-session; Tasks 1-2 in prior session, Task 3 in current)
- **Started:** 2026-05-05
- **Completed:** 2026-05-06
- **Tasks:** 3
- **Files modified:** 20+

## Accomplishments

- POST /api/admin/coaches: admin-only invite endpoint with role check, Zod validation, Upstash rate limiting (5 req/60s), and coaches table insert with auth rollback on failure
- /login and /invite/accept pages styled with glass card pattern, no public signup affordance anywhere
- 12 shadcn/ui base components installed; 9 Zod validator assertions passing in vitest (LoginSchema, InviteCoachSchema, SetPasswordSchema)
- Middleware extended to return JSON 401 for /api/admin/* (previously only /admin/* was protected)
- Live Playwright test confirms anonymous /admin visit redirects to /login (ADMIN-001)

## Task Commits

1. **Task 1: Install shadcn base components + Zod auth validators** - `d9510a2` (feat)
2. **Task 2: Build /login + /invite/[token] auth pages** - `6807c35` (feat), `fd39e19` (feat — missed helpers committed separately)
3. **Task 3: POST /api/admin/coaches invite endpoint + e2e tests** - `72c8d82` (feat)

**Plan metadata:** committed with docs(01-03) commit after SUMMARY creation

## Files Created/Modified

- `apps/web/app/api/admin/coaches/route.ts` — Admin invite POST handler; admin gate + rate limit + Zod + inviteCoach
- `apps/web/lib/auth/invite-coach.ts` — Calls auth.admin.inviteUserByEmail; inserts coaches row; rolls back on error
- `apps/web/lib/security/ratelimit.ts` — adminInviteLimiter + leadCreateLimiter; null when Upstash not configured
- `apps/web/middleware.ts` — Added /api/admin/* JSON 401 gate above existing /admin/* redirect
- `apps/web/app/(auth)/login/page.tsx` — Server component; redirects authenticated users to /leads
- `apps/web/app/(auth)/login/login-form.tsx` — "use client"; useActionState with signInAction
- `apps/web/app/(auth)/invite/[token]/page.tsx` — Renders AcceptForm; [token] segment for custom-token future path
- `apps/web/app/(auth)/invite/[token]/accept-form.tsx` — Parses URL hash; calls setSession; three states: loading/valid/invalid
- `apps/web/app/(auth)/invite/accept/page.tsx` — Default Supabase invite redirect target; renders AcceptForm
- `apps/web/app/(auth)/auth-actions.ts` — signInAction + setPasswordAction server actions
- `apps/web/components/auth/InviteLoginCard.tsx` — Glass card; email+password inputs; no sign-up link
- `apps/web/components/auth/InviteAcceptCard.tsx` — Three states: skeleton / expired error / password form
- `packages/shared/src/validators/auth.ts` — LoginSchema, InviteCoachSchema, SetPasswordSchema
- `packages/shared/src/validators/index.ts` — Re-exports all validators
- `apps/web/tests/unit/validators.test.ts` — 9 assertions across 3 schemas (INFRA-005)
- `apps/web/tests/e2e/admin-access.spec.ts` — 1 live test (ADMIN-001 anonymous redirect) + 1 fixme
- `apps/web/tests/e2e/invite-coach.spec.ts` — 1 live test (ADMIN-004 no-auth 401/redirect) + 2 fixme
- `apps/web/components/ui/*` — 12 shadcn components (button, input, card, label, sheet, dialog, dropdown-menu, tabs, badge, textarea, skeleton, separator)

## Decisions Made

- **Middleware /api/admin/* returns JSON 401, not redirect:** Browser clients hitting /admin get a redirect to /login (appropriate for page navigation); programmatic API callers hitting /api/admin need machine-readable errors, not HTML redirect pages.
- **Double admin check (middleware + handler):** Defense-in-depth per T-1-04. If middleware is bypassed, the handler still validates `app_metadata.role === "admin"`.
- **inviteCoach rollback on INSERT failure:** Calling `auth.admin.deleteUser` when the coaches table INSERT fails prevents orphaned auth users who can never log in because they have no coach profile.
- **Null-safe rate limiter:** The limiter is `null` when Upstash env vars are absent (local dev). The handler checks `if (adminInviteLimiter)` before calling `.limit()`. No Upstash setup required for local development.
- **test.fixme for tests requiring provisioned DB:** Tests needing a real admin JWT or test Supabase instance are marked `test.fixme` and tracked for Phase 5 CI provisioning.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added /api/admin/* JSON 401 gate to middleware**
- **Found during:** Task 3 (middleware check)
- **Issue:** Middleware only protected /admin/* (browser redirect) but not /api/admin/*. API routes need JSON 401 responses, not HTML redirects, for programmatic callers.
- **Fix:** Added `if (pathname.startsWith("/api/admin"))` block above the /admin/* block in middleware.ts, returning `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`.
- **Files modified:** apps/web/middleware.ts
- **Verification:** Type-check passes; pattern matches T-1-04 threat mitigation requirements
- **Committed in:** `72c8d82`

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical security gate)
**Impact on plan:** Essential for T-1-04 completeness. No scope creep.

## Issues Encountered

None — all files created cleanly. Type-check and vitest passed on first run.

## User Setup Required

**Upstash Redis (INFRA-009):** Rate limiting is inactive in local dev (limiter returns `null`). To enable in production:
1. Create an Upstash Redis database at upstash.com
2. Add to Vercel env: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Verify: POST /api/admin/coaches 6 times in 60s → 6th returns 429

**Supabase NEXT_PUBLIC_APP_URL:** Set `NEXT_PUBLIC_APP_URL` in .env.local (e.g., `http://localhost:3000`) so invite emails redirect to the correct /invite/accept URL.

## Next Phase Readiness

- Auth gate complete: no public signup, invite-only flow operational
- Coach can be invited → receive email → set password → log in → reach /leads
- Admin endpoint ready for Phase 1 admin dashboard (Plan 05)
- shadcn base components available for all Phase 1 UI plans
- Validator package available at @client/shared/validators for all subsequent plans

---
*Phase: 01-foundation*
*Completed: 2026-05-06*
