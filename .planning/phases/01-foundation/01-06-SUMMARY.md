---
phase: 01-foundation
plan: "06"
subsystem: dashboard-shell
tags: [dashboard, realtime, health-card, drafts, framer-motion, theming]
dependency_graph:
  requires: ["01-01", "01-02", "01-03", "01-04", "01-05"]
  provides:
    - AppShell (sidebar + main layout for all dashboard routes)
    - IntegrationHealthCard (Gmail connection state, healthy/broken)
    - DraftQueueScaffold (Supabase Realtime subscription)
    - DraftCard (full body, A/S/H keyboard shortcuts, spring animation)
    - InlineDraftEditor (textarea replaces card body on edit)
    - ThemeToggle (localStorage-persisted dark/light)
    - Error boundaries (root + dashboard level)
    - Sign-out POST route
  affects:
    - apps/web/app/(dashboard)/* — all dashboard routes now use AppShell
tech_stack:
  added:
    - framer-motion AnimatePresence + motion.div for DraftCard slide animation
    - "@phosphor-icons/react/dist/ssr" for server-component icons (IntegrationHealthCard)
  patterns:
    - Server component + async data fetcher pattern (integration-health-data.ts)
    - Realtime hook (useDraftRealtime) with postgres_changes filter + cleanup
    - Framer Motion spring physics: type spring, stiffness 120, damping 18
    - Glass card: backdrop-blur-md bg-white/10 border border-white/10 shadow-inset
key_files:
  created:
    - apps/web/components/shell/AppShell.tsx
    - apps/web/components/shell/SidebarNav.tsx
    - apps/web/components/shell/ThemeToggle.tsx
    - apps/web/components/health/IntegrationHealthCard.tsx
    - apps/web/components/health/integration-health-data.ts
    - apps/web/components/drafts/DraftQueueScaffold.tsx
    - apps/web/components/drafts/DraftCard.tsx
    - apps/web/components/drafts/InlineDraftEditor.tsx
    - apps/web/components/drafts/draft-realtime.tsx
    - apps/web/app/(dashboard)/dashboard/page.tsx
    - apps/web/app/(dashboard)/drafts/page.tsx
    - apps/web/app/(dashboard)/settings/page.tsx
    - apps/web/app/error.tsx
    - apps/web/app/(dashboard)/error.tsx
    - apps/web/app/api/auth/sign-out/route.ts
    - apps/web/tests/integration/ratelimit.test.ts
    - apps/web/tests/integration/realtime-drafts.test.ts
    - apps/web/tests/e2e/health-card.spec.ts
  modified:
    - apps/web/app/(dashboard)/layout.tsx (replaced minimal layout with AppShell integration)
decisions:
  - AppShell is async server component; IntegrationHealthCard fetches integration row server-side per request — no client state needed for initial render
  - Framer Motion height-animate for IntegrationHealthCard deferred to Phase 4; Phase 1 ships static both-states correctly (Phase 1 exit criterion is health state visibility, not live animation)
  - DraftCard PATCH /api/drafts/[id] is a Phase 4 endpoint; InlineDraftEditor scaffold exists with full contract; toast error path handles 404 in Phase 1
  - realtime-drafts.test.ts skipIf guard uses URL/key prefix check against setup.ts mock values to avoid beforeAll DNS errors in CI without Supabase credentials
metrics:
  duration: "8 minutes"
  completed: "2026-05-07"
  tasks_completed: 3
  files_created: 18
  files_modified: 1
---

# Phase 1 Plan 06: Coach Dashboard Shell + Realtime Drafts + IntegrationHealthCard Summary

AppShell sidebar (240px), IntegrationHealthCard (healthy compact / broken expanded with reconnect), DraftQueueScaffold with Supabase Realtime subscription, DraftCard (spring slide animation, A/S/H keyboard shortcuts), InlineDraftEditor (inline textarea), ThemeToggle (localStorage), error boundaries, sign-out route, and all associated tests.

## What Was Built

### Task 1 — Dashboard Shell (commit c4650a0)

**AppShell** (`apps/web/components/shell/AppShell.tsx`): async server component providing the 240px sidebar layout (lg+) with the product name, coach name, SidebarNav, IntegrationHealthCard, sign-out form, and ThemeToggle. Main content area has `max-w-[1400px]` container and `p-6 lg:p-8` padding. Mobile header collapses sidebar.

**SidebarNav** (`apps/web/components/shell/SidebarNav.tsx`): "use client" component using `usePathname` for active route detection. Four active nav items (Dashboard, Leads, Drafts, Settings) with 44px min-height, Phosphor icons, accent pill on active route. Two locked Module entries with "Coming soon" pill badges and verbatim CLAUDE.md lock copy stored as `subtitle` fields.

**ThemeToggle** (`apps/web/components/shell/ThemeToggle.tsx`): toggles `.dark` on `<html>` and persists to `localStorage`; initializes from stored preference or `prefers-color-scheme`.

**Dashboard layout** (`apps/web/app/(dashboard)/layout.tsx`): replaced minimal Plan 04 placeholder with full AppShell integration — fetches coach row by user ID, redirects to `/login` if not found.

**Skeletal pages**:
- `/dashboard` — lead count stat card + drafts-pending card (0 scaffold)
- `/drafts` — fetches pending drafts, passes to DraftQueueScaffold with coachId
- `/settings` — Gmail connection state, connect/reconnect link, error/success banners for OAuth callback params

**Error boundaries** — `app/error.tsx` (global) + `app/(dashboard)/error.tsx` (dashboard-scoped): both use Phosphor `WarningOctagon`, no stack traces, "Try again" button.

**Sign-out route** (`app/api/auth/sign-out/route.ts`): POST handler — calls `supabase.auth.signOut()` then redirects to `/login` with 303.

### Task 2 — IntegrationHealthCard tests + ratelimit test (commit aa68117)

**IntegrationHealthCard** (`apps/web/components/health/IntegrationHealthCard.tsx`): async server component. Healthy state: compact row with Phosphor `CheckCircle` (health-green CSS var) + "Gmail connected". Broken state: expanded with `WarningCircle` (health-red), UI-SPEC error copy "Gmail disconnected. Your sequences are paused. Reconnect to resume.", and "Reconnect Gmail" link to `/api/auth/gmail/authorize`.

**integration-health-data.ts**: `server-only` data fetcher — queries `integrations` table filtered by `coach_id` and `provider=gmail`, returns typed `HealthState` object.

**ratelimit.test.ts** (updated from todo stubs): 3 tests — 2 live Upstash tests (skip when no `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) validating sliding-window blocking, plus 1 always-live export assertion.

**health-card.spec.ts** (updated): 2 fixme stubs for HEALTH-001/002 (require authenticated session fixtures) + 1 live test for HEALTH-003 (settings redirect for unauthenticated users).

### Task 3 — Realtime drafts integration test (commit a7fad46)

**realtime-drafts.test.ts** (updated from todo stubs): 2 tests — 1 live test (skips against mock env values from tests/setup.ts) subscribing to `coach-drafts` Realtime channel with `coach_id=eq.${coachId}` filter and asserting INSERT event delivery within 5s; 1 always-live structural test verifying `draft-realtime.tsx` contains `postgres_changes`, `coach_id=eq.`, `removeChannel`, and `"coach-drafts"`.

**DraftQueueScaffold** (`apps/web/components/drafts/DraftQueueScaffold.tsx`): "use client" — manages `drafts` state with `useState`, calls `useDraftRealtime`, renders `AnimatePresence` wrapping single `DraftCard`. Empty state matches UI-SPEC copy verbatim.

**draft-realtime.tsx** (`useDraftRealtime`): useEffect hook — subscribes to `channel("coach-drafts")` with INSERT and UPDATE listeners filtered by `coach_id=eq.${coachId}`, updates state, removes channel on cleanup.

**DraftCard** (`apps/web/components/drafts/DraftCard.tsx`): full Framer Motion `motion.div` with `initial={{ x: 300, opacity: 0 }}`, `exit={{ x: -300, opacity: 0 }}`, `transition={{ type: "spring", stiffness: 120, damping: 18 }}`. Renders lead name, touchpoint position + scheduled time in Geist Mono (`font-mono`), full draft body `whitespace-pre-wrap max-w-[65ch]`, confidence badge (low only), Pencil edit trigger, 3 action buttons (Approve/Skip/Hold) with `<kbd>` shortcut badges (28px height). Keyboard handler for A/S/H/Escape.

**InlineDraftEditor** (`apps/web/components/drafts/InlineDraftEditor.tsx`): replaces card body with `<Textarea>` (not modal). "Save and approve" button calls `onSaveAndApprove(body)` which PATCHes draft and advances queue.

## Module 2/3 Lock Copy Verification

CLAUDE.md verbatim stored in SidebarNav LOCKED array as `subtitle` props:
- Module 2: "The Threshold Experience — your client's first 48 hours, built from your sales call."
- Module 3: "The Continuation — thirty days before they leave, we remind them why they stayed."

Phase 5 will build dedicated locked module sell screens; Phase 1 shows the nav placeholder with "Coming soon" pill.

## Test Coverage

| File | Tests | Status |
|------|-------|--------|
| tests/integration/ratelimit.test.ts | 3 | 1 live (exports), 2 skipIf (Upstash) |
| tests/integration/realtime-drafts.test.ts | 2 | 1 live (structural), 1 skipIf (real Supabase) |
| tests/e2e/health-card.spec.ts | 3 | 1 live (redirect), 2 fixme (need auth fixtures) |

## Threat Surface Scan

All files reviewed. No new network endpoints beyond the sign-out POST route (extends existing auth surface). Reconnect link is hardcoded to `/api/auth/gmail/authorize` (server-side URL building, no user input). No new trust boundaries introduced.

## Deviations from Plan

### Auto-noted (implementation decisions, not bugs)

**1. [Rule 2 - Note] draft-realtime.tsx skipIf guard uses mock-value detection**
- **Found during:** Task 3 testing
- **Issue:** Vitest `describe.skipIf` runs `beforeAll`/`afterAll` even when all tests are skipped. The `tests/setup.ts` sets default mock env vars (`https://test.supabase.co`, `test-anon-key`, `test-service-role-key`) causing DNS errors.
- **Fix:** Added URL/key prefix checks to `skipIf` condition to detect mock values and skip properly.
- **Files modified:** `apps/web/tests/integration/realtime-drafts.test.ts`
- **Commit:** a7fad46

**2. [Scope] IntegrationHealthCard and draft components shipped in Task 1 commit**
- The plan listed IntegrationHealthCard under Task 2 and draft components under Task 3, but both are required by AppShell (Task 1). All were created in a single logical unit (Task 1 commit c4650a0) to avoid broken build state. Task 2 and 3 commits contain only the test files.

## Self-Check

Files exist: c4650a0, aa68117, a7fad46
