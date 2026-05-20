---
phase: 05-polish
plan: 01
type: execute
wave: 2
depends_on: [05-03]
files_modified:
  - apps/web/app/(dashboard)/modules/threshold/page.tsx
  - apps/web/app/(dashboard)/modules/continuation/page.tsx
  - apps/web/app/(dashboard)/modules/layout.tsx
  - apps/web/components/modules/HeroSection.tsx
  - apps/web/components/modules/WhatItIs.tsx
  - apps/web/components/modules/HowItWorks.tsx
  - apps/web/components/modules/WhyItMatters.tsx
  - apps/web/components/modules/SocialProofSection.tsx
  - apps/web/components/modules/CtaSection.tsx
  - apps/web/components/modules/CalBookingEmbed.tsx
  - apps/web/components/modules/RevealOnScroll.tsx
  - apps/web/lib/fonts.ts
  - apps/web/app/globals.css
  - apps/web/components/shell/SidebarNav.tsx
  - apps/web/package.json
autonomous: false
requirements: [MODULE-001, MODULE-002, MODULE-003]
user_setup:
  - service: cal.com
    why: "Booking destination for Module 2 and Module 3 CTAs"
    dashboard_config:
      - task: "Create event-type slug `daniel/threshold-intro`"
        location: "Cal.com Dashboard → Event Types"
      - task: "Create event-type slug `daniel/continuation-intro`"
        location: "Cal.com Dashboard → Event Types"

must_haves:
  truths:
    - "Clicking the locked Module 2 tile in the sidebar navigates to /modules/threshold (no longer external Cal.com link)"
    - "Clicking the locked Module 3 tile navigates to /modules/continuation"
    - "Each module page shows hero copy matching CLAUDE.md verbatim"
    - "Each module page mounts a working Cal.com inline booking iframe in the CTA section"
    - "Both module pages render correctly in dark and light themes"
    - "Reveal-on-scroll animations fire once per section without scroll-jacking"
  artifacts:
    - path: "apps/web/app/(dashboard)/modules/threshold/page.tsx"
      provides: "Module 2 sell screen"
      contains: "The Threshold Experience"
    - path: "apps/web/app/(dashboard)/modules/continuation/page.tsx"
      provides: "Module 3 sell screen"
      contains: "The Continuation"
    - path: "apps/web/components/modules/CalBookingEmbed.tsx"
      provides: "Cal.com inline embed wrapper"
      exports: ["CalBookingEmbed"]
    - path: "apps/web/lib/fonts.ts"
      provides: "Fraunces variable font export"
      exports: ["fraunces"]
  key_links:
    - from: "apps/web/components/shell/SidebarNav.tsx"
      to: "/modules/threshold and /modules/continuation"
      via: "next/link Link components on LOCKED tiles"
      pattern: "Link href=\"/modules/(threshold|continuation)\""
    - from: "apps/web/components/modules/CalBookingEmbed.tsx"
      to: "cal.com booking iframe"
      via: "@calcom/embed-react with namespace + calLink"
      pattern: "Cal namespace=.*calLink="
    - from: "apps/web/app/(dashboard)/modules/layout.tsx"
      to: "Fraunces variable font"
      via: "className={fraunces.variable} wrapper"
      pattern: "fraunces\\.variable"
---

<objective>
Ship Module 2 (The Threshold Experience) and Module 3 (The Continuation) as editorial-premium long-form sell screens at `/modules/threshold` and `/modules/continuation`, with Cal.com inline booking, Fraunces serif display typography scoped to the route segment, and Framer Motion reveal-on-scroll animations.

Purpose: Convert the sidebar's locked module tiles from "Book a call" external links into real product surfaces — the surfaces coaches see when they imagine upgrading. This is the visible promise of the upsell.

Output:
- Two new pages under `(dashboard)/modules/{threshold,continuation}/page.tsx`
- One scoped layout `(dashboard)/modules/layout.tsx` that applies the Fraunces font variable to this route segment only
- Seven shared section primitives under `components/modules/`
- One `lib/fonts.ts` exporting the Fraunces variable font
- Updated `SidebarNav.tsx` so LOCKED tiles route internally with "Learn more →" microcopy
- `@calcom/embed-react` added to `apps/web/package.json`
</objective>

<execution_context>
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/workflows/execute-plan.md
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-polish/05-CONTEXT.md
@.planning/phases/05-polish/05-RESEARCH.md
@CLAUDE.md
@apps/web/components/shell/SidebarNav.tsx

<interfaces>
<!-- Existing SidebarNav LOCKED array (lines ~13-26). Phase 5 updates these tiles' href + microcopy in place. -->

From apps/web/components/shell/SidebarNav.tsx:
```tsx
const LOCKED = [
  {
    id: "module-2",
    label: "The Threshold Experience",
    subtitle: "Your client's first 48 hours, built from your sales call.",
    cta: "Book a call",  // → change to "Learn more →"
  },
  {
    id: "module-3",
    label: "The Continuation",
    subtitle: "Thirty days before they leave, we remind them why they stayed.",
    cta: "Book a call",  // → change to "Learn more →"
  },
];
```

<!-- Cal.com embed canonical pattern from RESEARCH.md Pattern 1 -->
From @calcom/embed-react v1.5.3:
```tsx
import Cal, { getCalApi } from "@calcom/embed-react";
// Cal namespace="threshold" calLink="daniel/threshold-intro" — distinct namespace per module (Pitfall 1)
```

<!-- next/font Fraunces pattern from RESEARCH.md Pattern 2 -->
From next/font/google:
```ts
import { Fraunces } from "next/font/google";
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz"], // variable font — no `weight` needed
});
```

<!-- Module hero copy — EXACT from CLAUDE.md / CONTEXT.md Specifics -->
Module 2: "The Threshold Experience — your client's first 48 hours, built from your sales call."
Module 3: "The Continuation — thirty days before they leave, we remind them why they stayed."

<!-- Cal.com event slugs — locked per CONTEXT.md Specifics + D-04 -->
Module 2 CTA → calLink "daniel/threshold-intro", namespace "threshold"
Module 3 CTA → calLink "daniel/continuation-intro", namespace "continuation"

<!-- Secondary CTA mailto — exact per CONTEXT.md Specifics -->
Module 2 secondary: mailto:djn203040@gmail.com?subject=The Threshold Experience
Module 3 secondary: mailto:djn203040@gmail.com?subject=The Continuation
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install @calcom/embed-react, define Fraunces font, build shared section primitives</name>
  <files>apps/web/package.json, apps/web/lib/fonts.ts, apps/web/app/globals.css, apps/web/components/modules/RevealOnScroll.tsx, apps/web/components/modules/HeroSection.tsx, apps/web/components/modules/WhatItIs.tsx, apps/web/components/modules/HowItWorks.tsx, apps/web/components/modules/WhyItMatters.tsx, apps/web/components/modules/SocialProofSection.tsx, apps/web/components/modules/CtaSection.tsx, apps/web/components/modules/CalBookingEmbed.tsx</files>
  <behavior>
    - Test: `pnpm --filter web build` succeeds with `@calcom/embed-react` resolvable
    - Test: `fraunces.variable` produces a CSS variable string usable in className
    - Test: `RevealOnScroll` renders children and applies Framer Motion `whileInView` with `viewport={{ once: true }}`
    - Test: `HeroSection` accepts `{ eyebrow, title, tagline, primaryCta, secondaryCta }` and renders title with `font-display` class
    - Test: `HowItWorks` accepts `steps: { n: number, title: string, body: string }[]` of length 3 and renders a numbered 3-step row
    - Test: `CalBookingEmbed` renders `<Cal namespace=...>` with theme synced to `resolvedTheme` from next-themes
    - Test: each section primitive stays under 200 lines (CLAUDE.md rule)
  </behavior>
  <action>
1. Add dependency: edit `apps/web/package.json` to add `"@calcom/embed-react": "^1.5.3"` to `dependencies`. Run `pnpm install` after.
2. Create `apps/web/lib/fonts.ts` exporting `fraunces` exactly per RESEARCH.md Pattern 2 (variable font, axes `["opsz"]`, `display: "swap"`, variable `--font-display`). No `weight` field — Fraunces is variable.
3. Edit `apps/web/app/globals.css`: inside the existing `@theme inline { ... }` block add `--font-display: var(--font-display);`. Outside the theme block add `.font-display { font-family: var(--font-display), Georgia, serif; }`.
4. Create `apps/web/components/modules/RevealOnScroll.tsx` (client component) — wraps children in `motion.section` with `initial={{ opacity: 0, y: 24 }}`, `whileInView={{ opacity: 1, y: 0 }}`, `viewport={{ once: true, amount: 0.3 }}`, `transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}`. Accept optional `delay` prop. Source: RESEARCH.md Pattern 3.
5. Create `apps/web/components/modules/HeroSection.tsx` — server component. Single column, generous whitespace (`py-24` minimum). Renders an eyebrow (small caps, sans), a title in `font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05]`, a tagline below, and CTA buttons (primary + secondary). Use existing `Button` from `components/ui/`. Accept `art` slot for an art-directed visual. Max-width `max-w-3xl` for text, wider for visuals (`max-w-5xl` outer).
6. Create `apps/web/components/modules/WhatItIs.tsx` — server component. One paragraph + optional inline visual slot. No card-in-card. `max-w-3xl`, `py-24`. Wrap in `RevealOnScroll`.
7. Create `apps/web/components/modules/HowItWorks.tsx` — server component. Accept `steps` prop (length 3, enforce via TypeScript tuple type `[Step, Step, Step]`). Render a horizontal 3-step row on `md:` and above; vertical stack on mobile. Each step has a number badge, a one-line title, a one-line body. Wrap in `RevealOnScroll`.
8. Create `apps/web/components/modules/WhyItMatters.tsx` — server component. Outcome-framed paragraph + a small pull-stat or sub-headline. Wrap in `RevealOnScroll`.
9. Create `apps/web/components/modules/SocialProofSection.tsx` — server component. Accepts `quote: string`, `attribution: string` (defaults to placeholder marked `data-placeholder` so reviewers can spot it). Pull-quote styling: large serif (`font-display text-3xl italic`), attribution small sans below. Wrap in `RevealOnScroll`.
10. Create `apps/web/components/modules/CtaSection.tsx` — server component. Accept `{ headline, calLink, calNamespace, secondaryMailto, secondaryLabel }`. Mounts `CalBookingEmbed` (client island) plus the secondary mailto link. Wrap the whole section in `RevealOnScroll` so the Cal.com iframe mounts only when scrolled into view (per RESEARCH.md Open Question 4 — no separate IntersectionObserver).
11. Create `apps/web/components/modules/CalBookingEmbed.tsx` — client component (`"use client"`). Exact code from RESEARCH.md Pattern 1 / Code Examples section: imports `Cal, { getCalApi }` from `@calcom/embed-react`, `useTheme` from `next-themes`, `useEffect`. Props: `{ calLink: string; namespace: string }`. Width `100%`, height `640px`. Use distinct namespace per page (`"threshold"` vs `"continuation"`) per Pitfall 1.

**Design rules to enforce (CLAUDE.md):**
- Warm uplifting palette only — reuse existing tokens (`bg-secondary/60 dark:bg-white/5`). NO neon green, NO dark purple, NO tech-bro accents.
- Glass/frosted (`backdrop-blur-md`, `bg-white/10`) for any "card" element. Hero may break this for editorial direction.
- Each section component under 200 lines.
- Server components by default; only `RevealOnScroll` and `CalBookingEmbed` are client.

Per D-03 — taste skills `huashu-design`, `high-end-visual-design`, `minimalist-ui` should inform spacing/typography decisions.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -20</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -l "@calcom/embed-react" apps/web/package.json && grep -l "Fraunces" apps/web/lib/fonts.ts && for f in apps/web/components/modules/HeroSection.tsx apps/web/components/modules/WhatItIs.tsx apps/web/components/modules/HowItWorks.tsx apps/web/components/modules/WhyItMatters.tsx apps/web/components/modules/SocialProofSection.tsx apps/web/components/modules/CtaSection.tsx apps/web/components/modules/CalBookingEmbed.tsx apps/web/components/modules/RevealOnScroll.tsx; do test -f "$f" && wc -l "$f" || (echo "MISSING $f" && exit 1); done</automated>
  </verify>
  <done>
    All eight files exist, `tsc --noEmit` passes, every section component is under 200 lines, `@calcom/embed-react` resolves, `fraunces` exported from `lib/fonts.ts`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire the two module pages, scoped layout with Fraunces, and sidebar tile rerouting</name>
  <files>apps/web/app/(dashboard)/modules/layout.tsx, apps/web/app/(dashboard)/modules/threshold/page.tsx, apps/web/app/(dashboard)/modules/continuation/page.tsx, apps/web/components/shell/SidebarNav.tsx</files>
  <behavior>
    - Test: `/modules/threshold` renders with hero text `"The Threshold Experience — your client's first 48 hours, built from your sales call."` verbatim
    - Test: `/modules/continuation` renders with hero text `"The Continuation — thirty days before they leave, we remind them why they stayed."` verbatim
    - Test: both pages render Cal.com iframe element (presence check, not iframe content)
    - Test: both pages render with no console errors
    - Test: clicking the locked Module 2 tile in sidebar navigates internally to `/modules/threshold` (not cal.com external)
    - Test: locked tile microcopy reads `"Learn more →"`
    - Test: Fraunces variable is applied via wrapper className on the modules layout only (NOT on the dashboard root layout — verify by inspecting computed style on a non-module dashboard page)
  </behavior>
  <action>
1. Create `apps/web/app/(dashboard)/modules/layout.tsx` — server component. Wraps children in `<div className={`${fraunces.variable} min-h-screen`}>`. Import `fraunces` from `@/lib/fonts`. This scopes Fraunces to the `/modules/*` route segment only per RESEARCH.md Open Question 1 recommendation — NOT loaded on every dashboard page.

2. Create `apps/web/app/(dashboard)/modules/threshold/page.tsx` — server component. Composes the sections in order:
   - `<HeroSection>` with:
     - eyebrow: `"Module 2"`
     - title: `"The Threshold Experience"`
     - tagline (EXACT, full sentence including em dash): `"The Threshold Experience — your client's first 48 hours, built from your sales call."` — wait, the hero title carries the name and the tagline is the rest. Implementation: title `"The Threshold Experience"` + tagline `"your client's first 48 hours, built from your sales call."` so that the rendered text concatenated reads exactly the CLAUDE.md / MODULE-001 copy. Verify the tagline string is character-for-character identical to the part after the em dash.
     - primaryCta: `{ label: "Book your intro call", action: scrollTo("#cta") }`
     - secondaryCta: `{ label: "Talk to Daniel first →", href: "mailto:djn203040@gmail.com?subject=The Threshold Experience" }`
   - `<WhatItIs>` — copy: 1 paragraph (3–4 sentences) about the first-48-hours moment. Premium tone, no placeholder.
   - `<HowItWorks>` — three steps: (1) "Your call ends" → we ingest the transcript. (2) "We craft 48 hours of touchpoints" → emails, follow-ups, sequencing. (3) "Your client crosses the threshold" → onboarded, oriented, retained. Tighten copy to one sentence per step.
   - `<WhyItMatters>` — outcome-framed: the cost of a cold first 48 hours, the compounding value of an engineered one.
   - `<SocialProofSection>` — placeholder quote marked `data-placeholder="true"` so reviewers can spot it. (Real quote supplied by Daniel during launch — flag in PR.)
   - `<CtaSection id="cta">` with:
     - headline: `"Book your intro call"`
     - calLink: `"daniel/threshold-intro"`
     - calNamespace: `"threshold"`
     - secondaryMailto: `"mailto:djn203040@gmail.com?subject=The Threshold Experience"`
     - secondaryLabel: `"Talk to Daniel first →"`
   - Wrap entire page body in an error boundary (`<ErrorBoundary>` if one exists in the codebase, else use Next 16 `error.tsx` colocation — verify and use the project's existing pattern).

3. Create `apps/web/app/(dashboard)/modules/continuation/page.tsx` — same structure with Module 3 copy:
   - eyebrow: `"Module 3"`
   - title: `"The Continuation"`
   - tagline: `"thirty days before they leave, we remind them why they stayed."` (concatenated with title produces the exact CLAUDE.md MODULE-002 line)
   - HowItWorks steps: (1) "Day -30" → system detects approaching churn moment. (2) "We surface the reason they stayed" → from prior call transcripts and engagement signals. (3) "They renew" → before they consciously consider not to.
   - CtaSection: calLink `"daniel/continuation-intro"`, namespace `"continuation"`, secondaryMailto `"mailto:djn203040@gmail.com?subject=The Continuation"`.

4. Edit `apps/web/components/shell/SidebarNav.tsx`:
   - Update the `LOCKED` array: change `cta` from `"Book a call"` to `"Learn more →"` for both entries.
   - Add `href` to each LOCKED entry: `"/modules/threshold"` and `"/modules/continuation"`.
   - Update the LOCKED rendering block (the part that currently renders `<div>` per RESEARCH.md Workstream 1) to wrap each tile in `<Link href={item.href}>`. Preserve existing glass-card styling (`backdrop-blur-md`, `bg-white/10`, `bg-secondary/60`).
   - Replace any existing `LockSimple` icon usage on the tile — keep the lock visual; the navigation now leads to a sell page, but the module itself is still locked. The lock icon stays as a visual signal.
   - Do NOT remove the `LockSimple` import unless unused elsewhere.

**Verify Cal.com event slugs exist before merging** (user_setup checkpoint task — see Task 3).
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -10</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "your client's first 48 hours, built from your sales call" apps/web/app/\(dashboard\)/modules/threshold/page.tsx && grep -q "thirty days before they leave, we remind them why they stayed" apps/web/app/\(dashboard\)/modules/continuation/page.tsx && grep -q "Learn more" apps/web/components/shell/SidebarNav.tsx && grep -q "daniel/threshold-intro" apps/web/app/\(dashboard\)/modules/threshold/page.tsx && grep -q "daniel/continuation-intro" apps/web/app/\(dashboard\)/modules/continuation/page.tsx</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "/modules/threshold" apps/web/components/shell/SidebarNav.tsx && grep -q "/modules/continuation" apps/web/components/shell/SidebarNav.tsx</automated>
  </verify>
  <done>
    Both module pages exist and render exact CLAUDE.md hero copy. SidebarNav LOCKED tiles route internally to `/modules/threshold` and `/modules/continuation` with `"Learn more →"` microcopy. Cal.com event slugs `daniel/threshold-intro` and `daniel/continuation-intro` referenced in CtaSection calls. Fraunces scoped via `modules/layout.tsx`, not root layout.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual + Cal.com integration human verification</name>
  <what-built>
    - `/modules/threshold` and `/modules/continuation` long-form sell pages with editorial-premium typography (Fraunces variable serif).
    - Sidebar tiles route internally (not external cal.com link). Microcopy reads "Learn more →".
    - Cal.com inline embed mounted in CTA section using `@calcom/embed-react` with per-module namespaces.
    - Reveal-on-scroll animations fire once per section.
  </what-built>
  <how-to-verify>
    Before this checkpoint, confirm Daniel has created the two Cal.com event types:
    1. https://cal.com/event-types — verify `daniel/threshold-intro` exists and is public.
    2. https://cal.com/event-types — verify `daniel/continuation-intro` exists and is public.

    Then:
    3. Run `pnpm --filter web dev`. Sign in as a coach.
    4. Visit `/dashboard`. Confirm the two locked module tiles in sidebar show "Learn more →" (not "Book a call").
    5. Click "The Threshold Experience" tile. Confirm navigation to `/modules/threshold` (no external redirect).
    6. Verify hero text exactly reads `"The Threshold Experience"` + tagline `"your client's first 48 hours, built from your sales call."` (combined the CLAUDE.md MODULE-001 line).
    7. Scroll through all 6 sections. Confirm reveal animations fire on each (`whileInView`, once only).
    8. Reach the CTA section. Confirm Cal.com inline picker loads with the threshold-intro event type. Pick a time — confirm the booking flow opens (don't submit).
    9. Toggle dark/light theme using `ThemeToggle`. Confirm Cal.com embed re-syncs to the new theme.
    10. Repeat steps 5–9 for `/modules/continuation` with Module 3 copy and `daniel/continuation-intro` slug.
    11. Browser dev console — confirm zero errors on either page.
    12. Inspect a non-module dashboard page (e.g. `/leads`). Confirm Fraunces is NOT applied to body text (scoped to `/modules/*` only).
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Cal.com iframe | Third-party booking embed loads on coach's browser; no PII flows out from our app to Cal.com beyond what the coach types into the iframe themselves. |
| Browser → mailto:djn203040 | Standard mailto link; user's mail client handles it. No exposure beyond Daniel's email address (already public in CLAUDE.md). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01-01 | Information Disclosure | Cal.com iframe | accept | Cal.com iframe is sandboxed by browser. We pass only the public event-type slug; no coach PII reaches Cal.com. Cal.com's privacy posture is their responsibility. |
| T-05-01-02 | Tampering | SidebarNav LOCKED tiles | mitigate | Tiles use static `Link href="/modules/threshold"` strings — no user input concatenation. Next.js routing prevents arbitrary route injection. |
| T-05-01-03 | Spoofing | Cal.com namespace collision | mitigate | Each module uses a distinct namespace (`"threshold"` vs `"continuation"`) per RESEARCH.md Pitfall 1. Prevents iframe theme/state bleeding across pages. |
| T-05-01-04 | Denial of Service | Cal.com embed CDN outage | accept | If Cal.com is down, the iframe section degrades; rest of page renders. Secondary mailto CTA remains functional. Low-value target, low probability. |
| T-05-01-05 | Information Disclosure | Module pages auth | mitigate | Pages live under `(dashboard)` route group — inherit existing auth gate. Unauthenticated users get redirected to login (existing behavior, no change needed). |
</threat_model>

<verification>
- `pnpm --filter web exec tsc --noEmit` — zero errors
- `pnpm --filter web build` — succeeds; Fraunces font downloaded at build time
- Manual: both pages render hero copy verbatim
- Manual: Cal.com embed mounts and accepts a booking selection
- Manual: dark/light theme toggle re-themes Cal.com embed
- Manual: sidebar tiles navigate internally (no `cal.com/daniel` external URL)
- Manual: zero console errors on both pages
- Manual: Fraunces NOT applied on non-module dashboard routes
- Manual: `/impeccable audit` run against all 7 new module components (gating step — finalized in Plan 05)
</verification>

<success_criteria>
- MODULE-001 satisfied: Module 2 sell screen live at `/modules/threshold` with CLAUDE.md tagline verbatim
- MODULE-002 satisfied: Module 3 sell screen live at `/modules/continuation` with CLAUDE.md tagline verbatim
- MODULE-003 satisfied: both pages render premium long-form editorial copy — no generic placeholder visible to coaches (placeholder testimonial quotes are tagged `data-placeholder="true"` for reviewer spotting)
- Phase 5 exit criteria "Module 2 sell screen live" and "Module 3 sell screen live" achieved
- Sidebar tile rerouting verified (Phase 4 implicit dependency — locked tiles no longer external)
</success_criteria>

<output>
After completion, create `.planning/phases/05-polish/05-01-SUMMARY.md` summarizing:
- Files created (11 component + 2 page + 1 layout + 1 fonts.ts)
- Files modified (SidebarNav.tsx, globals.css, package.json)
- Confirmation that Cal.com event types `daniel/threshold-intro` and `daniel/continuation-intro` exist
- Any deferred placeholder copy that Daniel must replace before public launch (testimonial quotes)
- Component inventory for the Plan 05 Impeccable sweep
</output>

## Dependencies

- **Depends on Plan 05-03 (Settings consolidation):** Indirect — Plan 05-03 owns the schema migration; this plan does not touch any database columns. Marked `depends_on: [05-03]` to ensure migration lands first as a defensive ordering, since Plan 05-04 (E2E suite) will exercise both. If Plan 05-03 is delayed, Plan 05-01 could ship independently; the dependency is for wave ordering safety.
- **Does not block:** Plan 05-02, Plan 05-03 (parallel-safe in Wave 2 by file ownership — zero overlap with their `files_modified`).
- **Blocked-by (external):** Daniel must create the two Cal.com event-type slugs before the human-verify checkpoint can pass.

## Risks + Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Cal.com event slugs don't exist at merge time | Human-verify checkpoint blocks merge until confirmed | Land the pages without Cal.com event types live; fallback CTA = mailto only |
| Fraunces leaks into other dashboard surfaces | Scoped layout at `(dashboard)/modules/layout.tsx` only; verified in checkpoint step 12 | Move font import out of layout if leak occurs |
| `@calcom/embed-react` major version breaks before launch | Pin to `^1.5.3`; lockfile commit | Pin to exact `1.5.3` if minor breaks; revert to raw script tag as last resort |
| Placeholder testimonial copy ships to production | `data-placeholder="true"` attribute makes them grep-spottable; flag in PR | Remove section or fill with Daniel-supplied quote pre-launch |
