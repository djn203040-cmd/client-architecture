import { test, expect } from "../fixtures";
import { admin } from "../fixtures/createCoach";
import { createLead } from "../fixtures/createLead";
import { createSequence } from "../fixtures/createSequence";
import { createDraft } from "../fixtures/createDraft";

// E2E target: dashboard queue keyboard approval — a focused DraftCard, the 'A'
// shortcut → PATCH /api/drafts/:id → status 'approved' in the DB.
//
// Rewritten for #126: the old version seeded a coach row without an auth user
// (violating coaches_id_fkey) and never logged in. It now runs on the shared
// auth-cookie fixtures, so it passes locally AND in CI.

async function completeOnboarding(coachId: string) {
  await admin
    .from("coaches")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", coachId);
}

test("Approve via 'A' shortcut on focused draft card transitions draft to approved", async ({ coach, page }) => {
  await completeOnboarding(coach.id);
  const lead = await createLead(coach.id, { name: "Approve Test Lead" });
  // The dashboard queue shows sequence drafts only (#41), standalone drafts
  // surface on the lead profile instead.
  const sequence = await createSequence(coach.id, lead.id);
  const draft = await createDraft(coach.id, lead.id, { sequenceId: sequence.id });

  await page.context().addCookies(coach.cookies);
  // The product tour's spotlight overlay swallows clicks; mark it seen.
  await page.addInitScript(() => {
    window.localStorage.setItem("tca_tour_v1_seen", "1");
  });
  await page.goto("/drafts");

  const card = page.getByRole("article").filter({ hasText: "Approve Test Lead" });
  await expect(card).toBeVisible({ timeout: 10_000 });

  // DraftCard's keydown handler lives on the card element, focus it first.
  await card.focus();
  await page.keyboard.press("a");

  await expect
    .poll(
      async () => {
        const { data } = await admin.from("drafts").select("status").eq("id", draft.id).single();
        return data?.status;
      },
      { timeout: 10_000, intervals: [500] },
    )
    .toBe("approved");
});
