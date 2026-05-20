# Impeccable Audit — StepGmail

**File:** `apps/web/components/onboarding/StepGmail.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- Polling loop (`while (!cancelled) { await sleep(2000); ... }`) has no max-attempt limit. If the server remains down indefinitely, the loop runs forever until the page unmounts. **Reason:** Adding a max-retry limit requires UI state for "connection failed, retry" — non-trivial. Current risk is low (browser tab memory is the only cost; loop sleeps 2s between calls). **Owner:** Phase 6.

### GREEN
- Client component justified ✅
- `cancelled` flag correctly stops the loop on unmount ✅
- Connected state shown with success badge ✅
- Continue button disabled until Gmail connected ✅
- Loading state on advance ✅
- Under 200 lines (84) ✅
