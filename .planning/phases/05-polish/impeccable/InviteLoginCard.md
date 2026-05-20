# Impeccable Audit — InviteLoginCard

**File:** `apps/web/components/auth/InviteLoginCard.tsx`
**Audited:** 2026-05-21
**Score:** 20/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None._

### YELLOW (deferred)
_None._

### GREEN
- Glass/frosted card `backdrop-blur-md bg-white/10 dark:bg-white/5` ✅
- Both email and password labels have `htmlFor` / `id` associations ✅
- `role="alert"` on error message ✅
- `autoComplete="email"` and `autoComplete="current-password"` ✅
- Warm oklch amber submit button ✅
- `min-h-[44px]` touch target ✅
- Loading state while pending ✅
- No `any` types ✅
- Under 200 lines (72) ✅
- Premium copy ✅
