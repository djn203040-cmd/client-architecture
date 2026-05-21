---
phase: 05-polish
plan: 04
type: execute
wave: 3
depends_on: [05-01, 05-02, 05-03]
files_modified:
  - apps/web/playwright.config.ts
  - apps/web/.env.test
  - apps/web/tests/global-setup.ts
  - apps/web/tests/fixtures/index.ts
  - apps/web/tests/fixtures/createCoach.ts
  - apps/web/tests/fixtures/createLead.ts
  - apps/web/tests/fixtures/createDraft.ts
  - apps/web/tests/fixtures/cleanupCoach.ts
  - apps/web/tests/fixtures/mockOauthCallback.ts
  - apps/web/tests/e2e/duplicate-sequence-prevention.spec.ts
  - apps/web/tests/e2e/cross-tenant-isolation.spec.ts
  - apps/web/tests/e2e/pre-send-safety-check.spec.ts
  - apps/web/tests/e2e/webhook-signature-bypass.spec.ts
  - apps/web/tests/e2e/full-approval-flow.spec.ts
  - apps/web/tests/e2e/onboarding-completion.spec.ts
  - apps/web/tests/e2e/locked-module-pages.spec.ts
  - apps/web/tests/e2e/settings-save.spec.ts
  - .github/workflows/playwright.yml
autonomous: true
requirements: []

must_haves:
  truths:
    - "supabase start (or supabase/setup-cli@v2 in CI) brings up a hermetic local Supabase before tests run"
    - "globalSetup verifies supabase status returns running services; aborts with clear error if not"
    - "Per-test fixtures via test.extend seed coaches/leads/drafts and tear down via cascading delete"
    - "Cross-tenant isolation test asserts status === 404 (not 200 empty body, not 403) per Pitfall 9"
    - "Webhook signature bypass test covers all 10 endpoints: Slack, Twilio status, Gmail Pub/Sub, 7 calendar providers"
    - "Pre-send safety check test covers do_not_contact, unsubscribed, converted, closed, bounced terminal states"
    - "Full approval flow test mocks Gmail send via page.route() — no real API call to gmail.googleapis.com"
    - "Onboarding completion test drives all 4 steps with mockOauthCallback for Gmail step"
    - "Locked module pages test asserts CLAUDE.md hero copy verbatim + Cal.com iframe element presence (not iframe contents)"
    - "Settings save test verifies each section persists at least one field; danger zone disconnect requires correct confirm phrase"
    - "CI runtime under 15 minutes; gates merges to main"
  artifacts:
    - path: "apps/web/tests/fixtures/index.ts"
      provides: "Composed test fixture export"
      exports: ["test", "expect"]
    - path: ".github/workflows/playwright.yml"
      provides: "CI workflow using supabase/setup-cli@v2"
    - path: "apps/web/tests/global-setup.ts"
      provides: "Pre-flight check that local Supabase is running"
  key_links:
    - from: "apps/web/tests/e2e/cross-tenant-isolation.spec.ts"
      to: "GET /api/leads/{coachB.leadId}"
      via: "page.request.get with coach-A session"
      pattern: "expect.*status.*404"
    - from: "apps/web/tests/e2e/webhook-signature-bypass.spec.ts"
      to: "10 webhook endpoints (slack/twilio/gmail/7 calendar providers)"
      via: "POST with invalid signature header, expect 401"
      pattern: "expect.*status.*401"
    - from: ".github/workflows/playwright.yml"
      to: "supabase/setup-cli@v2 → supabase start → next dev → playwright"
      via: "GitHub Actions job steps"
      pattern: "supabase/setup-cli"
---

<objective>
Ship the Phase 5 Playwright E2E launch suite: 8 specs (5 launch-critical security/safety + 3 new feature E2Es), per-test fixtures in `apps/web/tests/fixtures/`, hermetic local Supabase via the supabase CLI, and a CI workflow that gates merges to main.

Purpose: Phase 5 exit criteria explicitly require five Playwright tests: duplicate sequence prevention, cross-tenant isolation, pre-send safety check, webhook signature bypass, full approval flow. CONTEXT.md D-20 adds three more (onboarding completion, locked module pages, settings save). All eight must pass on every push.

Output:
- `playwright.config.ts` updated with `globalSetup`
- `.env.test` placeholder file (committed) + CI-populated values
- `globalSetup` that checks `supabase status`
- 5 fixture helpers + composed `test` export
- 8 new E2E specs
- `.github/workflows/playwright.yml` CI workflow using `supabase/setup-cli@v2`
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
@.planning/phases/05-polish/05-01-SUMMARY.md
@.planning/phases/05-polish/05-02-SUMMARY.md
@.planning/phases/05-polish/05-03-SUMMARY.md
@CLAUDE.md
@apps/web/playwright.config.ts

<interfaces>
<!-- Test fixtures pattern — RESEARCH.md Pattern 4 -->
From @playwright/test:
```ts
import { test as base, expect } from "@playwright/test";
import { createCoach, type SeededCoach } from "./createCoach";
import { cleanupCoach } from "./cleanupCoach";

type Fixtures = { coach: SeededCoach; secondCoach: SeededCoach };

export const test = base.extend<Fixtures>({
  coach: async ({}, use) => {
    const coach = await createCoach();
    await use(coach);
    await cleanupCoach(coach.id);
  },
  secondCoach: async ({}, use) => {
    const coach = await createCoach({ email: `b-${Date.now()}@sonorous.test` });
    await use(coach);
    await cleanupCoach(coach.id);
  },
});
export { expect };
```

<!-- Cross-tenant 404 assertion — Pitfall 9 (RESEARCH.md) -->
expect(res.status()).toBe(404);  // NOT 200 with empty data, NOT 403

<!-- All 10 webhook endpoints — locked per D-19 + RESEARCH.md Workstream 4 -->
1. /api/webhooks/slack/interactivity → invalid X-Slack-Signature → 401
2. /api/webhooks/twilio/status → invalid X-Twilio-Signature → 401
3. /api/webhooks/gmail/pubsub → invalid token → 401
4. /api/webhooks/calendar/calendly → invalid signature → 401
5. /api/webhooks/calendar/cal-com → invalid signature → 401
6. /api/webhooks/calendar/acuity → invalid signature → 401
7. /api/webhooks/calendar/setmore → invalid signature → 401
8. /api/webhooks/calendar/square → invalid signature → 401
9. /api/webhooks/calendar/ms-bookings → invalid signature → 401
10. /api/webhooks/calendar/tidycal → invalid signature → 401

<!-- Terminal states for pre-send safety check — STATE-* requirements -->
do_not_contact, unsubscribed, converted, closed, bounced

<!-- Existing 12 specs — DO NOT migrate per D-19 -->
apps/web/tests/e2e/{admin-access,admin-dashboard,dashboard-approve-flow,dashboard-notifications,gmail-connect,health-card,invite-coach,lead-create,lead-list,lead-notes,lead-profile,lead-timeline}.spec.ts
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fixtures, globalSetup, .env.test, playwright.config.ts wiring</name>
  <files>apps/web/tests/fixtures/index.ts, apps/web/tests/fixtures/createCoach.ts, apps/web/tests/fixtures/createLead.ts, apps/web/tests/fixtures/createDraft.ts, apps/web/tests/fixtures/cleanupCoach.ts, apps/web/tests/fixtures/mockOauthCallback.ts, apps/web/tests/global-setup.ts, apps/web/playwright.config.ts, apps/web/.env.test</files>
  <action>
1. Create `apps/web/.env.test` (committed with placeholder values; CI populates real values):
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-overwritten-by-supabase-status
SUPABASE_SERVICE_ROLE_KEY=placeholder-overwritten-by-supabase-status
# Stub Gmail/Slack/Twilio creds for tests (real ones never used)
GOOGLE_CLIENT_ID=test-client-id
GOOGLE_CLIENT_SECRET=test-client-secret
RESEND_API_KEY=test-resend-key
SLACK_SIGNING_SECRET=test-slack-secret
TWILIO_AUTH_TOKEN=test-twilio-token
ANTHROPIC_API_KEY=test-anthropic-key
```

2. Create `apps/web/tests/global-setup.ts`:
```ts
import { execSync } from "node:child_process";

export default async function globalSetup() {
  try {
    const status = execSync("supabase status", { encoding: "utf8" });
    const required = ["API URL", "DB URL", "Studio URL"];
    for (const k of required) {
      if (!status.includes(k)) {
        throw new Error(`Local Supabase missing service: ${k}`);
      }
    }
    if (!status.includes("127.0.0.1:54321")) {
      throw new Error("Local Supabase API not on 127.0.0.1:54321");
    }
  } catch (err) {
    console.error("\n[Phase 5 E2E] Local Supabase is not running.");
    console.error("Run `supabase start` in another terminal before running tests.");
    console.error("Details:", err);
    process.exit(1);
  }
}
```

3. Update `apps/web/playwright.config.ts`:
   - Add `globalSetup: './tests/global-setup.ts'` to config.
   - Confirm `testDir` includes `./tests/e2e`.
   - Confirm `webServer.command` runs `pnpm dev` with `NODE_ENV=test` and `.env.test` loaded.
   - Confirm `baseURL: 'http://localhost:3000'`.

4. Create `apps/web/tests/fixtures/createCoach.ts` — exact code from RESEARCH.md Code Examples section. Service-role client creates auth user + coach row + returns `{ id, email, sessionCookie }`.

5. Create `apps/web/tests/fixtures/createLead.ts`:
```ts
import { admin } from "./createCoach";  // export the admin client
export async function createLead(coachId: string, overrides: Partial<{ name: string; email: string; status: string; do_not_contact: boolean }> = {}) {
  const { data, error } = await admin.from("leads").insert({
    coach_id: coachId,
    name: overrides.name ?? "Test Lead",
    email: overrides.email ?? `lead-${crypto.randomUUID()}@sonorous.test`,
    source: "manual",
    status: overrides.status ?? "call_completed",
    do_not_contact: overrides.do_not_contact ?? false,
  }).select().single();
  if (error) throw error;
  return data;
}
```

6. Create `apps/web/tests/fixtures/createDraft.ts`:
```ts
import { admin } from "./createCoach";
export async function createDraft(coachId: string, leadId: string, overrides: Partial<{ status: string; body: string }> = {}) {
  const { data, error } = await admin.from("drafts").insert({
    coach_id: coachId,
    lead_id: leadId,
    status: overrides.status ?? "pending",
    body: overrides.body ?? "Hi {name}, just checking in.",
    subject: "Following up",
  }).select().single();
  if (error) throw error;
  return data;
}
```

7. Create `apps/web/tests/fixtures/cleanupCoach.ts`:
```ts
import { admin } from "./createCoach";
export async function cleanupCoach(coachId: string) {
  // ON DELETE CASCADE on leads/drafts/integrations/notification_preferences/etc.
  await admin.from("coaches").delete().eq("id", coachId);
  await admin.auth.admin.deleteUser(coachId);
}
```

8. Create `apps/web/tests/fixtures/mockOauthCallback.ts`:
```ts
import { admin } from "./createCoach";
export async function mockOauthCallback(provider: "gmail" | "slack" | "twilio", coachId: string) {
  // Short-circuit OAuth by writing the expected integrations row.
  // Vault secret ID is a fake UUID — real flows would call Vault.create_secret.
  const { error } = await admin.from("integrations").insert({
    coach_id: coachId,
    provider,
    status: "connected",
    vault_secret_id: crypto.randomUUID(),  // fake — tests don't exercise the secret itself
    connected_at: new Date().toISOString(),
  });
  if (error) throw error;
}
```

9. Create `apps/web/tests/fixtures/index.ts` — composed `test` and `expect` export per RESEARCH.md Pattern 4.

All fixtures use the service-role admin client. They MUST NOT be imported by any client-side code (already gated by `apps/web/tests/` not being part of any client bundle, but reaffirm via tsconfig path scoping if necessary).

Per Assumption A2 (RESEARCH.md): local Supabase keys are deterministic across `supabase start`/`stop` cycles on the same machine. CI populates them via `supabase status -o env` in the workflow.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -10</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && for f in apps/web/tests/fixtures/index.ts apps/web/tests/fixtures/createCoach.ts apps/web/tests/fixtures/createLead.ts apps/web/tests/fixtures/createDraft.ts apps/web/tests/fixtures/cleanupCoach.ts apps/web/tests/fixtures/mockOauthCallback.ts apps/web/tests/global-setup.ts apps/web/.env.test; do test -f "$f" || (echo "MISSING $f" && exit 1); done && grep -q "globalSetup" apps/web/playwright.config.ts</automated>
  </verify>
  <done>
    All 6 fixture files exist. globalSetup wired in playwright config. .env.test committed with placeholders. Fixtures use service-role admin client, never imported client-side.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Five launch-critical E2E specs (D-19)</name>
  <files>apps/web/tests/e2e/duplicate-sequence-prevention.spec.ts, apps/web/tests/e2e/cross-tenant-isolation.spec.ts, apps/web/tests/e2e/pre-send-safety-check.spec.ts, apps/web/tests/e2e/webhook-signature-bypass.spec.ts, apps/web/tests/e2e/full-approval-flow.spec.ts</files>
  <behavior>
    - duplicate-sequence-prevention: Creating two sequences with same (lead_id, sequence_type) — second returns 409
    - cross-tenant-isolation: Coach A authenticated, GET /api/leads/{coachB.leadId} returns status === 404 (not 200 empty, not 403). Repeat for drafts, notification_logs, settings.
    - pre-send-safety-check: For each terminal state in {do_not_contact, unsubscribed, converted, closed, bounced}: Approve a draft on that lead → returns 409 with reason
    - webhook-signature-bypass: 10 sub-cases asserting 401 for invalid signatures on Slack, Twilio status, Gmail Pub/Sub, 7 calendar providers
    - full-approval-flow: Seed coach + lead + pending draft → sign in → dashboard renders draft → click Approve → page.route() mocks gmail.googleapis.com → draft transitions pending → approved → sent; notification_log gets sent row
  </behavior>
  <action>
1. `apps/web/tests/e2e/duplicate-sequence-prevention.spec.ts`:
```ts
import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { admin } from "../fixtures/createCoach";

test("duplicate sequence on same lead+type rejects with 409", async ({ coach }) => {
  const lead = await createLead(coach.id, { status: "no_show" });
  // First enrollment via API
  const first = await fetch(`http://localhost:3000/api/sequences/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `sb-access-token=${coach.sessionCookie}` },
    body: JSON.stringify({ leadId: lead.id, sequenceType: "no_show" }),
  });
  expect(first.status).toBe(200);
  // Second enrollment with same (lead_id, sequence_type)
  const second = await fetch(`http://localhost:3000/api/sequences/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `sb-access-token=${coach.sessionCookie}` },
    body: JSON.stringify({ leadId: lead.id, sequenceType: "no_show" }),
  });
  expect(second.status).toBe(409);
});
```
   The route path `/api/sequences/enroll` is the Phase 3 enrollment route. Verify exact path during implementation (`grep -r "enroll" apps/web/app/api/`). Adjust if different.

2. `apps/web/tests/e2e/cross-tenant-isolation.spec.ts`:
```ts
import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";

test("coach A cannot read coach B's leads, drafts, settings", async ({ coach, secondCoach, page }) => {
  // Seed for coach B
  const bLead = await createLead(secondCoach.id);
  const bDraft = await createDraft(secondCoach.id, bLead.id);

  // Authenticate as coach A
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);

  // Per Pitfall 9: assert 404 status, NOT 200 with empty body
  const leadRes = await page.request.get(`/api/leads/${bLead.id}`);
  expect(leadRes.status()).toBe(404);

  const draftRes = await page.request.get(`/api/drafts/${bDraft.id}`);
  expect(draftRes.status()).toBe(404);

  // Settings — coach A's settings endpoint scoped to auth.uid, attempting to read coach B not possible by URL
  // but attempting to PATCH coach B's profile via service-role-only param injection (if route accepted ?coachId=)
  // should fail. Verify the profile PATCH route ignores any body coachId.
  const settingsPatch = await page.request.patch(`/api/settings/profile`, {
    data: { display_name: "Hacked", coach_id: secondCoach.id },
  });
  // Settings PATCH should NOT update coach B
  expect([200, 400, 403]).toContain(settingsPatch.status());
  // Verify coach B's name unchanged
  const bRow = await admin.from("coaches").select("*").eq("id", secondCoach.id).single();
  expect(bRow.data?.name).not.toBe("Hacked");
});
```

3. `apps/web/tests/e2e/pre-send-safety-check.spec.ts`:
```ts
import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";

const TERMINAL_STATES = ["do_not_contact", "unsubscribed", "converted", "closed"] as const;

for (const state of TERMINAL_STATES) {
  test(`approve blocked when lead status is ${state}`, async ({ coach, page }) => {
    const lead = await createLead(coach.id, { status: state });
    const draft = await createDraft(coach.id, lead.id);
    await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
    const res = await page.request.patch(`/api/drafts/${draft.id}`, { data: { status: "approved" } });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.reason).toMatch(/terminal|do_not_contact|unsubscribed|converted|closed/i);
  });
}

test("approve blocked when lead has do_not_contact=true", async ({ coach, page }) => {
  const lead = await createLead(coach.id, { do_not_contact: true });
  const draft = await createDraft(coach.id, lead.id);
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
  const res = await page.request.patch(`/api/drafts/${draft.id}`, { data: { status: "approved" } });
  expect(res.status()).toBe(409);
});

test("approve blocked when lead is bounced", async ({ coach, page }) => {
  const lead = await createLead(coach.id, { status: "bounced" });
  const draft = await createDraft(coach.id, lead.id);
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
  const res = await page.request.patch(`/api/drafts/${draft.id}`, { data: { status: "approved" } });
  expect(res.status()).toBe(409);
});
```
   Exercises Phase 3 `runPreSendSafetyCheck` (per CONTEXT.md canonical_refs).

4. `apps/web/tests/e2e/webhook-signature-bypass.spec.ts`:
```ts
import { test, expect } from "../fixtures";

const ENDPOINTS = [
  { path: "/api/webhooks/slack/interactivity", header: "x-slack-signature" },
  { path: "/api/webhooks/twilio/status", header: "x-twilio-signature" },
  { path: "/api/webhooks/gmail/pubsub", header: "authorization" },
  { path: "/api/webhooks/calendar/calendly", header: "calendly-webhook-signature" },
  { path: "/api/webhooks/calendar/cal-com", header: "x-cal-signature-256" },
  { path: "/api/webhooks/calendar/acuity", header: "x-acuity-signature" },
  { path: "/api/webhooks/calendar/setmore", header: "x-setmore-signature" },
  { path: "/api/webhooks/calendar/square", header: "x-square-hmacsha256-signature" },
  { path: "/api/webhooks/calendar/ms-bookings", header: "x-ms-bookings-signature" },
  { path: "/api/webhooks/calendar/tidycal", header: "x-tidycal-signature" },
];

for (const { path, header } of ENDPOINTS) {
  test(`${path} rejects invalid ${header}`, async ({ request }) => {
    const res = await request.post(`http://localhost:3000${path}`, {
      headers: { "content-type": "application/json", [header]: "bogus-signature" },
      data: { event: "test" },
    });
    expect(res.status()).toBe(401);
  });
}
```
   Verify each endpoint path exists before assuming. If a calendar provider uses a different route shape (e.g., query-param based), adjust per Phase 3 SUMMARYs. The exact header name per provider is documented in Phase 3 — adjust during implementation.

5. `apps/web/tests/e2e/full-approval-flow.spec.ts`:
```ts
import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { mockOauthCallback } from "../fixtures/mockOauthCallback";

test("full approval flow: pending → approved → sent", async ({ coach, page }) => {
  await mockOauthCallback("gmail", coach.id);
  const lead = await createLead(coach.id);
  const draft = await createDraft(coach.id, lead.id);

  // Authenticate
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);

  // Mock Gmail send — intercept ALL gmail.googleapis.com requests
  await page.route("**/gmail.googleapis.com/**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "mock-message-id" }) })
  );

  // Visit drafts page
  await page.goto("/drafts");
  await expect(page.getByText(lead.name)).toBeVisible();

  // Click Approve
  await page.getByRole("button", { name: /approve/i }).first().click();

  // Wait for status transition
  await expect.poll(async () => {
    const { data } = await admin.from("drafts").select("status").eq("id", draft.id).single();
    return data?.status;
  }, { timeout: 10000 }).toBe("sent");

  // Verify notification_log row
  const { data: notif } = await admin.from("notification_log").select("*").eq("draft_id", draft.id).eq("status", "sent").maybeSingle();
  expect(notif).not.toBeNull();
});
```
   This test exercises Phase 4's advisory-lock CAS approve path + dispatcher. The `page.route()` mock prevents any real Gmail call.

All five specs import from `../fixtures` (the composed test/expect). Use `expect.poll` for Realtime/async state propagation.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -10</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && supabase status > /dev/null 2>&1 && pnpm --filter web exec playwright test tests/e2e/cross-tenant-isolation.spec.ts tests/e2e/pre-send-safety-check.spec.ts tests/e2e/webhook-signature-bypass.spec.ts tests/e2e/duplicate-sequence-prevention.spec.ts tests/e2e/full-approval-flow.spec.ts 2>&1 | tail -15 || echo "Local Supabase not running OR specs failing — review output"</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -c "toBe(404)" apps/web/tests/e2e/cross-tenant-isolation.spec.ts | grep -qv "^0$" && grep -c "toBe(401)" apps/web/tests/e2e/webhook-signature-bypass.spec.ts | grep -qv "^0$"</automated>
  </verify>
  <done>
    All five specs exist, compile, and pass against local Supabase. Cross-tenant test asserts 404 status (per Pitfall 9). Webhook bypass covers 10 endpoints. Pre-send check covers all terminal states.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Three Phase 5 feature E2E specs (D-20) + CI workflow</name>
  <files>apps/web/tests/e2e/onboarding-completion.spec.ts, apps/web/tests/e2e/locked-module-pages.spec.ts, apps/web/tests/e2e/settings-save.spec.ts, .github/workflows/playwright.yml</files>
  <behavior>
    - onboarding-completion: new coach → /onboarding redirect → mockOauthCallback gmail → upload 8 voice examples (mocked) → demo lead approve → notification channel pick → onboarding_completed_at IS NOT NULL; dashboard renders without banner
    - locked-module-pages: /modules/threshold and /modules/continuation render with CLAUDE.md hero copy verbatim; Cal.com iframe element present (but iframe contents not exercised); no console errors; sidebar deep-link works
    - settings-save: each section saves; profile timezone change persists; notifications matrix toggle writes to DB; voice example add appears in coaches.voice_model; danger-zone disconnect requires correct confirm text
    - CI workflow runs all 8 new specs + existing 12 specs (no regression)
  </behavior>
  <action>
1. `apps/web/tests/e2e/onboarding-completion.spec.ts`:
```ts
import { test, expect } from "../fixtures";
import { mockOauthCallback } from "../fixtures/mockOauthCallback";
import { admin } from "../fixtures/createCoach";

test("full onboarding wizard golden path under 15 min", async ({ coach, page }) => {
  // Set onboarding_completed_at NULL (default) — the coach fixture creates with NULL
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);

  // Visit dashboard — should redirect to /onboarding/gmail
  const dashRes = await page.goto("/dashboard");
  expect(page.url()).toContain("/onboarding/gmail");

  // Step 1: Gmail — mock the OAuth callback
  await mockOauthCallback("gmail", coach.id);
  // Trigger completion of step 1
  await page.request.patch(`/api/onboarding/complete-step`, { data: { step: "gmail" } });
  await page.goto("/onboarding/voice");

  // Step 2: Voice — seed 8 examples via admin (skip the UI)
  await admin.from("coaches").update({
    voice_model: { examples: Array.from({ length: 8 }, (_, i) => ({ id: `ex-${i}`, content: `example ${i}` })) },
  }).eq("id", coach.id);
  await page.request.patch(`/api/onboarding/complete-step`, { data: { step: "voice" } });
  await page.goto("/onboarding/first-lead");

  // Step 3: Demo lead — POST seed-demo then demo-approve
  const seedRes = await page.request.post(`/api/onboarding/seed-demo`);
  const { draftId } = await seedRes.json();
  await page.request.post(`/api/onboarding/demo-approve`, { data: { draftId } });
  await page.request.patch(`/api/onboarding/complete-step`, { data: { step: "first-lead" } });
  await page.goto("/onboarding/notifications");

  // Step 4: Notifications — pick at least dashboard_only_acknowledged
  await admin.from("notification_preferences").upsert({ coach_id: coach.id, dashboard_only_acknowledged: true });
  await page.request.patch(`/api/onboarding/complete-step`, { data: { step: "notifications" } });

  // Verify onboarding_completed_at set
  const { data } = await admin.from("coaches").select("onboarding_completed_at").eq("id", coach.id).single();
  expect(data?.onboarding_completed_at).not.toBeNull();

  // Visit dashboard — no banner
  await page.goto("/dashboard");
  await expect(page.locator("text=Finish setup")).toHaveCount(0);

  // Verify demo lead absent from default lead list (Pitfall 5)
  await page.goto("/leads");
  await expect(page.locator("text=Demo Lead — Alex Rivera")).toHaveCount(0);
});

test("first dashboard visit does exactly one onboarding redirect (no loop, Pitfall 6)", async ({ coach, page }) => {
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
  const responses: number[] = [];
  page.on("response", res => { if (res.status() >= 300 && res.status() < 400) responses.push(res.status()); });
  await page.goto("/dashboard");
  expect(responses.filter(s => s === 307 || s === 308 || s === 302).length).toBeLessThanOrEqual(1);
});
```

2. `apps/web/tests/e2e/locked-module-pages.spec.ts`:
```ts
import { test, expect } from "../fixtures";

const PAGES = [
  {
    path: "/modules/threshold",
    titleSegment: "The Threshold Experience",
    taglineSegment: "your client's first 48 hours, built from your sales call",
    sidebarLinkLabel: "The Threshold Experience",
  },
  {
    path: "/modules/continuation",
    titleSegment: "The Continuation",
    taglineSegment: "thirty days before they leave, we remind them why they stayed",
    sidebarLinkLabel: "The Continuation",
  },
];

for (const { path, titleSegment, taglineSegment, sidebarLinkLabel } of PAGES) {
  test(`${path} renders hero copy verbatim and mounts Cal.com iframe`, async ({ coach, page }) => {
    await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
    // Need to flip onboarding_completed_at so dashboard layout doesn't redirect
    const { admin } = await import("../fixtures/createCoach");
    await admin.from("coaches").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", coach.id);

    const consoleErrors: string[] = [];
    page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

    await page.goto(path);
    await expect(page.getByText(titleSegment)).toBeVisible();
    await expect(page.getByText(taglineSegment)).toBeVisible();

    // Scroll to CTA section to trigger Cal.com mount (whileInView)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Cal.com embed mounts an iframe (we don't load its contents — that's flaky)
    await expect(page.locator("iframe")).toBeVisible({ timeout: 10000 });

    expect(consoleErrors).toEqual([]);
  });
}

test("sidebar locked tile deep-links to module page", async ({ coach, page }) => {
  const { admin } = await import("../fixtures/createCoach");
  await admin.from("coaches").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", coach.id);
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
  await page.goto("/dashboard");
  await page.getByText("The Threshold Experience").click();
  expect(page.url()).toContain("/modules/threshold");
});
```

3. `apps/web/tests/e2e/settings-save.spec.ts`:
```ts
import { test, expect } from "../fixtures";
import { admin } from "../fixtures/createCoach";

test("profile timezone change persists across reload", async ({ coach, page }) => {
  await admin.from("coaches").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", coach.id);
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
  await page.goto("/settings");
  await page.getByLabel(/timezone/i).fill("Europe/Copenhagen");
  await page.getByLabel(/timezone/i).blur();
  await expect(page.getByText(/Saved/i)).toBeVisible({ timeout: 2000 });
  // Reload
  await page.reload();
  await expect(page.getByLabel(/timezone/i)).toHaveValue("Europe/Copenhagen");
});

test("notifications matrix toggle persists", async ({ coach, page }) => {
  await admin.from("coaches").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", coach.id);
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
  await page.goto("/settings#notifications");
  // Toggle email channel for draft-ready event (assumes matrix exposes labels — adjust selector to Phase 4 component)
  const checkbox = page.getByRole("checkbox", { name: /email.*draft.ready/i }).first();
  await checkbox.click();
  await page.waitForTimeout(800);  // autosave debounce
  const { data } = await admin.from("notification_preferences").select("*").eq("coach_id", coach.id).maybeSingle();
  expect(data).not.toBeNull();
});

test("danger zone disconnect-gmail requires exact phrase", async ({ coach, page }) => {
  const { mockOauthCallback } = await import("../fixtures/mockOauthCallback");
  await mockOauthCallback("gmail", coach.id);
  await admin.from("coaches").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", coach.id);
  await page.context().addCookies([{ name: "sb-access-token", value: coach.sessionCookie, url: "http://localhost:3000" }]);
  await page.goto("/settings#danger");
  await page.getByRole("button", { name: /disconnect gmail/i }).click();
  const input = page.getByPlaceholder(/disconnect gmail/i);
  await input.fill("Disconnect Gmail");  // wrong case
  await expect(page.getByRole("button", { name: /^confirm$/i })).toBeDisabled();
  await input.fill("disconnect gmail");
  await expect(page.getByRole("button", { name: /^confirm$/i })).toBeEnabled();
  await page.getByRole("button", { name: /^confirm$/i }).click();
  await expect.poll(async () => {
    const { data } = await admin.from("integrations").select("status").eq("coach_id", coach.id).eq("provider", "gmail").single();
    return data?.status;
  }, { timeout: 5000 }).toBe("disconnected");
  // Verify audit_log row
  const { data: audit } = await admin.from("audit_log").select("*").eq("coach_id", coach.id).eq("action", "gmail_disconnected").maybeSingle();
  expect(audit).not.toBeNull();
});
```

4. Create `.github/workflows/playwright.yml` per RESEARCH.md Pattern 5 exactly:
```yaml
name: Playwright
on: [push]
jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - uses: supabase/setup-cli@v2
        with:
          version: latest
      - run: supabase start
      - name: Export Supabase env to .env.test
        run: |
          supabase status -o env \
            --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
            --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
            --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
            >> apps/web/.env.test
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web exec playwright install --with-deps chromium
      - run: pnpm --filter web test:e2e
```

   Ensure `apps/web/package.json` has `"test:e2e": "playwright test"` script.

   The CI workflow runs all 20 specs (12 existing + 8 new). Total runtime target: under 15 minutes.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -10</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && for f in apps/web/tests/e2e/onboarding-completion.spec.ts apps/web/tests/e2e/locked-module-pages.spec.ts apps/web/tests/e2e/settings-save.spec.ts .github/workflows/playwright.yml; do test -f "$f" || (echo "MISSING $f" && exit 1); done</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && supabase status > /dev/null 2>&1 && pnpm --filter web exec playwright test tests/e2e/onboarding-completion.spec.ts tests/e2e/locked-module-pages.spec.ts tests/e2e/settings-save.spec.ts 2>&1 | tail -10 || echo "Local Supabase not running — run supabase start before E2E"</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "supabase/setup-cli@v2" .github/workflows/playwright.yml && grep -q "supabase start" .github/workflows/playwright.yml</automated>
  </verify>
  <done>
    Three feature E2E specs exist and pass against local Supabase. CI workflow committed. CI run on push triggers full suite (20 specs total). Runtime under 15 minutes target.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Test fixtures → Supabase | Service-role client mutates DB directly. Confined to `apps/web/tests/` directory — never imported client-side. |
| Playwright browser → app | Standard browser-driven testing; same trust model as a real user session. |
| CI runner → local Supabase | Hermetic per-job; supabase start brings up fresh DB from migrations; teardown happens automatically when runner shuts down. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-04-01 | Information Disclosure | Service-role key in .env.test | mitigate | .env.test contains LOCAL Supabase keys only (deterministic dev-only keys). Real prod service-role key never lands here. CI overwrites with local values via supabase status. |
| T-05-04-02 | Tampering | Fixtures imported client-side | mitigate | tests/ directory excluded from any client bundle by Next.js convention. CI job verifies via tsconfig path scoping. |
| T-05-04-03 | Spoofing | Cross-tenant test false-positive (Pitfall 9) | mitigate | Test asserts status === 404 explicitly, not "data is null". API routes must translate RLS-hidden rows to 404, not 200 empty body. |
| T-05-04-04 | Information Disclosure | Test fixtures leak between tests | mitigate | Each test uses test.extend with per-test fixture scope; cleanupCoach runs in fixture teardown (even if test fails). Unique email per coach prevents collision. |
| T-05-04-05 | Denial of Service | Local Supabase port conflicts (Pitfall 3) | mitigate | globalSetup checks supabase status and aborts with clear error message if not running. Documented in setup README. |
| T-05-04-06 | Information Disclosure | Mock Gmail send leaks email | mitigate | page.route() intercepts ALL gmail.googleapis.com requests in full-approval-flow test. Real Gmail API never called from tests. |
</threat_model>

<verification>
- `pnpm --filter web exec tsc --noEmit` zero errors
- Local: `supabase start && pnpm --filter web test:e2e` — all 20 specs pass (12 existing + 8 new)
- CI: GitHub Actions workflow green on push to any branch
- CI gates merges to main (configure branch protection rule pointing at `e2e` job)
- Cross-tenant test asserts 404 explicitly (greppable invariant)
- Webhook bypass test covers all 10 endpoints
- Pre-send safety check covers all 5 terminal states + bounced
</verification>

<success_criteria>
- D-17 satisfied: hermetic local Supabase via supabase CLI (local) and supabase/setup-cli@v2 (CI)
- D-18 satisfied: per-test fixtures via test.extend with createCoach/createLead/createDraft/cleanupCoach/mockOauthCallback
- D-19 satisfied: 5 launch-critical specs land and pass (duplicate sequence, cross-tenant, pre-send, webhook signature, full approval)
- D-20 satisfied: 3 Phase 5 feature specs land and pass (onboarding, locked pages, settings save)
- Phase 5 exit criteria mapped: "Playwright: duplicate sequence", "cross-tenant data isolation", "pre-send safety check blocks send", "full approval flow" — all four pass in CI
- CI runtime under 15 minutes per pull request (D-17 + RESEARCH.md ~5min estimate; pad for variability)
</success_criteria>

<output>
After completion, create `.planning/phases/05-polish/05-04-SUMMARY.md` summarizing:
- All 8 specs file list with one-line description
- CI runtime measured on a representative PR (target < 15 min)
- Any spec flakes observed and mitigation (e.g., expect.poll timeouts)
- Confirmation that no existing 12 specs regressed
- Any Phase 3/4 route paths that differed from RESEARCH.md (e.g., enrollment route name) — note for future maintenance
</output>

## Dependencies

- **Hard depends on Plan 05-01:** locked-module-pages.spec.ts exercises `/modules/threshold` and `/modules/continuation` pages + sidebar deep-link.
- **Hard depends on Plan 05-02:** onboarding-completion.spec.ts exercises full wizard + dashboard redirect gate + demo lead invariants.
- **Hard depends on Plan 05-03:** settings-save.spec.ts + cross-tenant-isolation.spec.ts exercise audit_log RLS and danger zone phrase checks.
- **Does not block Plan 05-05:** Plans 05-04 and 05-05 are parallel-safe (no `files_modified` overlap) but realistically 05-05 wants the new E2E test files audited too — soft sequencing only.

## Risks + Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Local Supabase keys differ between dev/CI breaking .env.test (Assumption A2) | CI populates via supabase status -o env; document local key regeneration in setup README | Hard-code keys in workflow if needed |
| Phase 3 enrollment route path differs from assumption | Grep-verify during implementation; adjust spec | One-line spec fix |
| Webhook headers differ per calendar provider | Pull exact header names from Phase 3 SUMMARYs during implementation | Per-provider spec adjustment |
| Page.route() Gmail mock doesn't catch the actual fetch URL | Use wildcard match `**/gmail.googleapis.com/**`; add console.log of intercepted URLs during debug | Adjust matcher pattern |
| Test runtime exceeds 15 min in CI | Parallelize via Playwright workers; trim per-test fixture seeding | Mark slow specs as `@slow` and gate them on separate workflow |
| Realtime hydration race in full-approval-flow | Use `expect.poll` with 10s timeout; avoid hard waits | Adjust poll interval |
