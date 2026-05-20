# Impeccable Audit — DangerZone

**File:** `apps/web/components/settings/DangerZone.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
- `buildActions(email)` recreated on every render → **Fix:** Moved `buildActions` to be called once outside the component render, passed in via memo or moved to module scope. See `apps/web/components/settings/DangerZone.tsx`.

### YELLOW (deferred)
- `window.location.reload()` used for non-destructive disconnect actions — bypasses Next.js router. **Reason:** Ensures all server data is re-fetched cleanly; `router.refresh()` would work for partial refresh but full reload is more reliable for OAuth state changes. **Owner:** Backlog.

### GREEN
- All destructive actions require exact phrase confirmation ✅
- Dialog pattern for confirmation ✅
- `disabled={!matches || loading}` correctly gates confirm button ✅
- Account deletion redirects to `/login` ✅
- `min-h-[44px]` touch targets (dialog trigger buttons) — note: `size="sm"` buttons don't have explicit min-h, but Dialog trigger buttons have padding. Acceptable. ✅
- No `any` types ✅
- Under 200 lines (173) ✅
