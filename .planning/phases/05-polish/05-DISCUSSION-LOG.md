# Phase 5: Polish - Discussion Log

**Date:** 2026-05-20
**Mode:** discuss-phase (default)
**Phase:** 5 — Polish

This log is for human reference. Downstream agents (researcher, planner, executor) consume `05-CONTEXT.md`.

---

## Area 1: Locked module sell screens

### Q1: Destination shape
**Options presented:**
- Dedicated dashboard routes
- Side panel / sheet from sidebar
- Fullscreen takeover modal
- Expand the sidebar tile in place

**Selected:** Dedicated dashboard routes
**Note:** `/modules/threshold` and `/modules/continuation` inside the `(dashboard)` shell.

### Q2: Page depth
**Options presented:**
- Long-form narrative (4-6 sections)
- Mid-form (hero + 3 sections)
- Single hero + CTA
- Different depth per module

**Selected:** Long-form narrative (4-6 sections)
**Note:** 6 sections — Hero, What it is, How it works, Why it matters, Social proof / vision, CTA.

### Q3: Visual direction
**Options presented:**
- Editorial premium — quiet luxury
- Cinematic immersive
- Stitch / dashboard-native
- Show me 3 directions to choose

**Selected:** Editorial premium — quiet luxury
**Note:** Taste skills to invoke: huashu-design, high-end-visual-design, minimalist-ui. Serif display headlines (Fraunces / Cormorant / Domine), generous whitespace, warm-soft palette matching glass/frosted dashboard aesthetic. Motion is reveal-on-scroll only.

### Q4: CTA mechanics
**Options presented:**
- External Cal.com link (current)
- Embedded Cal.com inline picker
- Internal 'request a call' form
- Cal.com embed + interest write-through

**Selected:** Embedded Cal.com inline picker
**Note:** Cal.com inline embed via `next/script` lazyOnload. Slugs: `daniel/threshold-intro` and `daniel/continuation-intro`. No `module_interest` write-through table (deferred).

---

## Area 2: Onboarding wizard

### Q1: Wizard surface
**Options presented:**
- Dedicated /onboarding route (auto-redirect)
- In-dashboard progressive checklist
- Fullscreen modal over dashboard
- Dedicated route + persistent checklist after

**Selected:** Dedicated /onboarding route (auto-redirect)
**Note:** New `(onboarding)` route group with minimal shell.

### Q2: Steps & required vs optional
**Options presented:**
- 3 required, rest optional
- 5 required
- 3 required + 'soft-gate' voice
- Daniel-curated per coach

**Selected:** 3 required + Daniel's added constraint that at least one notification channel must be picked → effective 4 required steps.
**Final shape:** (1) Gmail, (2) Voice model 8+ examples, (3) First lead walkthrough, (4) At least one notification channel.

### Q3: Resume behavior
**Options presented:**
- Auto-redirect until 'onboarding_completed_at' is set
- Redirect once, then dismissable banner
- No auto-redirect after first session
- Daniel sees abandonment in admin

**Selected:** Redirect once, then dismissable banner
**Note:** First-login redirects to `/onboarding/{next-step}`. After that, dashboard shows slim "Finish setup — N of 4 steps remaining" banner. Banner disappears permanently after 7 days, but resume link stays in Settings. Daniel also sees onboarding progress as a new column in `/admin` CoachRosterTable.

### Q4: First-lead walkthrough behavior
**Options presented:**
- Demo lead (seeded, read-only)
- Paste a real transcript
- Connect calendar + wait for first real lead
- Demo lead + 'or paste your own' toggle

**Selected:** Demo lead (seeded, read-only)
**Note:** Seeded `"Demo Lead — Alex Rivera"` with sample transcript + AI draft using coach's voice model. Approve in wizard is intercepted — shows celebration + writes a Gmail draft (no real send). Demo lead soft-archived after completion.

---

## Area 3: Settings page shape & profile

### Q1: Settings surface
**Options presented:**
- Single /settings page, vertical sections
- Tabbed sub-routes (current shape, fleshed out)
- Sidebar nav within /settings
- Sidebar nav + 'last visited' memory

**Selected:** Single /settings page, vertical sections
**Note:** Six sections with anchor IDs — Profile, Notifications, Autonomous mode, Voice model, Integrations, Danger zone. Sticky in-page anchor pills at top. Existing sub-routes 301-redirect to anchors.

### Q2: Profile fields (multiSelect)
**Options presented:**
- Display name + photo + role/title
- Timezone + working hours
- Email signature
- Public booking URL

**Selected:** ALL four.
**Note:** Schema: avatar_url, role_title, timezone, working_hours JSONB ({start, end}), email_signature, public_booking_url. Avatar in Supabase Storage `coach-avatars/` bucket, resized server-side to 512×512.

### Q3: Danger zone
**Options presented:**
- Danger zone section at bottom of /settings
- Separate /settings/danger sub-page
- No coach-facing danger zone — Daniel-only
- Soft actions in /settings, hard actions in /admin only

**Selected:** Danger zone section at bottom of /settings
**Note:** Type-to-confirm verbatim strings (`disconnect gmail`, etc.; own email for delete). Writes to new `audit_log` table.

---

## Area 4: Playwright E2E + impeccable sweep

### Q1: Test environment
**Options presented:**
- Local Supabase via supabase CLI (per-developer)
- Dedicated 'playwright' Supabase project
- Current shared dev project + per-test cleanup
- Local Supabase for CI, dev project for local runs

**Selected:** Local Supabase via supabase CLI (per-developer)
**Note:** `supabase start` for dev. CI via `supabase/setup-cli` Action. Adds `.env.test` + Playwright `globalSetup` that verifies `supabase status`.

### Q2: Seeding strategy
**Options presented:**
- Per-test fixtures via Playwright `test.beforeEach`
- Shared seed + per-test mutations
- Per-test fixtures via service-role SQL helpers
- Hybrid — shared seed for happy-path, fixtures for security tests

**Selected:** Per-test fixtures via Playwright `test.beforeEach`
**Note:** Helpers in `apps/web/tests/fixtures/` — createCoach, createLead, createDraft, cleanupCoach, mockOauthCallback. Each test composes only what it needs; tears down in afterEach.

### Q3: Impeccable sweep scope
**Options presented:**
- Only new Phase 5 surfaces
- Phase 5 + dashboard top-level
- Full dashboard sweep (every component)
- Phase 5 + remediate only RED findings elsewhere

**Selected:** Full dashboard sweep (every component)
**Note:** Every component under `apps/web/components/`. Results land in `.planning/phases/05-polish/impeccable/{Component}.md` + summary. Gating on no RED findings unaddressed.

### Q4: Additional E2E coverage beyond the exit-criteria 5 (multiSelect)
**Options presented:**
- Onboarding completion E2E
- Locked module sell-page render + Cal.com embed loads
- Settings: each section saves correctly
- None — keep the 4 exit-criteria tests only

**Selected:** All three additional tests in scope.
**Note:** Total 8 E2E specs in Phase 5: 5 launch-critical (duplicate-sequence, cross-tenant, pre-send safety, webhook-sig bypass, full approval flow) + 3 feature (onboarding completion, locked module render, settings save).

---

## Claude's Discretion (planner finalizes)

- Exact serif typeface (Fraunces recommended)
- Cal.com inline embed config shape
- Sticky settings nav style (anchor pills vs left-rail)
- Settings autosave debounce duration
- Audit-log: trigger-based vs explicit-write (recommend: explicit for danger zone only)
- `(onboarding)` route group layout: own root or shared minimal
- Avatar resize: `sharp` vs Supabase Storage transforms

---

## Deferred Ideas (captured for future phases)

- Module-impression analytics (`module_interest` table)
- "Show me 3 visual directions" pre-mockup pass via huashu-design fallback mode
- Dedicated `/settings/danger` sub-route
- Operator-only destructive actions
- Wizard "Daniel-curated per coach"
- Real-transcript paste path in first-lead walkthrough
- Postgres-trigger-based audit logging across all coaches mutations
- Per-section "saved at" indicators in Settings
- Coach-owned Resend "from address" (carryover from Phase 4)
- PWA / native push

---

*Phase: 5-polish*
*Discussion completed: 2026-05-20*
