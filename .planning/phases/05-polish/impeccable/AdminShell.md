# Impeccable Audit — AdminShell

**File:** `apps/web/components/admin/AdminShell.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
- Missing skip-to-content link (AppShell has one; AdminShell does not) → **Fix:** Added `<a href="#admin-main">Skip to content</a>` skip link with matching `id="admin-main"` on `<main>`. See file at `apps/web/components/admin/AdminShell.tsx`.

### YELLOW (deferred)
_None._

### GREEN
- Server component ✅
- `aria-label="Admin navigation"` on nav ✅
- `min-h-[44px]` touch targets on nav links and sign-out button ✅
- Responsive sidebar/main grid ✅
- No `any` types ✅
- Under 200 lines (61) ✅
