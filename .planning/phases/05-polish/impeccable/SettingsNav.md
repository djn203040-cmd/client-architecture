# Impeccable Audit — SettingsNav

**File:** `apps/web/components/settings/SettingsNav.tsx`
**Audited:** 2026-05-21
**Score:** 17/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- Scroll buttons have no `aria-controls` or `aria-label` pointing to their target sections — keyboard users who tab to these buttons hear only the label ("Profile", "Notifications") with no context that clicking scrolls rather than navigates. **Reason:** Would require adding `id` attributes to all section headings, verifying against the DOM, and updating the scroll logic. Non-trivial in this pass. **Owner:** Phase 6.
- Scroll moves viewport but does not move keyboard focus to the section — keyboard users must Tab after clicking. **Reason:** Same as above. **Owner:** Phase 6.

### GREEN
- Glass card `backdrop-blur-md bg-white/10 dark:bg-white/5` ✅
- `focus-visible:ring-2` on nav buttons ✅
- Under 200 lines (30) ✅
