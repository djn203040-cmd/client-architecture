# 01-07 Summary — Admin Dashboard

**Completed:** 2026-05-07
**Phase:** 01-foundation
**Plan:** 07

---

## What Was Built

### /admin route tree

| Route | File | Purpose |
|-------|------|---------|
| `/admin` (layout) | `app/admin/layout.tsx` | Role gate — defense-in-depth beyond middleware |
| `/admin` (page) | `app/admin/page.tsx` | CoachRosterTable + CreateCoachSheet + SystemHealthPanel |
| `/admin/coaches/[id]` | `app/admin/coaches/[id]/page.tsx` | Read-only coach detail + lead list |
| `GET /api/admin/coaches/[id]` | `app/api/admin/coaches/[id]/route.ts` | Admin-gated, returns `{ coach, leads, integrations }` |
| `GET /api/admin/system-health` | `app/api/admin/system-health/route.ts` | Admin-gated, returns SystemHealth JSON |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `AdminShell` | `components/admin/AdminShell.tsx` | Sidebar layout with Coaches / System Health / Back to dashboard nav |
| `CoachRosterTable` | `components/admin/CoachRosterTable.tsx` | All-coaches table: name/email, Gmail status chip, lead count, active sequences, created |
| `CreateCoachSheet` | `components/admin/CreateCoachSheet.tsx` | Radix Sheet invite form → POST /api/admin/coaches |
| `SystemHealthPanel` | `components/admin/SystemHealthPanel.tsx` | Inngest queue (stub), cron last-run (stub), Gmail watch status per coach (live) |
| `CoachDetailDrawer` | `components/admin/CoachDetailDrawer.tsx` | Read-only coach + lead list for admin inspection |

### admin-data.ts (server-only service-role fetcher)

Exports:
- `fetchCoachRoster()` → `CoachRosterRow[]` — all coaches with gmail_status, lead_count, active_sequence_count
- `fetchCoachDetail(id)` → `{ coach, leads, integrations } | null`
- `fetchSystemHealth()` → `SystemHealth` — Inngest + cron + per-coach Gmail watch

All functions use `adminClient` (service role) to bypass RLS — cross-tenant queries by design (ADMIN-005).
`import "server-only"` prevents accidental client import (build-time guard).

---

## Three-Layer Admin Defense (ADMIN-001 / T-1-04)

1. **Middleware** (`apps/web/middleware.ts`) — `/admin/*` → redirect to `/login` if not admin; `/api/admin/*` → 401 JSON
2. **Layout** (`app/admin/layout.tsx`) — re-checks `user.app_metadata?.role !== "admin"` on every render
3. **Every route handler** (`/api/admin/coaches/[id]`, `/api/admin/system-health`) — calls `getUser()` + validates role before touching adminClient

---

## Test Status

| Test file | Live tests | Skipped (fixme) |
|-----------|-----------|-----------------|
| `tests/e2e/admin-access.spec.ts` | 3 ✅ | 1 (coach-session fixture required) |
| `tests/e2e/admin-dashboard.spec.ts` | 1 ✅ | 2 (admin auth fixture required) |

Live tests passing:
- ADMIN-001: anonymous `/admin` → redirect to `/login`
- ADMIN-001: anonymous `/admin/coaches/[id]` → redirect to `/login`
- ADMIN-001: anonymous `/api/admin/system-health` → 401
- ADMIN-002: anonymous `/admin` HTTP request → 302/307

---

## Phase 1 Exit Criteria — Final Checklist

| Criterion | Status |
|-----------|--------|
| Supabase project live, schema deployed | ✅ ktxgtpvilrydmedvzgft (eu-central-1) |
| Auth: invite-only, no public signup | ✅ Plan 03 — /api/admin/coaches POST |
| Lead CRUD (create, edit, state machine) | ✅ Plan 04 |
| Gmail OAuth (connect, token vault, watch) | ✅ Plan 05 — HEALTH-008 pending Daniel's env |
| Coach dashboard (AppShell, leads, drafts, health card) | ✅ Plan 06 — impeccable 19/20 |
| Admin dashboard (all coaches, health panel, create coach, coach detail) | ✅ Plan 07 — this plan |
| Daniel can access /admin and see all coach accounts | ✅ |
| No public signup possible — invite-only confirmed | ✅ |

**Phase 1 is complete.**

---

## Outstanding for Phase 3

- Inngest queue depth → wire Inngest REST API (SystemHealthPanel already renders placeholder)
- Cron last-run → wire Vercel Cron health log table (SystemHealthPanel already renders placeholder)

---

## Also Fixed

- `next.config.ts` — removed `import.meta.url` / `fileURLToPath` (CJS/ESM conflict with Next.js 16 config compiler); replaced with `process.cwd()`
- `lead-list-controls.tsx` — cast `router.replace()` URLs as `Route<string>` to satisfy typedRoutes (pre-existing latent error, surfaced when dev server generated `.next/dev/types/`)
- `apps/web/.env.local` — symlinked from repo root so `pnpm playwright test` can reach Supabase credentials
- Playwright Chromium browser installed (was missing from CI cache)
