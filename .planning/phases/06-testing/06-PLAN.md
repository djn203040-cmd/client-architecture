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
- ▶ **Next: §2.3 Lead Management.** Then §2.4 → §2.14 in order. Critical sections (§2.4, §2.6, §2.11, §2.13, §2.14) must end GREEN before launch.
- Outstanding cross-cutting items before launch sign-off: custom SMTP (Resend) so invite/reset emails send without rate limits; Slack + Twilio credentials for §2.6; clean staging re-walk of §2.1–§2.2.

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

## 2.3 — Lead Management (10 min)

- [ ] Add a lead manually — form is intuitive, validation messages helpful
- [ ] Lead profile page: timeline reads naturally, notes auto-save without spinner anxiety
- [ ] State badge color/wording matches what Daniel expects for each state
- [ ] Search and filter actually work and feel fast
- [ ] Delete a lead — confirmation modal prevents accidental deletion

## 2.4 — Voice Model Quality (20 min) — **CRITICAL**

- [ ] Use Daniel's own real email history as the voice corpus
- [ ] Generate 5 drafts for varied scenarios (no-show, post-call, reply to objection, reactivation, gentle nudge)
- [ ] **Daniel rates each draft 1–10 on:** Does this sound like me? Would I send this unedited?
- [ ] All 5 drafts ≥ 7/10 — if not, voice model needs more tuning before launch
- [ ] Regenerate button produces a meaningfully different draft (not just a synonym swap)
- [ ] Confidence badge appears when fewer than 8 examples uploaded — wording is honest, not alarming

## 2.5 — Calendar Integrations (one per provider, 30 min)

For each of the 7 providers Daniel will support: Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal

- [ ] Connect provider in Settings → Integrations
- [ ] Book a fake meeting → no-show → confirm sequence starts
- [ ] Book a fake meeting → mark complete → confirm post-call sequence starts
- [ ] Disconnect provider → confirm UI updates immediately

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
