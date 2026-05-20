# Impeccable Audit — DemoLeadDraft

**File:** `apps/web/components/onboarding/DemoLeadDraft.tsx`
**Audited:** 2026-05-21
**Score:** 19/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None._

### YELLOW (deferred)
- `celebrationMessage` returned from the API is rendered directly in `onApproved` callback — if the API returns an unexpected value, there's no fallback. **Reason:** The API is internal; defensive rendering belongs at the call site. **Owner:** Backlog.

### GREEN
- Client component justified ✅
- "Onboarding demo" badge labels the card as synthetic ✅
- Sparkle icon with warm oklch accent ✅
- Loading state on approve ✅
- `toast.error` on failure ✅
- Under 200 lines (59) ✅
