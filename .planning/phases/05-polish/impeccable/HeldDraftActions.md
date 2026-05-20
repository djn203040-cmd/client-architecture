# Impeccable Audit — HeldDraftActions

**File:** `apps/web/components/drafts/HeldDraftActions.tsx`
**Audited:** 2026-05-21
**Score:** 17/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- Global `window.addEventListener("keydown", ...)` fires the R/E/C shortcuts even when other UI elements have focus (e.g., another input on the same page). The guard `if (editing || confirmingCancel)` prevents double-fires within this component, but does not prevent triggering when the user is focused on an unrelated input elsewhere. **Reason:** Scope narrowing requires ref-based focus tracking or a focus-context provider — non-trivial change. Current risk is low (only one HeldDraftActions visible at a time). **Owner:** Phase 6.

### GREEN
- Client component justified ✅
- Confirmation pattern for cancel (two-step) ✅
- `disabled={busy}` on all buttons during API calls ✅
- `useCallback` for stable `reapprove` / `cancel` refs in effect deps ✅
- `min-h-[44px]` touch targets ✅
- Keyboard shortcuts R/E/C shown in button labels ✅
- No `any` types ✅
- Under 200 lines (165) ✅
