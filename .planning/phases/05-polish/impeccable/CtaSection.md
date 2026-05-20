# Impeccable Audit — CtaSection

**File:** `apps/web/components/modules/CtaSection.tsx`
**Audited:** 2026-05-21
**Score:** 19/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None._

### YELLOW (deferred)
- `secondaryMailto` prop is passed as an `href` on an `<a>` — no validation that it is a valid `mailto:` or `https://` URL. **Reason:** This is an internal-use component consumed only from the locked module sell pages; caller validation is sufficient. **Owner:** Backlog.

### GREEN
- Server component ✅
- `id` prop enables scroll-to from HeroSection CTA ✅
- `scroll-mt-16` for correct offset after sticky navigation ✅
- Cal.com embed wrapped in a glass-card border ✅
- Under 200 lines (44) ✅
