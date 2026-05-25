# Phase 6 — Comprehensive Testing & Security Hardening

**Goal:** The product is built. Before any real coach touches it, we prove three things:
1. **It works** — every feature, every channel, every flow, automated.
2. **Daniel approves** — every human-judgment surface is verified by Daniel personally.
3. **It is secure** — no leaks, no hardcoded secrets, encryption at rest and in transit, RLS verified, OAuth tokens vaulted, webhooks signed, no PII in logs.

**Weeks:** 15–16
**Operator:** Daniel (everything in Section 2)
**Automated:** Claude / CI (everything in Section 1 and 3)

---

## How To Use This Document

This phase has **three sections**, each independently completable, but all must be GREEN before launch:

| Section | Who | When |
|---|---|---|
| **Section 1 — Automated Checks** | Claude + CI | Runs continuously, must pass on `main` |
| **Section 2 — Daniel's Manual UAT** | Daniel personally | One full pass before each launch event |
| **Section 3 — Security Hardening** | Claude (audit) + Daniel (verify) | Full sweep + sign-off |

Each item has a **status box** `[ ]` → check it when verified. A failed check means launch is blocked until it's resolved.

---

# Section 1 — Everything Claude / CI Can Check (Automated)

Everything in this section is automatable. Claude builds the test, CI runs it, you watch the green checkmark.

## 1.1 — Type Safety & Lint Gates

- [ ] `pnpm typecheck` passes across all workspaces (`apps/web`, `packages/*`) with **zero errors**
- [ ] `pnpm lint` passes with **zero warnings** (strict mode, no disabled rules)
- [ ] No `any` types remain in production code (grep audit)
- [ ] No `@ts-ignore` or `@ts-expect-error` without an inline justification comment
- [ ] No `eslint-disable` without an inline justification comment
- [ ] `tsconfig.json` strict mode confirmed: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- [ ] All shared types live in `packages/shared/` — no duplicated type definitions across workspaces

## 1.2 — Unit Test Coverage

- [ ] `pnpm test:unit` passes — 100% green
- [ ] Voice model — Layer 1 profile parsing handles malformed input gracefully
- [ ] Voice model — Layer 2 example selection deterministic on identical input
- [ ] AI engine — context assembler stays within token budget (test with 100-message thread)
- [ ] AI engine — prompt generation deterministic given fixed seed inputs
- [ ] AI engine — guardrails block prompts containing PII placeholders that weren't filled
- [ ] State machine — all valid transitions accepted; all invalid transitions rejected
- [ ] State machine — terminal states (`unsubscribed`, `bounced_hard`, `do_not_contact`) cannot transition out
- [ ] Pre-send safety — blocks send for every terminal lead state (test all 4)
- [ ] Sequence engine — idempotency key prevents duplicate Inngest enrollment
- [ ] Calendar adapters — all 7 providers (Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal) parse webhook payloads into `TCalendarEvent`
- [ ] Calendar adapters — invalid signature rejected for all 7 providers
- [ ] Unsubscribe tokens — HMAC verification round-trips; tampered token rejected
- [ ] Review tokens — single-use nonce; replay attempt returns 410
- [ ] Bounce detector — hard vs soft bounce classified correctly (test with 20 real bounce samples)
- [ ] SMS body builder — output ≤ 160 chars in all cases
- [ ] Multi-channel dispatcher — `Promise.allSettled` semantics: one channel failure does not block others
- [ ] Notification preference matrix — respects per-coach toggles for every event × channel pair

## 1.3 — Integration Tests

- [ ] `pnpm test:integration` passes — 100% green
- [ ] Supabase RLS — every table tested: coach A cannot select/update/delete coach B's rows
- [ ] Supabase RLS — service-role client bypass works only server-side
- [ ] Supabase Vault — OAuth tokens encrypted at rest; cannot be read with anon key
- [ ] Inngest functions — `sequence-no-show` end-to-end with mocked Gmail send
- [ ] Inngest functions — `sequence-call-completed` end-to-end with mocked Gmail send
- [ ] Inngest functions — `reply-handler` pauses sequence + cancels pending drafts + fires reply draft
- [ ] Inngest functions — `gmail-watch` and `gmail-monitor` triggered correctly by Pub/Sub push
- [ ] Inngest functions — `bounce-handler` pauses sequence + notifies coach
- [ ] Inngest functions — `autonomous-mode-b-timer` sleeps + CAS-approves correctly
- [ ] Atomic RPCs — `approveDraftAtomic` advisory-lock prevents double-approval (concurrent test)
- [ ] Atomic RPCs — `holdDraftAtomic` advisory-lock prevents race condition
- [ ] Atomic RPCs — `consumeReviewToken` single-use enforcement
- [ ] Gmail OAuth — token refresh on 401, `invalid_grant` triggers reconnect notification
- [ ] Slack OAuth — token refresh, signature verification on interactivity webhook
- [ ] Twilio status webhook — delivered/failed/undelivered statuses processed
- [ ] Resend webhook — Svix signature verification rejects unsigned payloads

## 1.4 — Playwright E2E Suite

- [ ] `pnpm test:e2e` passes against local Supabase — 100% green
- [ ] Full happy path: invite coach → connect Gmail → add lead → AI draft → approve → sent
- [ ] Cross-tenant isolation: coach A logged in cannot navigate to coach B's lead URL
- [ ] Duplicate sequence prevention: two Calendly webhooks for same lead = one sequence
- [ ] Pre-send safety check: lead marked `unsubscribed` blocks all queued drafts
- [ ] Webhook signature bypass: forged Calendly webhook rejected with 401
- [ ] Approval flow from email review page: token → approve → status updates
- [ ] Approval flow from Slack: button click → atomic approve → message updated
- [ ] Approval flow from WhatsApp: quick-reply approve → sent
- [ ] Onboarding wizard: new coach completes in under 15 minutes (timed test)
- [ ] Autonomous Mode A: type-to-confirm modal enforces exact phrase match
- [ ] Autonomous Mode B: 24h timer auto-sends if no action (use Inngest time-travel)
- [ ] 24h follow-up CTA fires if coach inactive
- [ ] 48h HOLD cascade: draft moves to held state, surfaces in Held tab
- [ ] Unsubscribe link: click → lead state = `unsubscribed` → no future drafts queued
- [ ] Bounce simulation: hard bounce → sequence paused + multi-channel notification fired
- [ ] All 7 calendar providers: synthetic webhook → lead state updated correctly
- [ ] Admin dashboard: Daniel sees all coaches; non-Daniel role gets 403

## 1.5 — Performance & Load

- [ ] Lighthouse score ≥ 90 (Performance, Accessibility, Best Practices, SEO) on dashboard
- [ ] Lighthouse score ≥ 90 on `/onboarding` and locked module sell pages
- [ ] First Contentful Paint < 1.5s on dashboard (Vercel Speed Insights)
- [ ] Largest Contentful Paint < 2.5s on dashboard
- [ ] Cumulative Layout Shift < 0.1
- [ ] API routes p95 < 500ms (Vercel Analytics)
- [ ] Inngest function p95 < 5s for sequence steps
- [ ] Load test: 100 concurrent webhook deliveries → no dropped events (k6 or Artillery)
- [ ] Load test: 50 concurrent draft approvals → no double-sends (advisory lock holds)
- [ ] Upstash Redis rate-limit enforcement verified under burst load

## 1.6 — Accessibility (WCAG 2.1 AA)

- [ ] Axe-core scan: zero violations on every public route
- [ ] Keyboard navigation: every interactive element reachable + visible focus ring
- [ ] Screen reader: dashboard fully navigable with VoiceOver (basic smoke test)
- [ ] Color contrast: all text ≥ 4.5:1, large text ≥ 3:1
- [ ] Form labels: every input has associated `<label>` or `aria-label`
- [ ] Dark mode and light mode both pass axe scan
- [ ] Reduced-motion preference honored (Framer Motion `useReducedMotion`)

## 1.7 — Cross-Browser & Responsive

- [ ] Playwright runs against: Chromium, WebKit, Firefox — all green
- [ ] Mobile viewport (375×667): dashboard usable, no horizontal scroll
- [ ] Tablet viewport (768×1024): dashboard usable
- [ ] Desktop (1440×900): all components render correctly
- [ ] Safari iOS: OAuth flows complete (Gmail, Slack)
- [ ] Chrome Android: approval flow from notification works

## 1.8 — Build & Deploy Gates

- [ ] `pnpm build` succeeds with zero warnings
- [ ] Vercel preview deploy succeeds on every PR
- [ ] CI runs full test matrix on every PR (typecheck + lint + unit + integration + e2e)
- [ ] CI blocks merge if any check fails
- [ ] `next-env.d.ts` not modified by hand (auto-generated)
- [ ] Bundle size: dashboard JS ≤ 300KB gzipped (size-limit check)
- [ ] No `console.log` statements in production code (ESLint `no-console` enforced)

## 1.9 — Database Migrations & Data Integrity

- [ ] All migrations apply cleanly to fresh Supabase project
- [ ] Migration rollback tested (down migrations work)
- [ ] No orphaned foreign keys (referential integrity check across all tables)
- [ ] All indexed columns documented and justified
- [ ] `pg_dump` of schema reviewed — no test data committed
- [ ] Realtime publication includes only tables that need it (no over-broadcasting)

## 1.10 — Observability

- [ ] Sentry (or equivalent) capturing client + server errors
- [ ] Sentry source maps uploaded on deploy
- [ ] Inngest dashboard shows all function runs with status
- [ ] Vercel logs reviewable; sensitive data masked
- [ ] Health check endpoint `/api/health` returns 200 + dependency status
- [ ] Uptime monitor configured (BetterStack, UptimeRobot, or Vercel Monitor)

---

# Section 2 — Everything Daniel Must Check (Manual UAT)

These are judgment calls, sensory checks, and "did it feel right?" verifications. **Claude cannot do these.** Daniel must run through this list personally — ideally on a fresh device, signed out, like a real first-time coach.

---

### Session progress log — 2026-05-21

**Pre-UAT auth-surface hardening landed before the formal §2 walk began. These ship under commits b934543, c5215b0, 76eeb26, 51518cb on `main`.**

What was added/fixed (verified working on `localhost:3000` by Daniel, not yet walked on staging):

- ✅ **Forgot-password flow** — `/forgot-password` → Supabase reset email → `/reset-password` (PKCE-aware: `exchangeCodeForSession` with implicit-flow fallback). Privacy: never leaks whether an email is registered.
- ✅ **Show/hide password toggle** — eye icon on the login password field.
- ✅ **Sign-out section in `/settings`** — placed directly above Danger zone, with a `SettingsNav` chip.
- ✅ **Redirect-loop fix for orphan auth users** — auth.users entries without a `public.coaches` row (e.g. created directly in the Supabase dashboard) used to bounce forever between `/leads` and `/login`. Layout now signs them out and surfaces a friendly `?error=no_coach_record` message.
- ✅ **Orphan-coach provisioning script** — `scripts/provision-orphan-coaches.ts` (idempotent). One orphan auth user was provisioned during the session.
- ✅ **Leads list filter bug** — the demo-lead filter excluded leads with no `external_ids.demo` key at all (Postgres `NOT(NULL='true')` evaluates to NULL → not-matching). Real non-demo leads were invisible. Fixed via `.or("...is.null, ...neq.true")`.

What still requires a Supabase config step (manual, one-time per environment):

- ⚠ **Add `<env>/reset-password` to Supabase → Authentication → URL Configuration → Redirect URLs** for localhost, staging, and production. Without this, reset-email links lose the `?code=` param and the recovery flow falls through to the "expired" branch.

**§2 walk progress (localhost, 2026-05-22):**

- ✅ §2.1 First Impression + §2.1a Auth additions — passed.
- ⚠ §2.2 Onboarding Wizard — walked end-to-end, but as a walk-and-fix (8 bugs + config gaps fixed in-flight; see the §2.2 logs). Owes a clean timed re-walk on staging.
- ⚠ §2.3 Lead Management — walked end-to-end as a walk-and-fix (11 bugs + 1 architectural change to transcript history; see the §2.3 logs). Owes a clean timed re-walk on staging.
- ✅ §2.4 Voice Model Quality — walked-and-fixed 2026-05-24 on localhost (1 master AI-engine bug + 4 supporting prompt/UX fixes + 1 new onboarding step). Final-pass drafts rated ≥7/10 by qualitative read; three known limitations tracked as follow-up issues (#39 sales toolkit, #40 voice fine-tuning loop, #41 standalone-draft approval). See the §2.4 logs below.
- ▶ **Next: §2.5 Calendar Integrations.** Then §2.6 → §2.14 in order. Critical sections still pending GREEN: §2.6, §2.11, §2.13, §2.14.
- Outstanding cross-cutting items before launch sign-off: custom SMTP (Resend) so invite/reset emails send without rate limits; Slack + Twilio credentials for §2.6; clean staging re-walk of §2.1–§2.4.

---

## 2.1 — First Impression (5 min) — ✅ passed 2026-05-21 on localhost

- [x] Open `/` in an incognito browser — does the landing/login page feel premium? No generic placeholder copy?
- [x] Try to sign up (should fail — invite-only). Error message is friendly, not technical.
- [x] Daniel signs in to `/admin` — dashboard loads without flicker, all coaches listed.

### 2.1a — Auth-surface additions (5 min) — added 2026-05-21 — ✅ passed 2026-05-21 on localhost

- [x] **Login — Forgot password link** — visible next to the password label; clicking goes to `/forgot-password`.
- [x] **Login — Show/hide password toggle** — eye icon toggles visibility; aria-label changes; tab order remains sane.
- [x] **Forgot-password — submit known email** — confirmation copy reads "If an account exists for that email…" (never leaks account existence). Reset email arrives within ~1 min.
- [x] **Forgot-password — submit unknown email** — same confirmation copy, no email arrives, no error leaked.
- [x] **Reset-password — happy path** — clicking the email link in the same browser where the request was made lands on the "Choose a new password" card; saving signs you in and redirects to `/leads`.
- [x] **Reset-password — error visibility** — opening the email link in a *different* browser surfaces a readable error in the red mono box (PKCE verifier missing). Friendly "Send a new link" CTA works.
- [x] **Sign-out — settings page** — `/settings` shows the Sign out section above Danger zone; clicking signs you out and lands on `/login`.
- [x] **Sign-out — re-login** — signing back in lands cleanly on `/leads` (no redirect loop, no flicker).
- [x] **Orphan-user guard** — create a user directly in Supabase Auth (skipping invite). Sign in. You should be signed out immediately with the friendly "Your account isn't set up yet" message — **not** a redirect loop.

> **Outstanding for non-localhost:** Re-walk §2.1 + §2.1a on staging once the Supabase redirect-URL allowlist there includes `<staging-domain>/reset-password`. Same for production before launch.

## 2.2 — Onboarding Wizard (15 min) — ⚠ walked-and-fixed 2026-05-22 on localhost

> The wizard was walked end-to-end as test coach `augustaevv@gmail.com`. It was
> **not a clean pass** — the walk surfaced a stack of real bugs and config gaps,
> all fixed in-flight (see logs below). A clean timed re-walk on staging is still
> owed before launch sign-off.
>
> Implementation note: the live wizard steps are **Gmail → Voice → First lead →
> Notifications**. There is no separate "Profile" step (§2.2 row below is stale
> vs. the build).

- [x] Create a brand-new test coach account — **deviation:** done via `scripts/generate-invite-link.ts`, not the `/admin` UI. Supabase's built-in SMTP hit its invite rate limit, so invite emails were bypassed with a generated link. `/admin` invite UI itself not exercised here.
- [ ] Invite email arrives; copy is warm, not robotic — **not tested** (email bypassed; built-in SMTP rate-limited). Re-test once custom SMTP (Resend) is configured.
- [x] Click invite → land on onboarding wizard
- [ ] **Step 1 — Profile** — N/A, no Profile step exists in the built wizard.
- [x] **Step 2 — Gmail connect:** OAuth completes, scopes correct, "Connected" badge appears.
- [x] **Step 3 — Voice model:** corpus importer + Anthropic analysis produce a profile; examples render.
- [x] **Step 4 — First lead walkthrough:** demo lead + AI draft generate and approve.
- [ ] Total time ≤ 15 min — **not meaningful this run** (interleaved with debugging). Measure on the staging re-walk.
- [ ] Resume banner appears if browser closed mid-wizard — **not tested.**

### 2.2 — Bugs found and fixed during the walk (2026-05-22)

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 1 | Gmail OAuth: "Missing required parameter: client_id" | `GOOGLE_CLIENT_ID/SECRET` empty in env | Created GCP OAuth client; populated `.env.local` |
| 2 | Gmail OAuth: "We couldn't securely store your tokens" | `private` schema not in PostgREST exposed schemas (`PGRST106`) | Added `private` to Supabase exposed schemas + extra search path |
| 3 | Gmail OAuth: still failing — `42501 permission denied for schema private` | `service_role` had `EXECUTE` on the vault fns but no `USAGE` on the schema | Migration `20260522000001_grant_private_schema_usage.sql` |
| 4 | Gmail connects but wizard never advances past step 1 | `StepGmail` polls `/api/settings/integrations/status` — route did not exist | Created the route |
| 5 | Gmail OAuth callback dumps coach on `/settings`, not the wizard | Callback always redirected to settings | Callback now returns mid-onboarding coaches to `/onboarding/gmail` |
| 6 | "Continue" on Gmail step bounces back to Gmail | `coaches.notification_settings` column never created — coach `SELECT` failed (`42703`), progress read as empty | Migration `20260522000002_coaches_notification_settings.sql` |
| 7 | Voice step crash: "Cannot read properties of undefined (reading 'length')" | New coach's `voice_model` is `{}`; treated as a complete profile | Step page normalizes `{}` → `null` (mirrors the settings page guard) |
| 8 | Re-analyze: 500 "Something went wrong analyzing your writing" | Malformed-JSON `SyntaxError` from the model wasn't a `VoiceParseError`, so the retry never fired | `extractVoiceProfile` wraps parse errors as `VoiceParseError` |

### 2.2 — Config gaps closed

- Google OAuth client created + credentials set.
- Anthropic API key set (`ANTHROPIC_API_KEY`) — the AI draft engine had no key.
- Supabase: `private` schema exposed; `/reset-password` redirect URLs allowlisted (from §2.1).

### 2.2 — UX / quality changes made during the walk

- Voice corpus importer: per-channel file types (`.csv` LinkedIn, `.json` Instagram); fixed-height textareas with internal scroll + expand/collapse.
- Writing examples list: per-example show-more/show-less.
- Analyze button: added a "this can take 2–5 minutes" note while running.
- Draft engine: hard no-em/en-dash rule (system prompt + `stripDashes` guardrail + corpus example stripping).
- Draft engine: length guidance — natural 3–10 sentences, no minimum, no multi-paragraph essays.
- Added dummy voice-corpus fixtures (`apps/web/tests/fixtures/voice-corpus/`).

### 2.2 — Deferred

- **Slack + Twilio (WhatsApp/SMS) channels** — no credentials configured. Notifications step completed via the **Email** channel. Slack/Twilio setup + testing deferred to **§2.6 Approval Channels**.

## 2.3 — Lead Management (10 min) — ⚠ walked-and-fixed 2026-05-24 on localhost

> Walked end-to-end as test coach `augustaevv@gmail.com`. **Not a clean pass** —
> the walk surfaced 11 real bugs and 1 architectural change to how transcript
> history feeds the AI engine, all fixed in-flight (see logs below). A clean
> timed re-walk on staging is owed before launch sign-off.

- [x] Add a lead manually — form is intuitive, validation messages helpful (after bugs #1 + #2)
- [x] Lead profile page: timeline reads naturally, notes auto-save without spinner anxiety
- [x] State badge color/wording matches what Daniel expects for each state (after bugs #7 + #9 + #10)
- [x] Search and filter actually work and feel fast (after bug #9 — tab/status alignment)
- [x] Delete a lead — confirmation modal prevents accidental deletion (built during walk — bug #3)

### 2.3 — Bugs found and fixed during the walk (2026-05-24)

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 1 | "Add lead" sheet content cramped against the left edge | Base `SheetContent` primitive had no horizontal padding; only `SheetHeader`/`SheetFooter` had `p-4` | `p-6` on `SheetContent`, dropped redundant `p-4` from header/footer ([apps/web/components/ui/sheet.tsx:63](apps/web/components/ui/sheet.tsx#L63)) — fixes both Sheets in the app |
| 2 | Native HTML5 validation tooltip ("Udfyld dette felt") hidden behind Chrome email autocomplete | `<form>` allowed browser constraint validation to fire before Zod | `noValidate` on both Sheets; existing Zod inline errors take over |
| 3 | No way to delete a lead from the profile page | UI never built | New [delete-lead-button.tsx](apps/web/app/(dashboard)/leads/[id]/delete-lead-button.tsx) with Dialog confirmation; wired into header |
| 4 | "Failed to create draft" on every Generate-draft click | Generate route inserted `status='generating'`, but the `draft_status` enum was `{pending, approved, edited, sent, held, cancelled}` — `'generating'` and `'error'` were never added | Migration [20260524000001_draft_status_generating_error.sql](supabase/migrations/20260524000001_draft_status_generating_error.sql); also pushed §2.2 hot-patches that had drifted from git (idempotent no-ops) |
| 5 | Draft spinner hangs forever despite a valid generated body sitting in the DB with `status='error'` | Single outer `try/catch` wrapped Inngest events + `ai_summary` refresh + the AI call. Side-effect failures (e.g. Inngest config) overrode a successful draft's status from `'pending'` → `'error'` | Split into three phases: AI generation (errors → `'error'`), persist (errors → `'error'`), side-effects (errors → `console.error`, draft stays valid) ([generate/route.ts](apps/web/app/api/drafts/generate/route.ts)) |
| 6 | Dashboard "Leads" counter showed 3 when only 2 visible on `/leads` | Dashboard count query didn't apply the demo-lead filter that `/leads` page does | Same `.or("external_ids->>demo.is.null,...")` filter applied to dashboard ([dashboard/page.tsx:14](apps/web/app/(dashboard)/dashboard/page.tsx#L14)) |
| 7 | "An error has occurred" page when flipping a lead to `unsubscribed` / `do_not_contact` / `bounced` | `GenerateDraftButton` had `if (HARD_BLOCK_STATES.includes(leadStatus)) return null` **before** a `useEffect`. Author silenced the lint warning. When status flipped to a hard-block, the hook count changed → React threw `Rendered fewer hooks than expected` → page error boundary | Moved the early return AFTER all hooks ([GenerateDraftButton.tsx](apps/web/app/(dashboard)/leads/[id]/components/GenerateDraftButton.tsx)) |
| 8 | Hydration mismatch on `ThemeToggle` (server "Switch to dark", client "Switch to light") | `useState` initializer used `typeof window === 'undefined'` branching, so server always rendered `light` while client read the real `dark` class set by the layout cookie | `mounted` state pattern — server renders an invisible placeholder, client swaps in real icon/label after hydrate ([ThemeToggle.tsx](apps/web/components/shell/ThemeToggle.tsx)) |
| 9 | Lead with status `closed` showed in the "Completed" tab; tab labeled "Closed" actually filtered for `unsubscribed`/`bounced` | Tab→status mapping diverged from intuitive labels — both a tab and a status named "closed" with different meanings | Renamed tab "Completed" → "Won" (`converted` only). Moved status `closed` into the "Closed" tab alongside `unsubscribed` + `bounced`. Every status now lives in a tab whose label fits it ([leads/page.tsx:21](apps/web/app/(dashboard)/leads/page.tsx#L21), [lead-list-controls.tsx:8](apps/web/app/(dashboard)/leads/lead-list-controls.tsx#L8)) |
| 10 | Once `do_not_contact` was set, no way to lift it from the UI even if the lead re-engaged | `overrideLeadState` only set `do_not_contact=true` on transition to that state; flipping away didn't clear the sticky flag | New `liftDoNotContact` server action + subtle "Lift" link rendered inside the red "Do not contact" badge. Opens a confirmation Dialog ("Only lift if they have explicitly opted back in") → resets `do_not_contact=false` and status→`identified` ([lift-dnc-action.ts](apps/web/app/(dashboard)/leads/[id]/lift-dnc-action.ts), [lift-dnc-button.tsx](apps/web/app/(dashboard)/leads/[id]/lift-dnc-button.tsx)) |
| 11 | Transcript card grew unboundedly with content; saved view only showed first 200 chars; no way to delete a mistake | Base `Textarea` uses `field-sizing-content` (modern CSS auto-grow); saved view was a `line-clamp-3` snippet; no `DELETE /api/transcripts/[id]` route existed | Card now has fixed 200px scroll area with Expand/Collapse; saved view shows full transcript in scrollable block; `field-sizing: fixed` override on the input; added DELETE endpoint + trash icons on latest + every historical row with shared confirmation Dialog ([ManualTranscriptUpload.tsx](apps/web/app/(dashboard)/leads/[id]/components/ManualTranscriptUpload.tsx), [api/transcripts/[id]/route.ts](apps/web/app/api/transcripts/[id]/route.ts)) |

### 2.3 — Architectural change: transcript history feeds Continuation, not day-to-day

Daniel surfaced a misalignment between the intent of the product and the implementation: drafts were joining the entire transcript history every time. The intent is that **day-to-day drafts use only the latest call**, while the full history stays on file so the future **Module 3 Continuation** product can write recap-style messages ("we went through X, Y, Z, now we're heading toward…"). Aligned:

- Generate-draft route now reads only the most-recent transcript per lead ([generate/route.ts](apps/web/app/api/drafts/generate/route.ts)). When Continuation is built, add a `useFullHistory: true` flag and switch back to ascending-ordered full join.
- DB still keeps every transcript; the page now fetches all and passes `latestTranscript` + `priorTranscripts[]` to the component.
- UI: header shows "Latest call · N total on file"; collapsible "Show N earlier calls" disclosure exposes each historical transcript with date + individually expandable body.
- Button renamed "Replace transcript" → "Add new call" so the append semantics are honest.
- Card has Cancel to back out of an accidental "Add new call".

### 2.3 — Recovered data

- One draft (id `77f4eec5-…`) was wrongly flipped to `status='error'` by the over-broad catch (bug #5) despite having a valid generated body. Recovered to `status='pending'` via REST so it appears in the `/drafts` queue.

### 2.3 — Deferred / follow-ups

- **Inngest side-effects still throw silently** on draft generation (logged as `[drafts/generate] inngest events failed (draft still valid)` in the dev terminal). Not blocking §2.3 because drafts persist correctly, but should be diagnosed before §2.6 Approval Channels — likely the same missing-credentials story as Slack/Twilio.
- **ai_summary refresh from notes** — notes ARE wired into Claude's context, but only on draft generation, not on note save. Acceptable for §2.3; revisit if §2.4 voice testing shows summaries lag behind notes.
- **Re-walk on staging** owed before launch sign-off, same as §2.2.

## 2.4 — Voice Model Quality (20 min) — ✅ walked-and-fixed 2026-05-24 on localhost — **CRITICAL**

> Walked end-to-end as test coach `augustaevv@gmail.com` with Daniel's real
> WhatsApp corpus (~280k chars pre-filter, ~90k post-filter to Daniel only,
> last 12 months). **Not a clean pass** — the walk surfaced a master AI-engine
> bug that explained 7 of 9 bad ratings, plus four supporting fixes and a
> brand-new onboarding step. After fixes, regenerated drafts all rated ≥7/10
> by qualitative read. A clean timed re-walk on staging with the real Gmail
> corpus is still owed before launch sign-off.

- [x] Use Daniel's own real email history as the voice corpus — **deviation:** walked on Daniel's real WhatsApp corpus (Gmail not used at coaching scale). Importer now supports multi-file uploads + WhatsApp/IG/LinkedIn/Gmail speaker filtering + date-window filtering (Danish-format times now parse). Owes a re-walk with Gmail corpus once Daniel has time to curate.
- [x] Generate 5 drafts for varied scenarios — seeded 5 demo leads via `scripts/seed-uat-2-4-scenarios.ts` covering no-show, post-call (with transcript), reply-to-objection, reactivation, gentle nudge. Daniel also tested against ~4 pre-existing real-shaped UAT leads (Karoline, Mia, Sofia, Henrik).
- [x] **Daniel rates each draft 1–10** — pre-fix ratings exposed the master bug below (3 leads at A=1, 2 leads at A=3-4). Post-fix qualitative re-read: "MUCH BETTER NOW" + specific Anders draft pasted in chat. Closed on overall satisfaction, not exhaustive numeric re-rating.
- [x] All 5 drafts ≥ 7/10 — qualitative pass post-fix. Remaining issues are phrase-level (Danish combinations) and objection-handling depth, both tracked as follow-ups.
- [x] Regenerate button produces a meaningfully different draft — verified after the regenerate cross-lead bug was fixed (see §2.4 bug #5). Daniel confirmed "everything looks great, regeneration, flow etc."
- [ ] Confidence badge appears when fewer than 8 examples uploaded — **deferred.** Daniel's corpus has way more than 8 examples; this check requires a coach with a thin corpus. Will surface naturally during the next real-coach onboarding.

### 2.4 — Master bug and supporting fixes (2026-05-24)

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 1 | AI drafts for no-show / objection / reactivation states hallucinated replies the lead never sent, OR refused to write ("paste in what she said") even though the reply was in `coach_notes` | `coach_notes` was loaded from the DB and threaded through the AI engine API, but `buildDraftUserPrompt` never injected it into the user prompt — it was silently dropped on the floor before reaching Claude. Truncation logic in `context-assembler.ts` even *trimmed* the unused notes. | New `<coach_notes>` block in `buildDraftUserPrompt` ([packages/ai-engine/src/prompts/draft.ts](packages/ai-engine/src/prompts/draft.ts)). Regression test added ([apps/web/tests/unit/ai-prompt-deterministic.test.ts](apps/web/tests/unit/ai-prompt-deterministic.test.ts)) so this can't silently break again. |
| 2 | `STATE_FRAMING` for states with no lead message (no-show, identified, in_sequence, call_booked) didn't tell the model that no message was received → model wrote as if responding to one. `replied` state didn't tell the model where the reply lived. | Vague state instructions left it ambiguous where ground truth came from per state. | Rewrote `STATE_FRAMING` for every state. Explicitly calls out "lead has NOT sent a message" for relevant states; explicitly points `replied` at coach_notes for the actual reply text. |
| 3 | `closed`-state drafts came out as "welcome aboard" messages | `STATE_FRAMING['closed']` duplicated the `converted` welcome-aboard framing. Per the §2.3 architectural rename, `closed` is a dormant/wind-down state, not a won deal. | Rewrote `closed` framing as gentle reactivation — references the specific context from notes, no welcome-aboard treatment. |
| 4 | Drafts emitted `[CALENDLY LINK]` placeholders instead of a real booking URL | `coaches.public_booking_url` exists in DB + settings UI already (since `20260520000004_phase5_polish.sql`) but was never injected into the AI prompt. | Added `bookingUrl` to `DraftGenerationParams`, threaded through generate + regenerate routes, injected as `<booking_url>` block. When no URL is set, the prompt explicitly forbids bracketed placeholders. New system-prompt rule against `[CALENDLY LINK]` / `[booking link]` stubs. |
| 5 | Regenerate on a draft made the *next* draft in the queue appear to vanish ~3 seconds later | Realtime hook filtered strictly by `status='pending'`; mid-regeneration the draft flipped to `'generating'` → was filtered out → queue advanced. When regeneration completed, the draft re-entered as `'pending'` and was *prepended*, displacing the new front card. | Realtime hook now **appends** drafts re-entering the pending bucket (and brand-new pending drafts). Queue stays stable: the card the coach is currently working on never gets bumped. Skip button (which was a no-op) now uses a new client-side `rotateCurrent` from the same hook. ([apps/web/components/drafts/draft-realtime.tsx](apps/web/components/drafts/draft-realtime.tsx)) |
| 6 | Hydration mismatch on the draft queue: server rendered `5/24/2026, 5:08:32 PM` (en-US), client rendered `24.5.2026, 17.08.33` (da-DK). React tore down the tree on hydration → Approve and Hold buttons stopped responding to clicks. | `Date.now()` fallback in `DraftCard` changed every render (different on server vs client) AND `toLocaleString()` used different locales. | Replaced `Date.now()` fallback with stable `draft.created_at`; added `suppressHydrationWarning` on the timestamp `<p>` so locale differences don't trigger teardown. Buttons work again. ([apps/web/components/drafts/DraftCard.tsx](apps/web/components/drafts/DraftCard.tsx)) |
| 7 | Approve / Hold on standalone drafts in the queue rejected with generic "This action didn't go through. Refresh and try again." | PATCH route hard-rejects approval when `sequence_id` is null (Phase 3 architecture); error toast swallowed the real `reason`. | Surfaced the actual reason in the toast. Queue now filters to sequence-attached drafts only (both SSR + realtime), so standalone test drafts no longer appear where they can't be acted on. Standalone-draft approval as a real product flow tracked in #41. |

### 2.4 — Voice corpus importer improvements (built during the walk)

The original importer accepted one paste at a time and ignored speaker / date / Danish-format issues. Daniel's real WhatsApp export had 13 speakers across group chats and used `[03/04/2026, 10.07.55]` (dots not colons in time) and dd/mm date order — the importer chewed up the corpus and analyzed both sides of every conversation, then bypassed the date filter entirely. Fixes shipped during the walk:

- **Multi-file uploads** with `<input multiple>` + per-file headers in the textarea; successive uploads append rather than overwrite.
- **Speaker filter** — new [apps/web/lib/voice/parse-speakers.ts](apps/web/lib/voice/parse-speakers.ts) detects speakers across WhatsApp (iOS bracket + Android dash formats), Instagram (JSON `sender_name`), LinkedIn (CSV `FROM` column), and Gmail (mbox `From:` headers). Coach picks their own name(s) via multi-select chips; filter applies before analysis.
- **Date window** — last 3 / 6 / 12 / 24 months / all-time pills, default 12. Trims old voice that no longer reflects current-you.
- **Live preview** — "Keeps 1,007 of 2,066 messages (88,794 chars)" updates as filters change, so the coach sees impact before applying.
- **Danish time format** — `10.07.55` (dots) now parses, with dd/mm vs mm/dd auto-detection.
- **Restore original** — undo the filter without re-uploading.
- **System-message filter** — `<Media omitted>`, "Messages and calls are end-to-end encrypted", missed-call notices etc. excluded automatically.

### 2.4 — New onboarding step: Booking

Daniel asked for the booking URL to be part of onboarding rather than buried in settings. The wizard step order is now:

`gmail` → **`booking`** → `voice` → `first-lead` → `notifications`

- New `OnboardingStepEnum` value + `STEP_ORDER` update ([packages/shared/src/validators/onboarding.ts](packages/shared/src/validators/onboarding.ts))
- New step component ([apps/web/components/onboarding/StepBooking.tsx](apps/web/components/onboarding/StepBooking.tsx)) — URL input with inline validation (http/https), collapsible provider helper panel (Calendly / Cal.com / Acuity / TidyCal patterns + where-to-find-it), Skip-for-now + Continue buttons
- StepGmail now advances to `/onboarding/booking` instead of straight to `/onboarding/voice`
- Existing `/settings/profile` Public booking URL field unchanged — onboarding step just pre-populates the same column

Full per-provider OAuth + webhook integration (§2.5 / Phase 3) is a separate piece of work; this step is the lightweight URL-only stand-in until then.

### 2.4 — UAT fixture script

[scripts/seed-uat-2-4-scenarios.ts](scripts/seed-uat-2-4-scenarios.ts) is idempotent and seeds 5 demo leads on a coach by email — one per §2.4 scenario, with realistic notes/ai_summary and a sample transcript for the post-call scenario. Re-run anytime for a clean §2.4 dataset:

```
pnpm tsx scripts/seed-uat-2-4-scenarios.ts <coach_email>
```

### 2.4 — Known limitations (tracked as follow-up issues)

Three quality concerns that the §2.4 fixes don't address but which don't block §2.4 closure:

- **#39 — Sales toolkit.** The Camilla draft (price objection) accepted the deferral too quickly. Coaches need a profile-level "how I sell" toolkit (downsells, bridges, philosophy) the AI can reach for during objection handling. Real feature, ~80-90 min focused build. Should ship before §2.6.
- **#40 — Voice fine-tuning loop.** Anders' regenerated Danish draft used "bare lige smutter forbi" (sounds wrong) and "lmk hvad der giver mening" (LMK mid-sentence). Individual words are in Daniel's vocabulary but the *combinations* aren't. Proposed: paste-a-draft + describe-what's-off form in My Voice → AI generates additive `usage_rules` to refine the profile. ~100-120 min build.
- **#41 — Standalone draft approval.** Drafts created via Generate-draft on a lead profile have no `sequence_id` and can't be approved through the queue. Workaround applied today (queue filters to sequence-attached drafts). Real fix belongs in §2.6 prep.

### 2.4 — Deferred / follow-ups

- **Confidence badge check** — needs a coach with <8 voice examples; defer to next real-coach onboarding rather than synthesizing.
- **Re-walk with Gmail corpus** — Daniel's coaching is largely on WhatsApp, but a clean re-walk with even a small curated Gmail set would close the "real email history" check honestly.
- **Re-walk on staging** owed before launch sign-off, same as §2.2 + §2.3.

## 2.5 — Calendar Integrations (one per provider, 30 min)

> Connect/disconnect flow built 2026-05-25 in plan **06-04**
> ([06-04-calendar-integrations-PLAN.md](06-04-calendar-integrations-PLAN.md)).
> Onboarding step **Calendar** (between Booking and Voice) and
> **Settings → Calendar** card both render the 7-provider grid + per-provider
> connect UI. Soft one-active-calendar rule via `coaches.active_calendar_provider`.

### 2.5a — Connect / disconnect smoke (5 min per provider)

Per provider — no booking required, just the connect side:

- [ ] OAuth providers (Calendly, Acuity, Square, MS Bookings): Click **Connect**
  in Settings → Calendar → provider's OAuth screen loads → grant → return to
  Settings shows the provider card with "Connected" badge and `active_calendar_provider`
  set in `coaches`.
- [ ] API-key providers (Cal.com, Setmore, TidyCal): Paste a real key → **Test**
  succeeds → **Save & connect** → "Connected" badge appears.
- [ ] **Webhook setup panel** — for manual-mode providers (Setmore, Square,
  MS Bookings, TidyCal) the panel shows a webhook URL + signing secret. Copy
  buttons work; mask/reveal works on the secret.
- [ ] **Disconnect** — Disconnect button on the active card → confirmation Dialog →
  integration row flips to `status='disconnected'`, vault entry removed,
  `active_calendar_provider` nulls out.
- [ ] **Switch provider** — From a connected state, pick another provider from
  the "Use a different calendar?" dropdown → confirm Dialog → previous one
  disconnects → connect flow starts for the new one.

### 2.5b — End-to-end booking flow (per provider Daniel actually uses)

- [ ] Book a fake meeting → webhook fires → `calendar_events` row inserted
  (verify by SQL: `select * from calendar_events where coach_id = ... order by processed_at desc`).
- [ ] If the booking was a no-show → Inngest `lead.no_show` event fired → no-show sequence starts.
- [ ] Mark booking complete (where the provider supports this) → post-call sequence starts.
- [ ] Disconnect provider → UI updates immediately; further webhook payloads are
  dropped (or warn-logged), no new `calendar_events` rows.

### 2.5 — Testability matrix

| Provider | Auth ready? | Auto webhook? | Manual webhook needed? |
|---|---|---|---|
| Calendly | Once `CALENDLY_CLIENT_ID/SECRET` set | ✅ via /webhook_subscriptions | — |
| Cal.com | Always (per-coach API key) | ✅ via /v1/webhooks | — |
| Acuity | Once `ACUITY_CLIENT_ID/SECRET` set | ✅ via /api/v1/webhooks (3 events) | — |
| Setmore | Always (per-coach API key) | — | Coach pastes URL+secret in Setmore dashboard |
| Square | Once `SQUARE_CLIENT_ID/SECRET` set | — | Coach pastes URL in Square Developer dashboard; sig key goes in `SQUARE_WEBHOOK_SECRET` |
| MS Bookings | Once `MS_BOOKINGS_CLIENT_ID/SECRET` set | — (Graph polling only) | None; no push API yet |
| TidyCal | Always (per-coach API key) | — | Coach pastes URL+secret in TidyCal dashboard |

**OAuth app registration** — Daniel must register an app at each OAuth provider's developer portal and drop `client_id`/`client_secret` into `.env.local`. Step-by-step in [docs/CALENDAR-OAUTH-SETUP.md](../../../docs/CALENDAR-OAUTH-SETUP.md).

(For launch, Daniel can verify the 2–3 providers his actual coaches use; flag the others as "tested by Claude, awaiting real-world verification.")

## 2.6 — Approval Channels End-to-End (45 min)

- [ ] **Dashboard:** Approve a draft with mouse — fast, no jank
- [ ] **Dashboard:** Approve with keyboard shortcut `A` — works
- [ ] **Dashboard:** Edit a draft inline — saves cleanly, no lost edits
- [ ] **Email:** Review-link email arrives. Click → review page loads. Approve → confirmation shown. Click link again → "already used" message (not an error).
- [ ] **Slack:** Notification arrives in Daniel's test Slack. Full draft body visible (not truncated). Approve button works. Edit modal opens and saves.
- [ ] **WhatsApp:** Twilio message arrives. Quick-reply approval works.
- [ ] **SMS fallback:** Disable WhatsApp → trigger draft → SMS arrives with short summary + link.

## 2.7 — Notification Preferences (15 min)

- [ ] Open Settings → Notifications matrix
- [ ] Toggle each event × channel combination — UI is unambiguous
- [ ] Dashboard channel cannot be disabled (locked) — locked state visually clear
- [ ] Hard-bounce SMS cannot be disabled (locked) — locked state visually clear
- [ ] Save → trigger each event → only the toggled-on channels fire

## 2.8 — Autonomous Modes (15 min)

- [ ] **Mode A:** Enable → type-to-confirm modal appears with exact phrase
- [ ] Type slightly wrong phrase → submit disabled
- [ ] Type exact phrase → enabled → subsequent drafts auto-send without review
- [ ] **Mode B:** Enable → next draft enters 24h pending window → if untouched, auto-sends after 24h
- [ ] Disable autonomous mode → drafts return to manual approval

## 2.9 — Locked Modules (10 min)

- [ ] Module 2 sell page: copy is compelling, not salesy. Cal.com embed loads. "Book a call" works end-to-end.
- [ ] Module 3 sell page: same checks.
- [ ] Navigation between sell pages is smooth, no broken links.

## 2.10 — Admin Dashboard (20 min)

- [ ] Coach roster shows accurate usage metrics per coach
- [ ] Integration health panel reflects real status (test by disconnecting a coach's Gmail)
- [ ] System health panel: Inngest, Supabase, Gmail API, Twilio all reporting correctly
- [ ] Coach detail view: read-only, but shows sequence activity + approval rates
- [ ] Daniel can revoke a coach's access — coach is locked out within 30s

## 2.11 — Aesthetic & Brand (30 min) — **Daniel's eye only**

- [ ] Glass/frosted card aesthetic consistent across every page
- [ ] Colors feel warm and uplifting (not neon, not tech-bro)
- [ ] Dark mode and light mode both look intentional, not auto-inverted
- [ ] Custom background swap works (`--bg-image` CSS var) — at least one alternate background tested
- [ ] Typography hierarchy is clear on every page
- [ ] Empty states: every list/table has a designed empty state, not blank
- [ ] Loading states: no jarring spinners — skeletons or subtle indicators
- [ ] Error states: never expose stack traces; every error has a friendly message + actionable next step
- [ ] No "Lorem ipsum," "TODO," "FIXME," or placeholder copy visible anywhere

## 2.12 — Mobile (15 min)

- [ ] Open dashboard on Daniel's actual phone
- [ ] Approve a draft from phone — feels native, not cramped
- [ ] Read a long draft on phone — typography readable, no horizontal scroll
- [ ] Onboarding wizard usable on phone (or graceful "use desktop" message if not supported)

## 2.13 — Copy Review (30 min)

- [ ] Read every microcopy string from a coach's perspective — does any feel cold, salesy, or technical?
- [ ] Error messages: never blame the user
- [ ] Success messages: warm, not over-the-top
- [ ] Email templates (review link, follow-up CTA, bounce notification, draft-ready): consistent voice across all
- [ ] Locked module CTAs match the canonical copy in CLAUDE.md exactly

## 2.14 — Daniel's Personal Sign-Off

- [ ] **"If I handed this to a coach paying $X/month today, would I be proud?"** — yes/no
- [ ] **"Is there anything I'd want to fix before any real human sees this?"** — written list

---

# Section 3 — Security Hardening (Top Priority)

This is non-negotiable. Every item must be GREEN before any real coach or lead data enters the system.

## 3.1 — Secrets & API Keys

- [ ] **Zero hardcoded secrets** — run `gitleaks detect --source . --no-git` → zero findings
- [ ] **Zero hardcoded secrets in git history** — run `gitleaks detect --source .` (full history scan) → zero findings
- [ ] All secrets in Vercel environment variables (not `.env` committed to git)
- [ ] `.env*` files all in `.gitignore` (verify)
- [ ] `.env.example` exists with placeholder values (no real keys)
- [ ] Anthropic API key: server-side only (grep all client bundles for the key prefix `sk-ant-`)
- [ ] Supabase service role key: server-side only (grep all client bundles for `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Twilio auth token: server-side only
- [ ] Resend API key: server-side only
- [ ] Slack signing secret: server-side only
- [ ] Inngest signing key + event key: server-side only
- [ ] Upstash Redis token: server-side only
- [ ] Gmail OAuth client secret: server-side only
- [ ] All `NEXT_PUBLIC_*` env vars audited — confirm they are truly safe to expose
- [ ] Key rotation procedure documented in `SECURITY.md` (how to rotate each provider's key)
- [ ] All keys created with **least-privilege scopes** (e.g., Supabase service role isn't using anon client where it could)

## 3.2 — Encryption at Rest

- [ ] OAuth tokens (Gmail, Slack, Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal, Fireflies, Zoom) stored in Supabase Vault — **never plain columns**
- [ ] Verify: `SELECT * FROM pg_tables WHERE schemaname = 'public'` — no column named `*_token` storing plaintext
- [ ] Voice model corpus stored encrypted (JSONB in Supabase — verify pgsodium or Vault wrapping for sensitive examples)
- [ ] Transcript content stored in Supabase — RLS-protected, no external sharing
- [ ] Webhook secrets per integration stored in Vault, not env (per-coach secrets)
- [ ] Supabase project has **Point-in-Time Recovery** enabled (backups)
- [ ] Backup encryption verified (Supabase default — confirm enabled)

## 3.3 — Encryption in Transit

- [ ] All routes served over HTTPS (Vercel default — confirm)
- [ ] HSTS header set with `max-age=63072000; includeSubDomains; preload`
- [ ] No mixed-content warnings on any page
- [ ] Supabase client uses TLS (default)
- [ ] All outbound webhook delivery uses HTTPS only (no http:// allowed)
- [ ] All third-party API calls (Anthropic, Gmail, Twilio, Slack, Resend, Inngest) over HTTPS

## 3.4 — Authentication & Authorization

- [ ] Supabase Auth: invite-only (signups disabled) — verified in dashboard settings
- [ ] Daniel-only `/admin` route: middleware enforces email match `djn203040@gmail.com` (or role flag)
- [ ] Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`
- [ ] Session expiry: reasonable default (1 week max) + refresh token rotation
- [ ] Password requirements: min 12 chars or magic-link only (no weak passwords)
- [ ] MFA available for coaches (Supabase Auth supports it) — at minimum for Daniel
- [ ] Logout actually invalidates the session server-side
- [ ] Revoked coach: cannot access dashboard within 30s (test)

## 3.5 — Row-Level Security (RLS)

- [ ] **Every** table in `public` schema has RLS enabled — `SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace` returns true for all
- [ ] Every table has a `coach_id` column or equivalent tenant key
- [ ] Every SELECT policy filters by `coach_id = auth.uid()` (or join through it)
- [ ] Every INSERT policy enforces `coach_id = auth.uid()`
- [ ] Every UPDATE policy filters by `coach_id = auth.uid()`
- [ ] Every DELETE policy filters by `coach_id = auth.uid()`
- [ ] Admin override policies (Daniel's email) explicitly named and limited to SELECT-only where possible
- [ ] **Cross-tenant penetration test:** Sign in as coach A → attempt to query coach B's leads via Supabase JS client → blocked
- [ ] **Cross-tenant penetration test:** Sign in as coach A → attempt PATCH on coach B's draft → blocked
- [ ] Service role client never reachable from browser (grep client bundles)

## 3.6 — Input Validation

- [ ] **Every** API route validates input with Zod
- [ ] **Every** webhook receiver validates payload schema before processing
- [ ] No raw SQL — all queries via Supabase client or parameterized
- [ ] File uploads (voice model corpus): size limit enforced, MIME type whitelist, virus scan if applicable
- [ ] User-supplied URLs (e.g., calendar webhook callback): validated against allowlist of providers
- [ ] No SSRF surfaces — verify no `fetch(userSuppliedUrl)` without allowlist

## 3.7 — Webhook Signature Verification

- [ ] **Calendly:** signature verified on every webhook (test with forged payload → 401)
- [ ] **Cal.com:** signature verified
- [ ] **Acuity:** signature verified
- [ ] **Setmore:** signature verified
- [ ] **Square:** signature verified
- [ ] **MS Bookings:** signature verified
- [ ] **TidyCal:** signature verified
- [ ] **Fireflies:** signature verified
- [ ] **Zoom:** signature verified
- [ ] **Slack:** signature verified (`X-Slack-Signature` + timestamp)
- [ ] **Resend:** Svix signature verified
- [ ] **Twilio:** `X-Twilio-Signature` verified
- [ ] **Gmail Pub/Sub push:** JWT verified against Google's public keys
- [ ] **Inngest:** signing key verified on incoming events
- [ ] **Replay attack protection:** webhook timestamps rejected if older than 5 minutes (where supported)
- [ ] **Idempotency:** all webhook handlers idempotent by external event ID

## 3.8 — Rate Limiting & Abuse Prevention

- [ ] Upstash Redis rate limit on `/api/auth/*` routes (login attempts)
- [ ] Rate limit on `/api/drafts/generate` per coach (prevent Anthropic cost runaway)
- [ ] Rate limit on `/api/webhooks/*` per source IP (prevent flood)
- [ ] Rate limit on `/api/review/[token]` (prevent token brute-force)
- [ ] Rate limit on `/api/unsubscribe` (prevent enumeration)
- [ ] Bot protection: Vercel/Cloudflare WAF or equivalent on public routes
- [ ] No unbounded loops in Inngest functions (timeout configured)

## 3.9 — Data Privacy & PII Handling

- [ ] **No PII in logs** — grep all `console.log`, Sentry breadcrumbs, Vercel logs for email patterns
- [ ] Sentry: `beforeSend` strips PII (email, phone, lead name) from error reports
- [ ] Inngest event payloads: PII redacted where logged
- [ ] Coach can export all their data (GDPR) — endpoint exists
- [ ] Coach can delete their account → cascades cleanly (`ON DELETE CASCADE` audited)
- [ ] Lead `do_not_contact` flag: globally enforced at every send path
- [ ] Unsubscribe links in every outbound email (CAN-SPAM compliance)
- [ ] Privacy policy URL exists and is accurate
- [ ] Terms of service URL exists
- [ ] Data Processing Addendum (DPA) ready for coaches who request it (B2B)

## 3.10 — Dependency Security

- [ ] `pnpm audit` → zero high or critical vulnerabilities
- [ ] Dependabot or Renovate enabled on the repo
- [ ] Lock file (`pnpm-lock.yaml`) committed — reproducible installs
- [ ] No `latest` version pins in `package.json`
- [ ] Production dependencies audited for license compatibility (no GPL surprises)
- [ ] No abandoned/unmaintained critical dependencies (verify last commit < 12 months for top 10 deps)

## 3.11 — Browser Security Headers

- [ ] `Content-Security-Policy` set, no `unsafe-inline` for scripts (use nonces if needed)
- [ ] `X-Frame-Options: DENY` (prevent clickjacking)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` restricts unused features (camera, microphone, geolocation)
- [ ] CORS configured per route (no global `*` for credentialed endpoints)
- [ ] Subresource Integrity (SRI) on any external scripts

## 3.12 — Code-Level Security

- [ ] No `eval()`, `Function()` constructor, or `dangerouslySetInnerHTML` without sanitization
- [ ] All HTML rendered from user input goes through DOMPurify (or framework-default escaping)
- [ ] SQL injection: N/A (Supabase client parameterizes) — verify no raw `query()` calls
- [ ] XSS audit on every route that renders user content (lead notes, draft body, voice examples)
- [ ] CSRF protection: SameSite cookies + Origin header check on state-changing routes
- [ ] Open redirect audit: any `?redirect=` param validated against allowlist

## 3.13 — Third-Party Risk

- [ ] Anthropic API: requests do not include unnecessary PII in prompts (lead first name only, not full email/phone)
- [ ] Gmail API: minimum scopes (`gmail.send`, `gmail.modify`, `gmail.readonly`) — no `gmail.full`
- [ ] Slack OAuth: minimum scopes (`chat:write`, `users:read`)
- [ ] Calendar OAuth scopes: read-only where possible
- [ ] Vercel project access: only Daniel + Claude bot
- [ ] Supabase project access: only Daniel + service-role used by Vercel
- [ ] GitHub repo: private, branch protection on `main`, required reviews
- [ ] No secrets in CI logs (GitHub Actions log masking verified)

## 3.14 — Compliance Documentation

- [ ] `SECURITY.md` in repo: how to report a vulnerability
- [ ] Privacy policy live and linked from app
- [ ] Cookie consent banner if required for jurisdiction (review with Daniel)
- [ ] Audit log of admin actions (Daniel creates/revokes coaches) — written to dedicated table
- [ ] OAuth app review submissions filed where required (Google: Gmail; Slack: distribution)

## 3.15 — Incident Readiness

- [ ] Runbook: what to do if a coach reports unauthorized access
- [ ] Runbook: what to do if an API key leaks (rotation steps per provider)
- [ ] Runbook: what to do if Supabase project is compromised
- [ ] Backup restoration tested (Daniel restores a Supabase backup to staging once)
- [ ] Contact info for each provider's security team documented

## 3.16 — Automated Security Audits

- [ ] CI runs `gitleaks` on every PR
- [ ] CI runs `pnpm audit` on every PR
- [ ] CI runs OWASP ZAP or equivalent against staging weekly
- [ ] CI runs `npm-package-audit` or Snyk
- [ ] `/security-review` skill run on the full codebase before launch

---

## Exit Criteria — Launch Blocker Checklist

The product is **launch-ready** when all three pass:

- [ ] **Section 1** — every box checked, CI is fully green on `main`
- [ ] **Section 2** — Daniel has personally signed off (date + signature below)
- [ ] **Section 3** — zero open security findings; `/security-review` clean; gitleaks clean

---

## Sign-Off

```
Section 1 sign-off (Claude/CI):       _________________   Date: __________
Section 2 sign-off (Daniel personal):  _________________   Date: __________
Section 3 sign-off (Security):         _________________   Date: __________

Launch authorized by Daniel:           _________________   Date: __________
```

---

*Phase 6 plan version 1.0 — 2026-05-21*
