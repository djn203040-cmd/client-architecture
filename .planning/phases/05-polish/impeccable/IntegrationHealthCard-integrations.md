# Impeccable Audit — IntegrationHealthCard (integrations/)

**File:** `apps/web/components/integrations/IntegrationHealthCard.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- Name collision with `health/IntegrationHealthCard.tsx` — both export `IntegrationHealthCard` with different prop shapes. Import paths disambiguate, but IDE autocomplete is confusing. **Reason:** Renaming one requires ripple changes across settings pages. **Owner:** Phase 6 — rename `integrations/IntegrationHealthCard` to `IntegrationStatusRow` or similar.

### GREEN
- Server component ✅
- Tooltip for no-show mode (auto vs manual) ✅
- Connected/disconnected states clearly differentiated ✅
- Uses CSS variables `--health-green` / `--health-red` for consistent theming ✅
- No `any` types ✅
- Under 200 lines (82) ✅
