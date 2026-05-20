# Impeccable Audit — shadcn/ui Primitives

**Files:** `apps/web/components/ui/*.tsx` (19 files)
**Audited:** 2026-05-21
**Score:** PASS (upstream-maintained; light audit)

## Scope note
These are unmodified shadcn/ui primitives. They are upstream-maintained and not audited at full depth. The audit confirms they have not been locally modified in ways that introduce issues.

## Files audited
alert.tsx, badge.tsx, button.tsx, card.tsx, checkbox.tsx, command.tsx, dialog.tsx, dropdown-menu.tsx, input.tsx, label.tsx, popover.tsx, radio-group.tsx, separator.tsx, sheet.tsx, skeleton.tsx, switch.tsx, tabs.tsx, textarea.tsx, tooltip.tsx

## Findings

### RED
_None._

### YELLOW
_None — all files match standard shadcn/ui output. No local modifications detected._

### GREEN
- All primitives use Radix UI primitives underneath (keyboard accessible, ARIA complete) ✅
- All use `cn()` for className merging ✅
- No local modifications introduce accessibility regressions ✅
- No `any` types beyond Radix's own typings ✅
