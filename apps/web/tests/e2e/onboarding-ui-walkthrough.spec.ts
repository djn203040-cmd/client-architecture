import { test, expect } from "../fixtures";
import { mockOauthCallback } from "../fixtures/mockOauthCallback";
import { admin } from "../fixtures/createCoach";

// Browser-level walk of the simplified onboarding wizard: every step is
// clickable by a non-technical coach, the OAuth failure path recovers with a
// friendly retry, and Back navigation between completed steps works.

const FAKE_VOICE_MODEL = {
  tone_adjectives: ["warm", "direct", "curious"],
  formality_level: "conversational",
  sentence_length: "medium",
  emoji_usage: "none",
  opener_phrases: ["Hey there,", "Hope you're well,"],
  closer_phrases: ["Looking forward,", "Best,"],
  never_say_list: ["synergy"],
  selected_examples: Array.from({ length: 8 }, (_, i) => `Example message ${i + 1} from this coach.`),
};

test("wizard UI walkthrough: friendly errors, simplified steps, back button", async ({ coach, page }) => {
  test.setTimeout(90_000);
  await page.context().addCookies(coach.cookies);
  // Keep the dashboard tour from swallowing the final assertion's clicks.
  await page.addInitScript(() => localStorage.setItem("tca_tour_v1_seen", "1"));

  // --- Step 1: language -----------------------------------------------------
  await page.goto("/onboarding/language");
  await expect(page.getByText("Step 1 of 8")).toBeVisible();
  await page.getByRole("button", { name: /English/ }).click();
  await expect(page).toHaveURL(/\/onboarding\/gmail/);

  // --- Step 2: gmail --------------------------------------------------------
  // Pre-flight warning about Google's unverified-app screen is always shown.
  await expect(page.getByText("Before you click:")).toBeVisible();
  // Help escape hatch is on every step.
  await expect(page.getByRole("link", { name: "Message Daniel" })).toBeVisible();

  // OAuth denial path: callback bounces back here with ?error=…; the step must
  // show a friendly recovery state, not a silent dead-end.
  await page.goto("/onboarding/gmail?error=oauth_access_denied");
  await expect(page.getByText("You said no on Google's screen — no problem.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();

  // Successful connect: mock the integration row; the 2s poll flips the UI.
  await mockOauthCallback("gmail", coach.id);
  await page.goto("/onboarding/gmail");
  await expect(page.getByText("Gmail connected")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/onboarding\/booking/);

  // --- Back button: revisit a completed step and come forward again ---------
  await page.getByRole("link", { name: /Back/ }).click();
  await expect(page).toHaveURL(/\/onboarding\/gmail/);
  await expect(page.getByText("Gmail connected")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/onboarding\/booking/);

  // --- Step 3: booking (skippable) ------------------------------------------
  await page.getByRole("button", { name: "I'll add this later" }).click();
  await expect(page).toHaveURL(/\/onboarding\/calendar/);

  // --- Step 4: calendar — only the two supported tools, plain skip note -----
  await expect(page.getByText("Calendly")).toBeVisible();
  await expect(page.getByText("Cal.com")).toBeVisible();
  await expect(page.getByText("Acuity")).toHaveCount(0);
  await expect(page.getByText("Square")).toHaveCount(0);
  await expect(page.getByText(/Using a different tool/)).toBeVisible();
  await page.getByRole("button", { name: "I'll do this later" }).click();
  await expect(page).toHaveURL(/\/onboarding\/sales/);

  // --- Step 5: sales — style picker up front, details collapsed -------------
  await expect(page.getByText("How do you sell?")).toBeVisible();
  await expect(page.getByText("Your programs & pricing")).toHaveCount(0);
  await page.getByRole("button", { name: /Add your programs & offers/ }).click();
  await expect(page.getByText("Your programs & pricing")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/voice/);

  // --- Step 6: voice — one-click import leads, extra context is optional ----
  await expect(page.getByRole("button", { name: "Use my sent emails" })).toBeVisible();
  await expect(page.getByText("Give the voice more context")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  // The real import + Anthropic analysis is exercised elsewhere; seed the
  // resulting profile and confirm the gate opens.
  await admin.from("coaches").update({ voice_model: FAKE_VOICE_MODEL }).eq("id", coach.id);
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/first-lead/);

  // --- Step 7: first lead — approve the demo draft ---------------------------
  // Seed the demo draft directly (bypasses the Anthropic call) and serve it
  // through a mocked seed-demo response so the real approve flow still runs.
  const { data: demoLead } = await admin
    .from("leads")
    .insert({
      coach_id: coach.id,
      name: "Demo Lead, Alex Rivera",
      email: `demo+${coach.id}@sonorous.test`,
      source: "manual",
      status: "call_completed",
      external_ids: { demo: true },
    })
    .select("id")
    .single();
  const { data: demoDraft } = await admin
    .from("drafts")
    .insert({
      coach_id: coach.id,
      lead_id: demoLead!.id,
      body: "Test draft, standing in for AI-generated content.",
      subject: "Following up",
      status: "pending",
      generation_context: { demo: true },
      touchpoint_index: 1,
    })
    .select("id")
    .single();
  await page.route("**/api/onboarding/seed-demo", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        leadId: demoLead!.id,
        draftId: demoDraft!.id,
        draftBody: "Test draft, standing in for AI-generated content.",
      }),
    }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Approve this draft" }).click();
  await expect(page.getByText(/exactly how it works with real leads/)).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/notifications/);

  // --- Step 8: notifications — email pre-selected, one click to finish ------
  await expect(page.getByRole("switch", { name: "Email" })).toBeChecked();
  await expect(page.getByText("Always on")).toBeVisible();
  // The pre-selection persists via background PATCHes; wait for the rows so
  // the Finish gate (≥1 non-dashboard channel) is deterministically satisfied.
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("notification_preferences")
          .select("event_type")
          .eq("coach_id", coach.id)
          .eq("channel", "email")
          .eq("enabled", true);
        return data?.length ?? 0;
      },
      { timeout: 10_000 },
    )
    .toBe(5);
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Wizard is done: onboarding_completed_at is set.
  const { data: coachRow } = await admin
    .from("coaches")
    .select("onboarding_completed_at")
    .eq("id", coach.id)
    .single();
  expect(coachRow?.onboarding_completed_at).not.toBeNull();
});
