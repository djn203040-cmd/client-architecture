# Impeccable Audit — OnboardingBanner

**File:** `apps/web/components/dashboard/OnboardingBanner.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- Banner is a `<div>` with no landmark role; screen readers won't identify it as a notification region. Adding `role="region"` and `aria-label="Setup progress"` would let users jump to it via landmarks. **Reason:** Visual-only cosmetic; functional even without landmark. **Owner:** Backlog.

### GREEN
- Server component ✅
- Auto-dismisses after 7 days (server-side, no client cookie needed) ✅
- Auto-dismisses when all 4 steps complete ✅
- `backdrop-blur-md` sticky banner ✅
- `nextIncompleteStep` links to the correct onboarding path ✅
- Premium copy: "Finish setup — N of 4 steps remaining" ✅
- Under 200 lines (40) ✅
