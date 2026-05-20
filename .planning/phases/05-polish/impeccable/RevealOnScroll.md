# Impeccable Audit — RevealOnScroll

**File:** `apps/web/components/modules/RevealOnScroll.tsx`
**Audited:** 2026-05-21
**Score:** 19/20

## Findings

### RED
_None._

### YELLOW (fixed)
- No `useReducedMotion` check — `prefers-reduced-motion: reduce` users see the scroll-triggered fade+translate animation. **Fix:** Added `useReducedMotion` hook; when motion is reduced, the initial state is `{ opacity: 0 }` only (no y transform) and the animation uses opacity-only. See `apps/web/components/modules/RevealOnScroll.tsx`.

### YELLOW (deferred)
_None._

### GREEN
- Client component justified (Framer Motion `whileInView`) ✅
- `viewport={{ once: true }}` — animates only once per page load ✅
- `className` and `id` props for flexible composition ✅
- Under 200 lines (24) ✅
