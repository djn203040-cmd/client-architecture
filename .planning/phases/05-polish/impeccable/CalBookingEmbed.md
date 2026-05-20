# Impeccable Audit — CalBookingEmbed

**File:** `apps/web/components/modules/CalBookingEmbed.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- Fixed `height: "640px"` — on small viewports (<640px wide) this may overflow or feel cramped. The Cal.com embed does not natively support auto-height. **Reason:** Responsive height on Cal.com embed requires either `postMessage` from the iframe or container query; non-trivial. **Owner:** Phase 6.

### GREEN
- Client component justified (DOM MutationObserver for theme sync) ✅
- `MutationObserver` disconnected on unmount ✅
- Dark/light theme synced to Cal.com `ui()` call ✅
- `namespace` prop prevents collision when two embeds are on same page ✅
- Under 200 lines (42) ✅
