# Impeccable Audit — UnmatchedTranscriptQueue

**File:** `apps/web/components/drafts/UnmatchedTranscriptQueue.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- Name suggestion heuristic (`transcript.content.includes(l.name.split(" ")[0])`) may produce false positives for coaches with common first names (e.g. "Will", "May"). A false-positive suggestion is harmless (coach still chooses) but noisy. **Reason:** Better matching requires a proper fuzzy-search lib. **Owner:** Phase 6.

### GREEN
- Realtime INSERT subscription for new unmatched transcripts ✅
- Empty state with icon ✅
- `<ul>` / `<li>` semantics ✅
- Combobox pattern for lead search (Command + Popover) ✅
- `min-h-[44px]` on all buttons ✅
- Loading state per-transcript row ✅
- `toast.success` / `toast.error` feedback ✅
- `onAssigned` callback removes row from local state optimistically ✅
- No `any` types ✅
- Under 200 lines (177) ✅
