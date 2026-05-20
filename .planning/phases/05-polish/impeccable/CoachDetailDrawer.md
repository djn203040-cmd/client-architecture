# Impeccable Audit — CoachDetailDrawer

**File:** `apps/web/components/admin/CoachDetailDrawer.tsx`
**Audited:** 2026-05-21
**Score:** 17/20

## Findings

### RED
_None._

### YELLOW (fixed)
- Table `<th>` elements lack `scope="col"` → **Fix:** Added `scope="col"` to all four column headers in the leads table. See `apps/web/components/admin/CoachDetailDrawer.tsx`.

### YELLOW (deferred)
- No `<caption>` on the leads table for screen readers. **Reason:** Adding a caption changes visual layout; coach count in heading already provides context. **Owner:** Phase 6.

### GREEN
- Server component ✅
- Semantic HTML: `<article>`, `<header>`, `<section>` ✅
- Empty state ("No leads yet") ✅
- Glass card `dark:bg-white/5 dark:border-white/10` ✅
- `min-h-[44px]` back link touch target ✅
- No `any` types ✅
- Under 200 lines (82) ✅
