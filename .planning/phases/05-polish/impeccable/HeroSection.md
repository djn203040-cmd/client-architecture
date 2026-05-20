# Impeccable Audit — HeroSection

**File:** `apps/web/components/modules/HeroSection.tsx`
**Audited:** 2026-05-21
**Score:** 15/20 → **18/20 after fix**

## Findings

### RED
- `<a href={primaryHref}><Button size="lg">` — an interactive element (`<button>`) nested inside a hyperlink (`<a>`) is invalid HTML (ARIA spec and HTML5 spec prohibit interactive descendant within an interactive element). This breaks keyboard navigation and screen reader announcement.
  → **Fix:** Replaced with `<Button asChild size="lg"><a href={primaryHref}>{primaryCta.label}</a></Button>` using the shadcn `asChild` composition pattern. See `apps/web/components/modules/HeroSection.tsx`.

### YELLOW (fixed)
_None beyond the RED fix above._

### YELLOW (deferred)
_None._

### GREEN
- Server component ✅
- Semantic `<section>` with `<h1>` ✅
- `aria-hidden` on decorative ambient glow div ✅
- Secondary CTA is a plain `<a>` (correct for link, not button) ✅
- Warm primary/8 ambient glow — not neon ✅
- Under 200 lines (56) ✅
