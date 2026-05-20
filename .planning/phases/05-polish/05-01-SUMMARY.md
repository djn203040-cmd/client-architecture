---
phase: 05-polish
plan: 01
status: complete
completed: 2026-05-20
---

# 05-01 Summary — Locked Module Pages

## Files Created

### Components (8)
- `apps/web/components/modules/RevealOnScroll.tsx` — 24 lines, Framer Motion whileInView wrapper (client)
- `apps/web/components/modules/HeroSection.tsx` — 56 lines, editorial hero with eyebrow/title/tagline/CTAs (server)
- `apps/web/components/modules/WhatItIs.tsx` — 23 lines, body copy section (server)
- `apps/web/components/modules/HowItWorks.tsx` — 39 lines, 3-step tuple grid (server)
- `apps/web/components/modules/WhyItMatters.tsx` — 41 lines, outcome framing with optional pull-stat (server)
- `apps/web/components/modules/SocialProofSection.tsx` — 27 lines, pull-quote with `data-placeholder` attr (server)
- `apps/web/components/modules/CtaSection.tsx` — 44 lines, Cal.com embed + secondary mailto (server)
- `apps/web/components/modules/CalBookingEmbed.tsx` — 42 lines, Cal.com inline embed with MutationObserver theme sync (client)

### Pages (2)
- `apps/web/app/(dashboard)/modules/threshold/page.tsx` — Module 2 sell screen
- `apps/web/app/(dashboard)/modules/continuation/page.tsx` — Module 3 sell screen

### Layout (1)
- `apps/web/app/(dashboard)/modules/layout.tsx` — Scopes Fraunces font variable to `/modules/*` only

### Fonts (1)
- `apps/web/lib/fonts.ts` — Fraunces variable font export (`--font-display`, axes: `["opsz"]`)

## Files Modified

- `apps/web/package.json` — added `@calcom/embed-react: ^1.5.3`
- `apps/web/app/globals.css` — added `--font-display` to `@theme inline` block + `.font-display` utility class
- `apps/web/components/shell/SidebarNav.tsx` — LOCKED tiles now route internally via `<Link>` with "Learn more →" microcopy

## Cal.com Event Types Required (user setup)

Daniel must create these two event types before the human-verify checkpoint passes:
- `daniel/threshold-intro` at https://cal.com/event-types (Module 2 CTA)
- `daniel/continuation-intro` at https://cal.com/event-types (Module 3 CTA)

## Deferred Placeholder Copy

Both pages contain placeholder testimonial quotes tagged `data-placeholder="true"` in `<SocialProofSection>`. These must be replaced with real quotes from early access coaches before public launch. Grep: `data-placeholder="true"`.

## Component Inventory (for Plan 05-05 Impeccable Sweep)

All 8 module components + 2 pages + 1 layout need the `/impeccable audit` pass:
- `components/modules/RevealOnScroll.tsx`
- `components/modules/HeroSection.tsx`
- `components/modules/WhatItIs.tsx`
- `components/modules/HowItWorks.tsx`
- `components/modules/WhyItMatters.tsx`
- `components/modules/SocialProofSection.tsx`
- `components/modules/CtaSection.tsx`
- `components/modules/CalBookingEmbed.tsx`
- `app/(dashboard)/modules/threshold/page.tsx`
- `app/(dashboard)/modules/continuation/page.tsx`
- `app/(dashboard)/modules/layout.tsx`

## Verification Status

- [x] Zero TypeScript errors in new files (`tsc --noEmit` clean on all module paths)
- [x] All 8 components under 200 lines
- [x] `@calcom/embed-react` resolves in package.json
- [x] `fraunces` exported from `lib/fonts.ts`
- [x] Threshold page contains verbatim CLAUDE.md tagline
- [x] Continuation page contains verbatim CLAUDE.md tagline
- [x] Cal.com slugs `daniel/threshold-intro` and `daniel/continuation-intro` referenced in CtaSection calls
- [x] SidebarNav LOCKED tiles route to `/modules/threshold` and `/modules/continuation` (not cal.com external)
- [x] Sidebar microcopy reads "Learn more →"
- [x] Fraunces scoped via `(dashboard)/modules/layout.tsx` only
- [ ] Cal.com event types exist (user setup — Daniel must create before human-verify checkpoint)
- [ ] Visual + Cal.com integration human verification (Task 3 checkpoint)
