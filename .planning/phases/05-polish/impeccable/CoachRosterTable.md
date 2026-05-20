# Impeccable Audit — CoachRosterTable

**File:** `apps/web/components/admin/CoachRosterTable.tsx`
**Audited:** 2026-05-21
**Score:** 17/20

## Findings

### RED
_None._

### YELLOW (fixed)
- Table `<th>` elements lack `scope="col"` → **Fix:** Added `scope="col"` to all six column headers. See `apps/web/components/admin/CoachRosterTable.tsx`.
- `className="block min-h-[44px] flex flex-col justify-center"` — `block` is redundant when `flex` is set → **Fix:** Removed `block` from the Link className.

### YELLOW (deferred)
_None._

### GREEN
- Server component ✅
- Empty state with premium copy ✅
- Glass card `dark:bg-white/5 dark:border-white/10` ✅
- Proper DB types from `@client/database` ✅
- `GmailChip` and `OnboardingCell` are inline helpers (well under 200 each) ✅
- No `any` types ✅
- Under 200 lines (113) ✅
