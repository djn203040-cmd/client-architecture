# Impeccable Audit — StepIndicator

**File:** `apps/web/components/onboarding/StepIndicator.tsx`
**Audited:** 2026-05-21
**Score:** 19/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None._

### YELLOW (deferred)
- Progress dots use a warm `oklch(60%_0.14_60)` orange — correct palette — but have no SR-only label for completed steps. A screen reader hears "Gmail Voice First lead Notifications" without knowing which are complete. **Reason:** `aria-current="step"` marks the active step, but "completed" vs "incomplete" is conveyed only by colour. Adding `aria-label="Completed"` to completed dots would improve SR experience. **Owner:** Backlog.

### GREEN
- Server component ✅
- `aria-label="Onboarding progress"` on container ✅
- `aria-current="step"` on active dot ✅
- `STEP_ORDER` from shared validators — single source of truth ✅
- Under 200 lines (60) ✅
