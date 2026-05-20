# Phase 5: Polish - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Take the system from "working" to "launch-ready":

1. **Locked module sell screens** — Convert the small sidebar tiles for Module 2 (The Threshold Experience) and Module 3 (The Continuation) into full long-form dashboard routes with embedded Cal.com booking and editorial-premium visual treatment.
2. **Onboarding wizard** — Dedicated `/onboarding` flow that walks a brand-new coach through Gmail connect → voice model (≥8 examples) → first-lead demo walkthrough → notification channel pick, with abandonment-resume behavior and demo-lead seeding.
3. **Settings page consolidation** — Replace the three orphan sub-routes (`/settings/autonomous`, `/settings/notifications`, `/settings/voice`) with a single scrollable `/settings` page composed of six vertical sections (Profile, Notifications, Autonomous mode, Voice model, Integrations, Danger zone), and ship the new Profile section + Danger zone.
4. **Playwright E2E launch suite** — Five launch-critical security/safety tests + three new feature E2Es; run against a hermetic local Supabase via the supabase CLI; per-test fixtures.
5. **Impeccable polish sweep** — Full audit pass on every component under `apps/web/components/` before declaring launch readiness.

Phase 5 is the final phase before launch. No new product capabilities — only the surfaces, flows, and tests that turn the existing system into a product Daniel can hand a coach.

</domain>

<decisions>
## Implementation Decisions

### Locked module sell screens

- **D-01:** Sell screens live as **dedicated dashboard routes** inside the `(dashboard)` shell:
  - `apps/web/app/(dashboard)/modules/threshold/page.tsx`
  - `apps/web/app/(dashboard)/modules/continuation/page.tsx`
  Clicking the locked tiles in `SidebarNav.tsx` (lines 13-26) navigates to these routes (replace the current `cal.com/daniel` external link). They are real product surfaces, not promotional overlays.
- **D-02:** Each module page is **long-form: 4–6 sections, single column, scrollable**:
  1. **Hero** — module name (display serif), tagline from CLAUDE.md ("your client's first 48 hours…" / "thirty days before they leave…"), one art-directed visual or animated mockup, primary CTA above the fold.
  2. **"What it is"** — one paragraph + a small inline visual (no card-in-card-in-card).
  3. **"How it works"** — 3-step horizontal sequence (icons or numbered steps), each step one sentence.
  4. **"Why it matters"** — outcome-framed section: the coaching business problem this solves.
  5. **Social proof / vision** — testimonial pull-quote or "what success looks like" snapshot. (Daniel supplies real quotes during planning; placeholder text in PRs is flagged.)
  6. **CTA section** — embedded Cal.com inline picker + secondary "or message Daniel" mailto link.
- **D-03:** **Visual direction is editorial premium / quiet luxury.** Concretely:
  - Generous whitespace (section padding ≥ `py-24`), single-column max width ~`max-w-3xl` for text sections, wider for visuals.
  - Serif display typeface for headlines (a Google Font that ships with Next.js `next/font` — researcher picks; Fraunces, Cormorant Garamond, or Domine are candidates). Body stays in the existing sans.
  - Warm, soft palette matching the dashboard glass/frosted aesthetic (the existing `bg-secondary/60 dark:bg-white/5` family). No neon green, no dark purple, no tech-bro accents (per CLAUDE.md).
  - Motion: reveal-on-scroll only (Framer Motion `whileInView`), no autoplay video, no parallax, no scroll-jacking.
  - Dark + light both supported via existing `ThemeToggle`.
  - Taste skills to invoke during planning: `huashu-design` (for hi-fi prototype prep), `high-end-visual-design` (for spacing/typography rules), `minimalist-ui` (warm monochrome guidance). `impeccable` audit is mandatory before merge.
- **D-04:** **CTA mechanism is the embedded Cal.com inline picker** (script tag + `data-cal-link="daniel/..."`). Each module gets its own Cal.com event-type slug supplied by Daniel during planning (e.g., `daniel/threshold-intro` and `daniel/continuation-intro`) so booking analytics segment by module. Loaded with `next/script` strategy `lazyOnload` to keep initial render fast.
- **D-05:** **Sidebar tiles in `SidebarNav.tsx` keep their compact look** but their `<a href="https://cal.com/...">` becomes `<Link href="/modules/threshold">` / `<Link href="/modules/continuation">`. The "Book a call" microcopy on the tile changes to "Learn more →" so the click intent matches the destination.

### Onboarding wizard

- **D-06:** **Dedicated route at `/onboarding`** under a new route group (`apps/web/app/(onboarding)/`). It is NOT inside `(dashboard)` — onboarding has its own minimal shell (logo + step indicator + skip-for-now link in dev only). On first login, the dashboard layout server-side checks `coaches.onboarding_completed_at IS NULL` and `next/navigation.redirect`s to `/onboarding`.
- **D-07:** **Four required steps** (in order):
  1. **Connect Gmail** — reuse the existing Phase 1 Gmail OAuth install/callback flow. Step is complete when `integrations` row for `provider = 'gmail'` reaches `status = 'connected'`.
  2. **Build voice model** — reuse the Phase 2 voice model builder UI. Step is complete when the coach has stored ≥ 8 examples (matching VOICE-004). Wizard MUST enforce this — no "skip" button on this step (it's the AI's quality floor).
  3. **First lead walkthrough** — see D-09. Step is complete when the coach has clicked Approve on the demo draft.
  4. **Pick a notification channel** — coach must enable at least one of {Dashboard (locked-on), Email, Slack, WhatsApp, SMS}. Since Dashboard is locked ON in the matrix (Phase 4 D-13), technically every coach already has one channel. This step shows the matrix and forces them to choose at least one *additional* channel beyond Dashboard, OR explicitly confirm "Dashboard only" via a checkbox.
- **D-08:** **Optional / deferred to Settings (post-onboarding):** full Notifications matrix tuning, autonomous mode selection (defaults `off`), profile fields (avatar, role/title, timezone, signature, booking URL).
- **D-09:** **First lead walkthrough uses a seeded demo lead** (no real send):
  - On step entry, a one-time demo lead is inserted under the coach: `name = 'Demo Lead — Alex Rivera'`, `source = 'manual'`, `status = 'call_completed'`, with a pre-canned sample transcript stored in `external_ids.demo = true`.
  - An AI draft is generated server-side using the coach's just-built voice model (Phase 2 ai-engine package).
  - Coach sees the draft in the wizard's queue preview, clicks Approve.
  - The approval is intercepted — it does NOT actually call Gmail send. Instead it shows a celebratory "This is what'll happen on every real lead" confirmation screen with the message body and a "Sent to coach's Gmail draft folder" disclaimer (so the coach can see the real output in Gmail without a real recipient).
  - After completion, the demo lead is **soft-archived** (`status = 'archived'`, hidden from default lead list) but viewable in Settings → "View your onboarding demo" for reference.
- **D-10:** **Resume behavior — redirect once, then dismissable banner:**
  - First login while `onboarding_completed_at IS NULL` → server-side redirect to `/onboarding/{next-incomplete-step}`.
  - If coach closes the tab / navigates away after the first redirect, the dashboard renders a slim sticky banner at top: "Finish setup — {N} of 4 steps remaining → Resume". Banner opens `/onboarding/{next-step}` inline. Banner CTA is dismissable per-session.
  - After **7 days** of `onboarding_completed_at IS NULL`, the banner is permanently dismissed (no nag) but remains accessible from `/settings` under a "Finish onboarding" section.
  - Daniel sees abandonment in `/admin` via a new "Onboarding" column on `CoachRosterTable` showing `{N}/4 steps · started {ago}` so he can reach out manually (matches operator-led model).
- **D-11:** **Progress persistence — new column on `coaches`:** `onboarding_progress JSONB NOT NULL DEFAULT '{}'`. Shape:
  ```json
  {
    "gmail_connected_at": "2026-05-20T...",
    "voice_model_completed_at": "2026-05-20T...",
    "first_lead_completed_at": "2026-05-20T...",
    "notifications_picked_at": "2026-05-20T...",
    "banner_dismissed_until": "2026-05-21T..." // session-level, NULL after 7d permanent
  }
  ```
  And `onboarding_completed_at TIMESTAMPTZ` (nullable) set when all 4 steps are filled.

### Settings page shape & profile

- **D-12:** **Single scrollable `/settings` page** at `apps/web/app/(dashboard)/settings/page.tsx`, six vertical sections with anchor IDs:
  1. `#profile` — Profile fields (D-13)
  2. `#notifications` — Existing matrix (lifted from `/settings/notifications` into this page as a section)
  3. `#autonomous` — Existing autonomous mode toggle (lifted from `/settings/autonomous`)
  4. `#voice` — Existing voice model editor (lifted from `/settings/voice`)
  5. `#integrations` — Gmail / Slack / Twilio / Calendar connection cards (currently scattered; Phase 5 consolidates here)
  6. `#danger` — Danger zone (D-14)
  Each section has its own server component for data fetching, mounted client islands only where interactivity exists. Top of page has a sticky in-page nav (anchor pills) for jump-to.
- **D-13:** **Existing sub-routes redirect to anchors:** `/settings/autonomous` → `/settings#autonomous`, same for `/settings/notifications` and `/settings/voice`. Use Next.js redirects in `next.config.ts` for permanent 301s. This preserves any external links / email links coaches may have bookmarked.
- **D-14:** **Profile section fields** (all four chosen by Daniel):
  - **Display name** — coach's preferred name (defaults to `coaches.name`, separately editable so they can use "Coach Alex" or similar without changing legal/billing name).
  - **Avatar / photo** — uploaded to Supabase Storage in a new bucket `coach-avatars/` with RLS scoped to `coach_id`. Stored URL on `coaches.avatar_url`. Max 5MB, jpg/png/webp, resized server-side to 512×512.
  - **Role / title** — free text (e.g., "High-performance coach", "Business strategist"). New column `coaches.role_title TEXT`. Displayed in admin's CoachRosterTable.
  - **Timezone** — IANA timezone string (e.g., `Europe/Copenhagen`). Auto-detected on first load via `Intl.DateTimeFormat().resolvedOptions().timeZone`, editable via a searchable dropdown. New column `coaches.timezone TEXT`.
  - **Working hours** — start/end time-of-day pair (e.g., `09:00`–`18:00`). Drafts use this as the default send window — drafts scheduled outside the window are nudged to the next morning slot. New column `coaches.working_hours JSONB` shape `{ "start": "09:00", "end": "18:00" }`.
  - **Email signature** — multi-line text, appended to every coach-sent email. Shown as a live preview block in `DraftCard.tsx` (already supports inline preview). New column `coaches.email_signature TEXT`.
  - **Public booking URL** — coach's own cal/calendly link. Available as `{booking_url}` token in voice-model templates. New column `coaches.public_booking_url TEXT` with URL validation.
- **D-15:** **Danger zone section at the bottom of `/settings`** (anchor `#danger`). Three actions:
  1. **Disconnect Gmail** — sets `integrations.status = 'disconnected'`, clears Vault secret. Requires typing `disconnect gmail` verbatim. Logged.
  2. **Disconnect Slack** / **Disconnect Twilio** — same pattern, per-integration.
  3. **Delete account** — requires typing coach's own email verbatim. Hard delete cascades via existing `ON DELETE CASCADE` FK chains. Sends one final email to coach + alerts Daniel via Resend.
  Every action writes a row to a new audit table: `audit_log (id, coach_id, action, metadata JSONB, ip_address, user_agent, created_at)` with RLS scoped to `coach_id` for read (and a service-role-bypass for admin view).
- **D-16:** **Settings autosave + toast** — every section autosaves on blur / debounced 500ms after change. Toast confirms ("Saved" + small checkmark). No "Save" button per section. Danger zone is the exception — it requires the explicit type-to-confirm gesture.

### Playwright E2E launch suite + impeccable sweep

- **D-17:** **Test environment is local Supabase via the supabase CLI** (`supabase start`). Each developer runs `supabase start` in a separate terminal before running tests. The schema is rebuilt from `supabase/migrations/*.sql` exactly. CI runs the same via the official `supabase/setup-cli` GitHub Action — full hermetic env per CI run. Test base URL stays `http://localhost:3000` and Next.js gets a `.env.test` pointing at the local Supabase endpoints (`http://127.0.0.1:54321`).
- **D-18:** **Seeding strategy — per-test fixtures via `test.beforeEach`** with helper functions in `apps/web/tests/fixtures/`:
  - `createCoach(overrides?)` — inserts a coach via service-role SQL, returns `{ id, email, sessionCookie }`.
  - `createLead(coachId, overrides?)` — inserts a lead.
  - `createDraft(coachId, leadId, overrides?)` — inserts a draft in `pending` status.
  - `cleanupCoach(coachId)` — cascading delete in `afterEach`.
  - `mockOauthCallback(provider, coachId)` — short-circuits OAuth flows by writing the expected `integrations` row + Vault secret.
  Every test composes the rows it needs in `beforeEach` and tears down in `afterEach`. Security tests (cross-tenant) get two distinct coaches per test.
- **D-19:** **Launch-critical Playwright tests** (the 5 from exit criteria):
  1. `tests/e2e/duplicate-sequence-prevention.spec.ts` — Creating two sequences with the same `(lead_id, sequence_type)` rejects with 409.
  2. `tests/e2e/cross-tenant-isolation.spec.ts` — Coach A authenticated, calls `GET /api/leads/{coach-B-lead-id}` → 404 (NOT 200 with empty body, NOT 403 leaking existence). Repeats for drafts, notification logs, settings.
  3. `tests/e2e/pre-send-safety-check.spec.ts` — Draft on a lead with `do_not_contact = true` → Approve returns 409 with `runPreSendSafetyCheck` reason. Same for `lead.status = 'unsubscribed'`, terminal sequence statuses, and bounce-blocked leads.
  4. `tests/e2e/webhook-signature-bypass.spec.ts` — Slack interactivity webhook with invalid `X-Slack-Signature` → 401. Twilio status webhook with invalid `X-Twilio-Signature` → 401. Gmail Pub/Sub with invalid token → 401. All seven calendar provider webhooks with invalid signatures → 401.
  5. `tests/e2e/full-approval-flow.spec.ts` — Seed coach + lead + pending draft → coach signs in → dashboard renders draft → Approve clicked → Gmail send mocked → draft transitions `pending → approved → sent`, `notification_log` gets a `sent` row, dashboard reflects.
- **D-20:** **Additional Phase 5 E2E coverage** (Daniel-confirmed scope):
  6. `tests/e2e/onboarding-completion.spec.ts` — Full wizard golden-path: new coach → /onboarding redirect → Gmail mock-OAuth → upload 8 voice examples → demo lead approve → pick notification channel → `onboarding_completed_at` set → dashboard renders without banner.
  7. `tests/e2e/locked-module-pages.spec.ts` — `/modules/threshold` and `/modules/continuation` render with hero, sections, Cal.com embed iframe mounts, no console errors, deep-link from sidebar tiles works.
  8. `tests/e2e/settings-save.spec.ts` — Each section saves: profile timezone change persists, notifications matrix toggle writes to DB, voice example add appears in `coaches.voice_model`, danger-zone Gmail disconnect requires correct confirm text.
- **D-21:** **Impeccable sweep — full dashboard pass.** Every component under `apps/web/components/` runs through `/impeccable audit`. Audit results land in `.planning/phases/05-polish/IMPECCABLE-RESULTS.md` per component (scored). Exit criteria: every component passes (no RED findings unaddressed; YELLOW findings either fixed or explicitly deferred with a recorded reason). The Phase 1 19/20 score for `DraftCard.tsx` is re-validated.

### Schema additions

- **D-22:** **One new migration** for Phase 5 (`supabase/migrations/20260520000001_phase5.sql`):
  - `coaches.onboarding_completed_at TIMESTAMPTZ` (nullable)
  - `coaches.onboarding_progress JSONB NOT NULL DEFAULT '{}'`
  - `coaches.avatar_url TEXT`
  - `coaches.role_title TEXT`
  - `coaches.timezone TEXT` (existing? researcher verifies; add if missing)
  - `coaches.working_hours JSONB DEFAULT '{"start":"09:00","end":"18:00"}'`
  - `coaches.email_signature TEXT`
  - `coaches.public_booking_url TEXT`
  - `audit_log` table — `(id UUID PK, coach_id UUID FK, action TEXT, metadata JSONB, ip_address INET, user_agent TEXT, created_at TIMESTAMPTZ)`. RLS: `coach_id = auth.uid()` for SELECT; service role only for INSERT.
  - `storage.buckets` row for `coach-avatars` (public read of own avatar, RLS-scoped write).
- **D-23:** **No changes to leads or drafts tables** — onboarding demo lead uses existing schema (`source = 'manual'`, `external_ids.demo = true`).

### Claude's Discretion

- Exact serif typeface for module pages — recommendation is Fraunces (variable, friendly-editorial); planner picks the final choice after `next/font` compatibility check.
- Cal.com inline embed configuration shape (`data-cal-link` vs `data-cal-namespace`) — researcher verifies against Cal.com docs.
- Whether the sticky settings nav is anchor pills (chip-style) or a left-rail mini-toc on wide viewports — planner picks based on visual hierarchy with Profile photo above.
- Exact debounce duration for settings autosave (300ms vs 500ms vs 800ms) — planner picks.
- Whether the audit_log table fires from a Postgres trigger on `coaches.*` UPDATE or from explicit API-route writes — researcher recommends; planner finalizes. Recommendation: explicit writes for the danger-zone actions only; broader audit logging is its own future phase.
- Whether the `/onboarding` route group uses its own root layout or a shared minimal one — planner decides.
- Avatar resize implementation: `sharp` server-side vs. Supabase Storage transforms — researcher checks Storage transform availability and picks.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture decisions (locked)
- `CLAUDE.md` — module 2/3 lock CTA copy ("The Threshold Experience — your client's first 48 hours, built from your sales call. [Book a call]" / "The Continuation — thirty days before they leave, we remind them why they stayed. [Book a call]"). Design rules (glass/frosted, warm uplifting, NOT neon green / dark purple / tech-bro). Phase 5 scope under "Build Phases."
- `.planning/ROADMAP.md` — Phase 5 plans list (4 plans: locked module sell screens, onboarding wizard, settings page, Playwright E2E), requirements covered (MODULE-001/002/003, VOICE-005), exit criteria including "all components pass /impeccable audit."
- `.planning/REQUIREMENTS.md` — REQ-IDs with full text: MODULE-001, MODULE-002, MODULE-003, VOICE-005.

### Schema (deployed — check before adding columns)
- `supabase/migrations/20260505000001_enums.sql` — existing enums.
- `supabase/migrations/20260505000002_tables.sql` — `coaches` table (id, name, email, role, voice_model JSONB, service_info JSONB, autonomous_mode, created_at, updated_at). Phase 5 adds onboarding + profile columns (D-22).
- Phase 4 migration adds `notification_preferences`, `consumed_tokens`, `drafts.followup_count`, `drafts.review_token_nonce` — Phase 5 does not touch these.
- Phase 5 migration: `supabase/migrations/20260520000001_phase5.sql` (new — adds onboarding + profile columns, audit_log table, coach-avatars storage bucket).

### Existing code (reuse and extend)
- `apps/web/components/shell/SidebarNav.tsx` (lines 13-26) — `LOCKED` array drives the Module 2/3 tiles. Phase 5 updates `href` to `/modules/threshold` and `/modules/continuation`, and changes CTA microcopy to "Learn more →". Do NOT duplicate the tile rendering.
- `apps/web/app/(dashboard)/settings/page.tsx` — current settings entry point. Phase 5 rewrites this to host the six vertical sections.
- `apps/web/app/(dashboard)/settings/autonomous/page.tsx`, `apps/web/app/(dashboard)/settings/notifications/page.tsx`, `apps/web/app/(dashboard)/settings/voice/page.tsx` — current sub-routes. Phase 5 converts these into 301 redirects to anchors on `/settings`, and lifts their content into the new sections.
- `apps/web/components/drafts/DraftCard.tsx` — reused inside the onboarding wizard's first-lead walkthrough (read-only mode with intercepted approve).
- `apps/web/components/drafts/DraftQueueScaffold.tsx` — reused in the wizard preview (single demo draft).
- `apps/web/lib/email/template.ts` — pattern for the demo-lead "this is what'll happen" celebration email Gmail-draft.
- `packages/ai-engine` — voice-model + draft generation. Reused inside the wizard's voice-model step (Phase 2 builder UI) and demo-lead AI draft.
- `apps/web/tests/e2e/*.spec.ts` (12 existing tests, e.g., `dashboard-approve-flow.spec.ts`, `admin-dashboard.spec.ts`) — patterns Phase 5 follows. New fixtures helpers live in `apps/web/tests/fixtures/`.
- `apps/web/playwright.config.ts` — testDir, baseURL, webServer config. Phase 5 adds a `.env.test` and a `globalSetup` that verifies `supabase status` is running before tests start.

### Phase decisions that carry forward
- `.planning/phases/01-foundation/01-CONTEXT.md` — DraftCard 19/20 impeccable score (must re-validate during Phase 5 full sweep).
- `.planning/phases/02-intelligence/02-CONTEXT.md` — voice model builder UI (reused as wizard step 2). VOICE-004 8-example minimum enforced by ai-engine guard; wizard surfaces same constraint.
- `.planning/phases/03-automation/03-CONTEXT.md` — `runPreSendSafetyCheck` (D-25) is the function exercised by the pre-send-safety-check E2E. Pending Actions section on dashboard not touched in Phase 5.
- `.planning/phases/04-approval-channels/04-CONTEXT.md` — Notifications matrix UI (D-12) is what Phase 5 lifts into the consolidated `/settings#notifications` section. Postgres advisory-lock CAS path (D-22) is what the full-approval-flow E2E exercises. Slack/Twilio/Resend dispatcher is what the webhook-signature-bypass E2E targets.

### External docs (researcher should verify during research phase)
- **Cal.com Inline Embed** — `https://cal.com/docs/enterprise-features/embed` and the `@calcom/embed-react` package. Verify event-type slug + namespace shape, lazy-load behavior, light/dark theming support.
- **Next.js 15 `next/font`** with serif display typefaces — Fraunces, Cormorant Garamond, Domine. Variable-font support, layout-shift mitigation.
- **Supabase Local Development** — `supabase/setup-cli` GitHub Action, `supabase start` Docker requirements, schema-from-migrations behavior, port conflicts.
- **Supabase Storage** — public-read bucket policies, image transforms availability, RLS on storage objects.
- **Framer Motion `whileInView`** — viewport options, performance for long-form pages.
- **Playwright `test.beforeEach` + fixtures** — recommended patterns for per-test isolation; `request.newContext()` for cross-tenant assertion calls.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SidebarNav.tsx` already has the `LOCKED` metadata and tile rendering — Phase 5 only updates `href` and tile microcopy, no new component.
- `DraftCard.tsx` is the canonical draft surface — used by the onboarding wizard's first-lead walkthrough in a read-only mode (Approve button intercepted to show the celebration screen instead of calling Gmail send).
- The voice model builder UI from Phase 2 is the wizard's step-2 implementation — no new builder UI needed in Phase 5.
- The Notifications matrix component from Phase 4 (D-12) is lifted into `/settings#notifications`. The component itself doesn't change; only its container does.
- Phase 4's `notification_preferences` and `consumed_tokens` tables, and the `runPreSendSafetyCheck` from Phase 3, are exactly what the launch-critical Playwright tests exercise.

### Established Patterns
- **Route groups** — existing `(auth)`, `(dashboard)`, `(review)` groups. Phase 5 adds `(onboarding)` for the wizard's minimal shell.
- **Server-side redirects** — already used in `(dashboard)/layout.tsx` for auth-gating. Phase 5 adds an onboarding check that redirects to `/onboarding` when `coaches.onboarding_completed_at IS NULL`.
- **Supabase storage** — not yet used in the codebase. Phase 5 introduces the `coach-avatars` bucket as the first storage usage; pattern set here for future buckets.
- **In-page anchor navigation** — not currently used; Phase 5 introduces a sticky in-page nav for `/settings`. Pattern uses `scroll-margin-top` for sticky-header offsets.
- **`/impeccable audit` workflow** — already invoked manually; Phase 5 makes it a gating step before merge.

### Integration Points
- `apps/web/app/(dashboard)/modules/threshold/page.tsx` (new) — Module 2 sell page.
- `apps/web/app/(dashboard)/modules/continuation/page.tsx` (new) — Module 3 sell page.
- `apps/web/components/modules/HeroSection.tsx`, `HowItWorks.tsx`, `CalBookingEmbed.tsx`, etc. (new) — shared sell-page primitives.
- `apps/web/app/(onboarding)/layout.tsx` + `apps/web/app/(onboarding)/onboarding/[step]/page.tsx` (new) — wizard shell + dynamic step route.
- `apps/web/components/onboarding/WizardShell.tsx`, `StepGmail.tsx`, `StepVoice.tsx`, `StepFirstLead.tsx`, `StepNotifications.tsx` (new).
- `apps/web/lib/onboarding/demo-seed.ts` (new) — seeds the demo lead + sample transcript.
- `apps/web/components/dashboard/OnboardingBanner.tsx` (new) — slim sticky banner shown when onboarding incomplete.
- `apps/web/app/(dashboard)/settings/page.tsx` — rewritten as the six-section consolidated page.
- `apps/web/components/settings/ProfileSection.tsx`, `IntegrationsSection.tsx`, `DangerZone.tsx` (new). `NotificationsSection.tsx`, `AutonomousSection.tsx`, `VoiceSection.tsx` (lift existing).
- `apps/web/lib/settings/autosave.ts` (new) — debounced autosave hook.
- `apps/web/tests/fixtures/{createCoach,createLead,createDraft,mockOauth}.ts` (new) — E2E test fixtures.
- `apps/web/tests/e2e/{duplicate-sequence-prevention,cross-tenant-isolation,pre-send-safety-check,webhook-signature-bypass,full-approval-flow,onboarding-completion,locked-module-pages,settings-save}.spec.ts` (new) — 8 new tests.
- `apps/web/next.config.ts` — add 3 permanent redirects (`/settings/autonomous` → `/settings#autonomous` etc.).

</code_context>

<specifics>
## Specific Requirements

- **Module page hero copy** — exactly the CLAUDE.md taglines:
  - Module 2: "The Threshold Experience — your client's first 48 hours, built from your sales call."
  - Module 3: "The Continuation — thirty days before they leave, we remind them why they stayed."
- **Module page CTA** — primary button label "Book your intro call" → opens Cal.com inline picker. Secondary link "Talk to Daniel first →" → `mailto:djn203040@gmail.com?subject=The Threshold Experience` (subject varies per module).
- **Cal.com event-type slugs** — `daniel/threshold-intro` and `daniel/continuation-intro` (Daniel creates these in Cal.com before launch).
- **Onboarding wizard "skip for now"** — disabled in production. Only available when `NODE_ENV !== 'production'` for local development convenience.
- **Voice model minimum** — exactly 8 examples (matches VOICE-004); no override.
- **Notification channel pick** — at minimum one box checked beyond Dashboard, OR explicit "Dashboard only" checkbox toggle that records the choice. Confirmation toast: "Notifications set — you can change these anytime in Settings."
- **Demo lead name** — exactly `"Demo Lead — Alex Rivera"`. Demo lead email: `demo+{coach_id}@sonorous.test` (non-deliverable domain so accidental sends fail loudly).
- **Onboarding banner copy** — exact: `"Finish setup — {N} of 4 steps remaining"` with a "Resume" link. Banner hides after 7 days regardless of completion.
- **Settings page section order** — Profile → Notifications → Autonomous mode → Voice model → Integrations → Danger zone. The order matters: identity first, communication second, behavior third, data fourth, plumbing fifth, destruction last.
- **Profile timezone dropdown** — populated from the standard IANA list filtered by `Intl.supportedValuesOf('timeZone')`.
- **Profile working hours** — defaults to `09:00`–`18:00`. Used as the default `scheduled_send_at` window for drafts (drafts already use a working-window heuristic; Phase 5 makes the window per-coach instead of global).
- **Avatar upload** — max 5MB, accepts `image/jpeg`, `image/png`, `image/webp`. Resized server-side to 512×512 (square crop, center). Old avatar deleted on replace.
- **Danger zone confirm strings**:
  - Disconnect Gmail: type `disconnect gmail` verbatim.
  - Disconnect Slack: type `disconnect slack` verbatim.
  - Disconnect Twilio: type `disconnect twilio` verbatim.
  - Delete account: type the coach's own email verbatim.
- **`audit_log.action` values** — closed enum: `'gmail_disconnected'`, `'slack_disconnected'`, `'twilio_disconnected'`, `'account_deleted'`. New values added in future phases require migration.
- **Playwright `globalSetup`** — verifies `supabase status` returns running services; aborts test run with a clear error if local Supabase isn't up.
- **CI matrix** — Playwright runs on push to any branch; takes ~5 minutes; gates merges to `main`.
- **Impeccable sweep output** — one results file per component under `.planning/phases/05-polish/impeccable/{ComponentName}.md`. Aggregate `IMPECCABLE-SUMMARY.md` lists scores and any deferred YELLOWs.

</specifics>

<deferred>
## Deferred Ideas

- **Module-impression analytics (`module_interest` table)** — write a row when a coach opens a locked module page, so Daniel can see who's looking even without booking. Deferred — analytics infra is a separate concern; for launch, Cal.com booking metrics are the signal.
- **"Show me 3 visual directions" pre-mockup pass** — running `huashu-design`'s fallback mode to spin up editorial/cinematic/dashboard-native variants before committing. Deferred — editorial premium is locked as the direction; if Daniel wants to revisit, this is a future polish phase.
- **Dedicated `/settings/danger` sub-route** for extra friction — deferred in favor of an in-page section. Can be promoted later if the in-page Danger zone proves accident-prone.
- **Operator-only destructive actions** (only Daniel can disconnect / delete) — deferred. Phase 5 ships coach self-serve danger zone; if support load becomes a problem, lock these behind admin in a later phase.
- **Wizard "Daniel-curated per coach"** — operator marks steps as pre-done during onboarding calls — deferred. Phase 5 ships the linear flow; admin override is its own future feature.
- **Real-transcript paste path** in the first-lead walkthrough — deferred in favor of demo lead. If coaches push back wanting to use their own first lead, add the toggle in a future polish phase.
- **`/admin` onboarding-progress visualization** beyond a single column — deferred. Single status column on `CoachRosterTable` is enough for the 5–10-coach launch.
- **Postgres-trigger-based audit logging** for all `coaches.*` mutations — deferred. Phase 5 ships explicit-write audit for danger-zone only; broader auditing is its own phase.
- **Per-section "saved at" indicators** in Settings — deferred in favor of a transient toast. Can revisit if coaches ask for visible save state.
- **Coach-owned "from address" on Resend** (carry-over from Phase 4) — still deferred; tied to per-coach SPF/DKIM setup.
- **PWA / native push** — out of scope.

</deferred>

---

*Phase: 5-polish*
*Context gathered: 2026-05-20*
