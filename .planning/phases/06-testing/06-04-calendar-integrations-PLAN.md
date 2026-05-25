---
phase: 06-testing
plan: 04
type: execute
wave: 4
depends_on: [06-03]
files_modified:
  - supabase/migrations/{ts}_calendar_active_provider.sql
  - apps/web/lib/calendar/providers.ts
  - apps/web/lib/calendar/registry.ts
  - apps/web/lib/oauth/shared.ts
  - apps/web/app/api/auth/calendar/[provider]/authorize/route.ts
  - apps/web/app/api/auth/calendar/[provider]/callback/route.ts
  - apps/web/app/api/auth/calendar/[provider]/api-key/route.ts
  - apps/web/app/api/auth/calendar/[provider]/disconnect/route.ts
  - apps/web/app/api/auth/calendar/webhook-info/route.ts
  - apps/web/components/onboarding/StepCalendar.tsx
  - apps/web/app/(onboarding)/onboarding/calendar/page.tsx
  - apps/web/components/settings/CalendarSection.tsx
  - apps/web/components/calendar/ProviderCard.tsx
  - apps/web/components/calendar/ConnectButton.tsx
  - apps/web/components/calendar/ApiKeyForm.tsx
  - apps/web/components/calendar/WebhookSetupPanel.tsx
  - packages/shared/src/validators/onboarding.ts
  - packages/shared/src/validators/calendar.ts
  - apps/web/app/(dashboard)/settings/page.tsx
  - docs/CALENDAR-OAUTH-SETUP.md
  - .env.example
autonomous: false
requirements:
  - "Section 2.5 of 06-PLAN.md (Calendar Integrations) — make walkable"
  - "Onboarding: coach picks one of 7 calendar providers (after Booking, before Voice)"
  - "Settings: connected calendar card with Connect/Disconnect + provider-switch dropdown"
  - "Soft constraint: one active calendar per coach (coaches.active_calendar_provider)"

must_haves:
  truths:
    - "A coach can pick one of 7 calendar providers in onboarding and connect it"
    - "A coach can disconnect their connected calendar from /settings"
    - "A coach can switch to a different provider via a dropdown in /settings (disconnects current, starts connect for new)"
    - "OAuth providers (Calendly, Acuity, Square, MS Bookings) use real OAuth2; tokens stored in Vault, never in plaintext columns"
    - "API-key providers (Cal.com, Setmore, TidyCal) use a paste-and-validate flow; keys stored in Vault"
    - "Webhook URL + signing secret are displayed to the coach for providers that don't auto-register webhooks"
    - "Webhook handler chain still works end-to-end after connect: provider event → webhook receiver → calendar_events row → Inngest event → sequence trigger"
    - "Disconnect revokes OAuth tokens where the provider supports it, deletes vault entries, sets integration status='disconnected'"
    - "All calendar OAuth credentials are gitleaks-clean and listed in .env.example"
    - "coaches.active_calendar_provider tracks the one calendar a coach has chosen; switching updates it atomically"
  artifacts:
    - path: "supabase/migrations/{ts}_calendar_active_provider.sql"
      provides: "coaches.active_calendar_provider column + index"
    - path: "apps/web/lib/calendar/providers.ts"
      provides: "Central per-provider config: name, logo, auth_type, OAuth endpoints, scopes, webhook setup mode"
    - path: "apps/web/lib/oauth/shared.ts"
      provides: "Shared OAuth2 helpers: state CSRF token, redirect URI builder, token vault helper"
    - path: "apps/web/app/api/auth/calendar/[provider]/authorize/route.ts"
      provides: "Dynamic OAuth start route — dispatches by provider config"
    - path: "apps/web/app/api/auth/calendar/[provider]/callback/route.ts"
      provides: "Dynamic OAuth callback — exchange + vault store + webhook registration"
    - path: "apps/web/app/api/auth/calendar/[provider]/api-key/route.ts"
      provides: "Paste-API-key endpoint — validates + vault stores"
    - path: "apps/web/app/api/auth/calendar/[provider]/disconnect/route.ts"
      provides: "Disconnect endpoint — revoke + vault delete + integration row update"
    - path: "apps/web/components/onboarding/StepCalendar.tsx"
      provides: "Onboarding step UI — 7-provider grid + provider-specific connect UI"
    - path: "apps/web/components/settings/CalendarSection.tsx"
      provides: "Settings card — current calendar + Connect/Disconnect + Switch dropdown"
    - path: "docs/CALENDAR-OAUTH-SETUP.md"
      provides: "Per-provider dev-portal setup runbook for Daniel (the 4 OAuth apps he must register)"
  key_links:
    - from: "apps/web/components/settings/CalendarSection.tsx"
      to: "apps/web/lib/calendar/providers.ts"
      via: "renders the provider registry; routes Connect clicks to /api/auth/calendar/[provider]/authorize or /api-key"
      pattern: "components/calendar/.*\\.tsx"
    - from: "apps/web/app/api/webhooks/calendar/*/route.ts"
      to: "coaches.active_calendar_provider"
      via: "unchanged — webhook receivers already key off coachId from the URL; this plan only adds the connect side"
      pattern: "app/api/webhooks/calendar/.*/route\\.ts"
---

<objective>
§2.5 of 06-PLAN.md ("Connect provider in Settings → Integrations" + book/no-show/disconnect for each of 7 providers) is currently un-walkable: the webhook receivers exist but the connect/disconnect UI does not, and there is no per-provider OAuth or API-key flow.

This plan ships the missing connect side end-to-end:

1. DB: one active calendar per coach via `coaches.active_calendar_provider`
2. Provider registry: central config for all 7 (auth type, OAuth endpoints, scopes, webhook mode)
3. OAuth flows: dynamic `/api/auth/calendar/[provider]/{authorize,callback}` for Calendly, Acuity, Square, MS Bookings (mirrors the Gmail pattern)
4. API-key flows: `/api/auth/calendar/[provider]/api-key` for Cal.com, Setmore, TidyCal
5. Webhook setup: auto-register for providers with API support (Calendly, Cal.com, Acuity); display webhook URL + secret for the rest (Setmore, Square, MS Bookings, TidyCal)
6. Disconnect: revoke where possible, drop vault entries, clear integration row
7. Onboarding: new `StepCalendar` between Booking and Voice; 7-card grid; per-provider connect UI inline
8. Settings: `CalendarSection` replacing the calendar slice of the current IntegrationsSection — shows active provider, Disconnect button, "Switch calendar" dropdown
9. Docs: `CALENDAR-OAUTH-SETUP.md` with exact dev-portal links + redirect URIs + scopes for the 4 OAuth apps Daniel must register

Output: a working connect/disconnect flow for all 7 providers (modulo Daniel registering the 4 OAuth apps), so §2.5 becomes a real human walk rather than a build phase.
</objective>

<execution_context>
@.planning/phases/06-testing/06-PLAN.md
@apps/web/app/api/auth/gmail/authorize/route.ts
@apps/web/app/api/auth/gmail/callback/route.ts
@apps/web/lib/gmail/auth.ts
@apps/web/app/api/webhooks/calendar/calendly/route.ts
@supabase/migrations/20260505000002_tables.sql
@supabase/migrations/20260505000005_vault.sql
@packages/shared/src/validators/onboarding.ts
@CLAUDE.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1 — Schema: active_calendar_provider + provider registry + .env.example</name>
  <files>supabase/migrations/{ts}_calendar_active_provider.sql, apps/web/lib/calendar/providers.ts, packages/shared/src/validators/calendar.ts, .env.example</files>
  <action>
1. Migration adds:
   ```sql
   alter table coaches add column active_calendar_provider integration_provider;
   create index coaches_active_calendar_provider_idx on coaches(active_calendar_provider) where active_calendar_provider is not null;
   ```
   Plus a partial unique check at the app layer; we keep it soft per Daniel's decision.
2. `apps/web/lib/calendar/providers.ts` — central registry:
   ```ts
   export type CalendarProviderId = 'calendly' | 'cal_com' | 'acuity' | 'setmore' | 'square' | 'ms_bookings' | 'tidycal'
   export interface CalendarProviderConfig {
     id: CalendarProviderId
     label: string                  // "Calendly"
     logo: string                   // svg path under /public/providers/
     authType: 'oauth2' | 'api_key'
     oauth?: { authUrl, tokenUrl, scopes[], extraParams }
     apiKey?: { helpUrl, fieldLabel, validationEndpoint }
     webhook: { mode: 'auto' | 'manual', registerFn?, displayUrl: (coachId) => string }
   }
   export const CALENDAR_PROVIDERS: Record<CalendarProviderId, CalendarProviderConfig>
   ```
3. Validators in `packages/shared/src/validators/calendar.ts`:
   - `CalendarProviderEnum = z.enum([...7])`
   - `CalendarApiKeyPayloadSchema` (key: non-empty string, max 512)
4. Add to `.env.example` the 8 placeholders (CALENDLY_CLIENT_ID/SECRET, ACUITY_CLIENT_ID/SECRET, SQUARE_CLIENT_ID/SECRET, MS_BOOKINGS_CLIENT_ID/SECRET) plus the 4 webhook-secret env vars already in use.
  </action>
  <verify>
    <automated>test -f apps/web/lib/calendar/providers.ts && grep -E "calendly|cal_com|acuity|setmore|square|ms_bookings|tidycal" apps/web/lib/calendar/providers.ts | wc -l | awk '{ if ($1 >= 7) print "ok"; else print "missing providers" }'</automated>
    <automated>ls supabase/migrations | grep calendar_active_provider</automated>
    <automated>grep -E "CALENDLY_CLIENT_ID|ACUITY_CLIENT_ID|SQUARE_CLIENT_ID|MS_BOOKINGS_CLIENT_ID" .env.example | wc -l | awk '{ if ($1 >= 4) print "ok"; else print "missing env" }'</automated>
  </verify>
  <done>
    Schema migrated, provider registry exposes all 7, env placeholders in place.
  </done>
</task>

<task type="auto">
  <name>Task 2 — Shared OAuth helpers + dynamic authorize/callback routes</name>
  <files>apps/web/lib/oauth/shared.ts, apps/web/app/api/auth/calendar/[provider]/authorize/route.ts, apps/web/app/api/auth/calendar/[provider]/callback/route.ts</files>
  <action>
1. `lib/oauth/shared.ts`:
   - `buildState({coachId, provider, returnTo}) → signed JWT (HS256 with NEXTAUTH_SECRET fallback to AUTH_SECRET)`
   - `verifyState(token) → { coachId, provider, returnTo }`
   - `exchangeAuthorizationCode({provider, code}) → { access_token, refresh_token?, expires_at?, scope }` — generic OAuth2 client_credentials POST per provider config
   - `storeCalendarTokens({coachId, provider, tokens}) → vaultId` — wraps the existing private vault RPC pattern (mirror `store_gmail_tokens` — add a generic `store_calendar_tokens` RPC if needed)
2. Migration `supabase/migrations/{ts}_store_calendar_tokens.sql` adds a generic `private.store_calendar_tokens(p_coach_id uuid, p_provider integration_provider, p_tokens jsonb)` returning vault uuid.
3. `[provider]/authorize/route.ts`:
   - Auth-check, load provider config, reject unknown providers
   - For oauth2 providers: build URL with `state = buildState(...)`, redirect
   - For api_key providers: return 405 (UI knows not to call authorize for these)
4. `[provider]/callback/route.ts`:
   - Verify state, extract coachId+provider
   - Exchange code → tokens
   - Upsert integrations row (status=disconnected interim)
   - Store tokens in vault via RPC; on failure, redirect with error=oauth_vault_failed
   - Update integrations row to status=connected
   - Set coaches.active_calendar_provider = provider
   - If webhook.mode==='auto', kick off webhook registration (delegated to Task 4)
   - Redirect to /onboarding/calendar (if onboarding incomplete) or /settings?connected=calendar
  </action>
  <verify>
    <automated>test -f apps/web/lib/oauth/shared.ts</automated>
    <automated>test -f "apps/web/app/api/auth/calendar/[provider]/authorize/route.ts"</automated>
    <automated>test -f "apps/web/app/api/auth/calendar/[provider]/callback/route.ts"</automated>
    <automated>ls supabase/migrations | grep store_calendar_tokens</automated>
  </verify>
  <done>
    OAuth start + callback work generically for any oauth2 provider in the registry.
  </done>
</task>

<task type="auto">
  <name>Task 3 — API-key paste flow + disconnect route</name>
  <files>apps/web/app/api/auth/calendar/[provider]/api-key/route.ts, apps/web/app/api/auth/calendar/[provider]/disconnect/route.ts</files>
  <action>
1. `api-key/route.ts` POST:
   - Auth-check, parse JSON via `CalendarApiKeyPayloadSchema`
   - Validate provider is `authType==='api_key'`
   - Probe provider's validation endpoint (per registry config) with the key — reject if 401/403
   - Upsert integrations row, store key in vault via `store_calendar_tokens(provider, {api_key: ...})`
   - Set coaches.active_calendar_provider = provider
   - Return `{ok: true, webhookInfo}` so the UI can render webhook paste instructions
2. `disconnect/route.ts` POST:
   - Auth-check, verify the integration belongs to this coach
   - Try OAuth revoke (best-effort, per provider config); ignore failures
   - Delete vault secret via `private.delete_calendar_tokens(coachId, provider)`
   - Update integrations: status='disconnected', vault_secret_id=null, error_message=null
   - If this was the active calendar, clear coaches.active_calendar_provider
   - Return `{ok: true}`
3. Add `private.delete_calendar_tokens` RPC in the same migration as task 2 (or new migration if cleaner).
  </action>
  <verify>
    <automated>test -f "apps/web/app/api/auth/calendar/[provider]/api-key/route.ts"</automated>
    <automated>test -f "apps/web/app/api/auth/calendar/[provider]/disconnect/route.ts"</automated>
  </verify>
  <done>
    API-key providers connect via paste; any provider can be disconnected.
  </done>
</task>

<task type="auto">
  <name>Task 4 — Webhook registration + webhook-info endpoint</name>
  <files>apps/web/lib/calendar/webhooks/*.ts, apps/web/app/api/auth/calendar/webhook-info/route.ts</files>
  <action>
1. `lib/calendar/webhooks/calendly.ts` — calls Calendly's webhook subscriptions API to register the receiver URL with the per-coach webhook secret. Stores webhook subscription id in `integrations.metadata`.
2. `lib/calendar/webhooks/cal-com.ts` — same shape, Cal.com webhook API.
3. `lib/calendar/webhooks/acuity.ts` — Acuity webhook API.
4. For providers without auto-register (Setmore, Square, MS Bookings, TidyCal):
   - No registration call.
   - The UI uses `/api/auth/calendar/webhook-info` to fetch webhook URL + secret to display.
5. `webhook-info/route.ts` GET ?provider=...:
   - Returns `{webhookUrl, secret, instructions}` for the coach to paste into their provider's dashboard.
   - Secret stored in vault on first call (generate if missing, store in `webhook_secret_vault_id`).
6. Call the appropriate `webhooks/{provider}.ts` registerFn from the OAuth callback (Task 2) when `webhook.mode==='auto'`.
  </action>
  <verify>
    <automated>ls apps/web/lib/calendar/webhooks/ | wc -l | awk '{ if ($1 >= 3) print "ok"; else print "missing webhook handlers" }'</automated>
    <automated>test -f apps/web/app/api/auth/calendar/webhook-info/route.ts</automated>
  </verify>
  <done>
    Auto-register works for the 3 providers that support it; webhook URL + secret displayable for the other 4.
  </done>
</task>

<task type="auto">
  <name>Task 5 — Onboarding StepCalendar + step-order update</name>
  <files>apps/web/components/onboarding/StepCalendar.tsx, apps/web/app/(onboarding)/onboarding/calendar/page.tsx, packages/shared/src/validators/onboarding.ts, apps/web/components/onboarding/StepBooking.tsx</files>
  <action>
1. Update `OnboardingStepEnum` to include `'calendar'` and add it between `'booking'` and `'voice'` in `STEP_ORDER`. Add `STEP_TO_PROGRESS_KEY['calendar'] = 'calendar_connected_at'` and `calendar_connected_at` field on `OnboardingProgressSchema`. Migration to add `coaches.onboarding_progress.calendar_connected_at` (or the column it lives in) — verify by reading the schema, only add if needed.
2. `StepBooking.tsx` — on Continue, advance to `/onboarding/calendar` instead of `/onboarding/voice`.
3. `StepCalendar.tsx` (client):
   - 7-card responsive grid; each card: logo + name + auth-type chip
   - On pick → reveal provider-specific connect UI:
     - oauth2 → "Connect with {provider}" button → redirects to `/api/auth/calendar/{provider}/authorize`
     - api_key → ApiKeyForm (Task 6 component)
   - After successful connect → fetch + display WebhookSetupPanel (Task 6) if `webhook.mode==='manual'`
   - "Connected" badge once integrations.status==='connected'
   - Skip-for-now button (records nothing; sets progress.calendar_connected_at to null but advances step) — Daniel can connect later in /settings
4. `app/(onboarding)/onboarding/calendar/page.tsx` — server component, loads coach + integrations, renders StepCalendar with initial state.
5. Apply CLAUDE.md aesthetic: glass cards, backdrop-blur-md, warm palette, dark/light support.
  </action>
  <verify>
    <automated>grep -E "'calendar'" packages/shared/src/validators/onboarding.ts | wc -l | awk '{ if ($1 >= 2) print "ok"; else print "step not wired" }'</automated>
    <automated>test -f apps/web/components/onboarding/StepCalendar.tsx</automated>
    <automated>test -f "apps/web/app/(onboarding)/onboarding/calendar/page.tsx"</automated>
    <automated>grep -E "/onboarding/calendar" apps/web/components/onboarding/StepBooking.tsx | head -1</automated>
  </verify>
  <done>
    Onboarding flow includes Calendar between Booking and Voice; coach can pick + connect or skip.
  </done>
</task>

<task type="auto">
  <name>Task 6 — Reusable calendar components: ProviderCard / ConnectButton / ApiKeyForm / WebhookSetupPanel</name>
  <files>apps/web/components/calendar/ProviderCard.tsx, apps/web/components/calendar/ConnectButton.tsx, apps/web/components/calendar/ApiKeyForm.tsx, apps/web/components/calendar/WebhookSetupPanel.tsx</files>
  <action>
1. `ProviderCard` — selectable card with logo + name + auth-type chip; controlled selected state.
2. `ConnectButton` — for oauth2 providers; triggers redirect to `/api/auth/calendar/{provider}/authorize`. Disabled with tooltip ("Configure {ENV_VAR} to enable") if the OAuth env vars are missing (read flag from server-rendered prop).
3. `ApiKeyForm` — controlled input + Test + Save. On Test → POST to `/api/auth/calendar/{provider}/api-key` with `?dryRun=1`; on Save → real POST. Surfaces errors inline.
4. `WebhookSetupPanel` — shows webhook URL + secret + step-by-step instructions per provider (markdown from provider config). Copy buttons next to URL and secret.
5. Run `/impeccable` audit on the four components before completing the task — fix any 6-pillar issues.
  </action>
  <verify>
    <automated>test -f apps/web/components/calendar/ProviderCard.tsx && test -f apps/web/components/calendar/ConnectButton.tsx && test -f apps/web/components/calendar/ApiKeyForm.tsx && test -f apps/web/components/calendar/WebhookSetupPanel.tsx</automated>
    <automated>grep -E "backdrop-blur|bg-white\/" apps/web/components/calendar/ProviderCard.tsx | head -1</automated>
  </verify>
  <done>
    Four reusable calendar UI components ready, reused in onboarding + settings.
  </done>
</task>

<task type="auto">
  <name>Task 7 — Settings CalendarSection</name>
  <files>apps/web/components/settings/CalendarSection.tsx, apps/web/components/settings/IntegrationsSection.tsx, apps/web/app/(dashboard)/settings/page.tsx</files>
  <action>
1. `CalendarSection.tsx` (client):
   - Header: "Calendar" + active provider badge or "No calendar connected"
   - If connected: provider card + Disconnect button + last_checked_at + collapsible WebhookSetupPanel for manual providers
   - If not connected: "Pick a calendar" CTA + provider dropdown (Select component) showing all 7 + Connect button for the picked one
   - "Switch calendar" link when connected: opens dropdown with the other 6 → on switch, confirms via Dialog → POSTs disconnect on current → starts connect for new (redirect for oauth2 or render ApiKeyForm inline)
   - All async actions show loading state + toast on success/error
2. Update `IntegrationsSection.tsx` to drop calendar from its hard-coded `KEY_PROVIDERS` list (leave gmail/slack/twilio only).
3. Add CalendarSection to `/settings/page.tsx` between Integrations and Sign-out.
4. Add `'calendar'` to SettingsNav.
5. Apply CLAUDE.md aesthetic; /impeccable audit pass.
  </action>
  <verify>
    <automated>test -f apps/web/components/settings/CalendarSection.tsx</automated>
    <automated>grep -E "CalendarSection" "apps/web/app/(dashboard)/settings/page.tsx"</automated>
    <automated>! grep -E "calendly" apps/web/components/settings/IntegrationsSection.tsx</automated>
  </verify>
  <done>
    /settings has a Calendar card with Connect/Disconnect + Switch dropdown for all 7 providers.
  </done>
</task>

<task type="auto">
  <name>Task 8 — CALENDAR-OAUTH-SETUP.md + §2.5 walk readiness</name>
  <files>docs/CALENDAR-OAUTH-SETUP.md, .planning/phases/06-testing/06-PLAN.md</files>
  <action>
1. Write `docs/CALENDAR-OAUTH-SETUP.md`:
   - One H2 section per OAuth provider (Calendly, Acuity, Square, MS Bookings)
   - Each section: dev-portal URL, redirect URI (`${APP_URL}/api/auth/calendar/{provider}/callback`), required scopes, where to find client_id/secret, which .env var to set
   - Webhook signing secret instructions per provider
   - Common gotchas (e.g. MS Bookings needs tenant configuration)
2. Update §2.5 of 06-PLAN.md to reference the new flow:
   - Replace "Connect provider in Settings → Integrations" with the concrete UI flow built here
   - Mark which providers are testable today vs. require Daniel to register OAuth apps first
   - Add a §2.5a "Connect/disconnect smoke" subsection (5 min per provider, no booking required)
3. Commit both.
  </action>
  <verify>
    <automated>test -f docs/CALENDAR-OAUTH-SETUP.md</automated>
    <automated>grep -E "Calendly|Acuity|Square|MS Bookings" docs/CALENDAR-OAUTH-SETUP.md | wc -l | awk '{ if ($1 >= 4) print "ok"; else print "missing provider sections" }'</automated>
  </verify>
  <done>
    Daniel has the runbook for OAuth-app registration; §2.5 of 06-PLAN.md describes the new UI and its testable subset.
  </done>
</task>

</tasks>

<must_check>
1. Type-check passes after each wave (`pnpm --filter web typecheck`).
2. No plaintext OAuth tokens or API keys in any column outside Vault.
3. RLS still enforces coach_id scoping on integrations (existing) — Task 2/3 routes use service-role only inside the API route, never expose vault contents to the client.
4. Webhook signature verification still required on inbound — no changes to /api/webhooks/calendar/*.
5. gitleaks scan clean after .env.example + docs updates.
6. /impeccable audit on the new UI components.
</must_check>
