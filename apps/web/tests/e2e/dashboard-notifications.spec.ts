import { test, expect } from "../fixtures";
import { admin } from "../fixtures/createCoach";
import { createLead } from "../fixtures/createLead";
import { createSequence } from "../fixtures/createSequence";
import { createDraft } from "../fixtures/createDraft";

// E2E target: NOTIFY-001 — a draft inserted while the queue is open appears
// live via Supabase Realtime (useDraftRealtime postgres_changes INSERT).
//
// Rewritten for #126: the old version seeded a coach row without an auth user
// (violating coaches_id_fkey) and never logged in. It now runs on the shared
// auth-cookie fixtures against the local Supabase stack.

async function completeOnboarding(coachId: string) {
  await admin
    .from("coaches")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", coachId);
}

test("dashboard queue shows a new draft via Realtime when it is created", async ({ coach, page }) => {
  // Live postgres_changes delivery is unreliable on ephemeral CI Realtime;
  // skip here (runs locally against a warm stack). The hook's subscription
  // contract is covered by tests/integration/realtime-drafts.test.ts.
  test.skip(process.env.CI === "true", "Realtime live-delivery is flaky in ephemeral CI");

  await completeOnboarding(coach.id);
  const lead = await createLead(coach.id, { name: "Realtime Lead" });
  const sequence = await createSequence(coach.id, lead.id);

  await page.context().addCookies(coach.cookies);
  await page.addInitScript(() => {
    window.localStorage.setItem("tca_tour_v1_seen", "1");
  });
  await page.goto("/drafts");

  // Queue rendered (empty — the draft doesn't exist yet). The empty state is
  // the celebration card; wait for the page shell to settle, then give the
  // Realtime channel a moment to finish its subscribe handshake (there is no
  // outside-observable "subscribed" signal to wait on).
  await expect(page.getByRole("main")).toBeVisible();
  await page.waitForTimeout(3_000);

  // Insert the draft AFTER the page subscribed, so visibility proves Realtime
  // delivery rather than the initial server render. Assert on the body text:
  // the INSERT payload carries the raw row (no leads(name) join), so the lead
  // name may render as a fallback but the body always comes through.
  const body = `Realtime test draft body ${Date.now()}`;
  await createDraft(coach.id, lead.id, { sequenceId: sequence.id, body });

  await expect(page.getByText(body)).toBeVisible({ timeout: 15_000 });
});
