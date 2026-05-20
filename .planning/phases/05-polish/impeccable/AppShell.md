# Impeccable Audit — AppShell

**File:** `apps/web/components/shell/AppShell.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass — see deferred._

### YELLOW (deferred)
- No error boundary wrapping `{children}` — an unhandled error in any dashboard page would propagate to the root shell. **Reason:** Adding an error boundary here requires a client wrapper component around a server component, which is a non-trivial architectural change. **Owner:** Phase 6.

### GREEN
- Server component by default ✅
- Skip-to-content link with correct focus styles ✅
- Responsive `grid-cols-[240px_1fr]` layout with mobile fallback ✅
- Sidebar sign-out uses a proper `<form>` POST (not client JS) ✅
- `coachName` renders correctly truncated in sidebar ✅
- No `any` types ✅
- Under 200 lines (63) ✅

## Recommendations carried forward
- Phase 6: add `<ErrorBoundary>` client wrapper around `{children}` in AppShell for graceful page-level error recovery.
