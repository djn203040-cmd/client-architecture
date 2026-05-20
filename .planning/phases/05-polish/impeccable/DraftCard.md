# Impeccable Audit — DraftCard

**File:** `apps/web/components/drafts/DraftCard.tsx`
**Audited:** 2026-05-21
**Score:** 19/20

## Re-validation
**Phase 1 baseline:** 19/20
**Phase 5 re-audit:** 19/20
**Delta:** No regression observed. Phase 4 additions (variant/surface props, HeldDraftActions integration, reviewToken flow) are well-contained.

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- File is 210 lines — 10 lines over the 200-line threshold. The main `DraftCard` function is ~175 lines; `KeyBadge` adds 10 more. Strictly the rule applies to the file, not just each function. **Reason:** Extracting `KeyBadge` to a shared `ui/` primitive requires coordinating with the design system; the 10-line overage is cosmetic. **Owner:** Backlog.

### GREEN
- Glass/frosted card `backdrop-blur-md bg-card dark:bg-white/5` (app surface) and `bg-white/10 backdrop-blur-md` (review surface) ✅
- `role="article"` with descriptive `aria-label` ✅
- `tabIndex={0}` with `focus:ring-2 focus:ring-accent` keyboard focus ring ✅
- Keyboard shortcuts A/S/H documented in buttons via `<KeyBadge>` ✅
- `aria-label="Regenerate draft"` on icon button ✅
- `min-h-[44px] min-w-[44px]` icon button touch targets ✅
- Framer Motion enter/exit animations ✅
- `isRegenerating` animation on ArrowsClockwise icon ✅
- `confidence_level === "low"` warning badge ✅
- `onAdvance` callback cleanly advances the queue ✅
- Dual surface mode (app / review) via `reviewToken` ✅
- No `any` types ✅
