# Impeccable Audit — draft-realtime

**File:** `apps/web/components/drafts/draft-realtime.tsx`
**Audited:** 2026-05-21
**Score:** 19/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- File extension is `.tsx` but the file contains no JSX — should be `.ts` per convention. **Reason:** Renaming would require updating all imports; low risk but requires search-and-replace. **Owner:** Backlog.

### GREEN
- Handles INSERT (new draft arriving) and UPDATE (draft status change) correctly ✅
- Draft status transitions handled: moved into bucket, moved out of bucket ✅
- `channel` name includes `status` + `coachId` to avoid cross-bucket collisions ✅
- `useMemo` for stable return object ✅
- `loading` starts false when `initialDrafts` provided (no flash) ✅
- Channel cleanup on unmount ✅
- No `any` types ✅
- Under 200 lines (73) ✅
