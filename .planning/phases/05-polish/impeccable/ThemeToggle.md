# Impeccable Audit — ThemeToggle

**File:** `apps/web/components/shell/ThemeToggle.tsx`
**Audited:** 2026-05-21
**Score:** 18/20

## Findings

### RED
_None._

### YELLOW (fixed)
_None in this pass._

### YELLOW (deferred)
- SSR/hydration mismatch risk: `useState` initializer reads `document.documentElement.classList.contains("dark")` on first render. In Next.js 15 app router this is client-only (safe), but if the persisted `localStorage` theme differs from what the HTML class contains at render time, the icon briefly shows the wrong state. A `useMounted` guard would eliminate the flicker entirely. **Reason:** No visual regression in current usage; cosmetic only. **Owner:** Phase 6.

### GREEN
- Client component justified — DOM manipulation required ✅
- `aria-label` dynamically toggles between "Switch to dark mode" / "Switch to light mode" ✅
- Button uses shadcn `ghost/icon` variant — keyboard accessible ✅
- `localStorage` persistence for preference ✅
- No `any` types ✅
- Under 200 lines (35) ✅
