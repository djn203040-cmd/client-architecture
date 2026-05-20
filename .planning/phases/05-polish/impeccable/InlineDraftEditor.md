# Impeccable Audit — InlineDraftEditor

**File:** `apps/web/components/drafts/InlineDraftEditor.tsx`
**Audited:** 2026-05-21
**Score:** 19/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- `onSaveAndApprove` prop has return type `void` implicitly but callers pass async functions — TypeScript accepts this, but making it `(body: string) => void | Promise<void>` would better document the intent. **Reason:** Cosmetic TS hygiene. **Owner:** Backlog.

### GREEN
- Glass card `backdrop-blur-md bg-card dark:bg-white/5` ✅
- `aria-label="Draft body"` on textarea ✅
- Textarea auto-sizes to content (`rows={Math.max(8, ...)}`) ✅
- `min-h-[44px]` touch targets on buttons ✅
- No `any` types ✅
- Under 200 lines (46) ✅
