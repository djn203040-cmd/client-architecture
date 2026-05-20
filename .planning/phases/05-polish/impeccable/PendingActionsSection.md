# Impeccable Audit — PendingActionsSection

**File:** `apps/web/components/dashboard/PendingActionsSection.tsx`
**Audited:** 2026-05-21
**Score:** 17/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- Uses `adminClient` (service role) rather than the RLS-scoped server client. The query does include `.eq("coach_id", coachId)` which limits results, but the admin client bypasses RLS — if coachId were ever derived from untrusted input upstream, this would expose all coaches' pending actions. **Reason:** In the current dashboard page, coachId is derived from the authenticated session (trusted). Refactoring to use the server client requires verifying the auth flow on the page level. **Owner:** Phase 6 / security review.

### GREEN
- Async server component ✅
- Returns null for empty list (no empty state needed for pending actions) ✅
- Filters `dismissed_at IS NULL` ✅
- `order("created_at", ascending: true)` — oldest first, correct ✅
- No `any` types ✅
- Under 200 lines (43) ✅
