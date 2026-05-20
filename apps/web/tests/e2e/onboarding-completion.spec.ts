import { test, expect } from "../fixtures";
import { mockOauthCallback } from "../fixtures/mockOauthCallback";
import { admin } from "../fixtures/createCoach";

// Seed a minimal but valid TVoiceProfile with 8 selected_examples
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

test("full onboarding wizard golden path — all steps complete", async ({ coach, page }) => {
  await page.context().addCookies(coach.cookies);

  // Step 1: gmail — mock the OAuth row, then complete step
  await mockOauthCallback("gmail", coach.id);
  const gmailRes = await page.request.patch(`/api/onboarding/complete-step`, {
    data: { step: "gmail" },
  });
  expect(gmailRes.status()).toBe(200);

  // Step 2: voice — seed 8 examples via admin, then complete step
  await admin.from("coaches").update({ voice_model: FAKE_VOICE_MODEL }).eq("id", coach.id);
  const voiceRes = await page.request.patch(`/api/onboarding/complete-step`, {
    data: { step: "voice" },
  });
  expect(voiceRes.status()).toBe(200);

  // Step 3: first-lead — seed demo lead+draft via admin (bypasses Anthropic call),
  // then demo-approve via API (plain DB update, no external calls)
  const { data: demoLead } = await admin
    .from("leads")
    .insert({
      coach_id: coach.id,
      name: "Demo Lead — Alex Rivera",
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
      body: "Test draft — standing in for AI-generated content.",
      subject: "Following up",
      status: "pending",
      generation_context: { demo: true },
      touchpoint_index: 1,
    })
    .select("id")
    .single();

  const approveRes = await page.request.post(`/api/onboarding/demo-approve`, {
    data: { draftId: demoDraft!.id },
  });
  expect(approveRes.status()).toBe(200);

  const firstLeadRes = await page.request.patch(`/api/onboarding/complete-step`, {
    data: { step: "first-lead" },
  });
  expect(firstLeadRes.status()).toBe(200);

  // Step 4: notifications — acknowledge dashboard-only, then complete step
  await admin
    .from("coaches")
    .update({ notification_settings: { dashboard_only_acknowledged: true } })
    .eq("id", coach.id);
  const notifRes = await page.request.patch(`/api/onboarding/complete-step`, {
    data: { step: "notifications" },
  });
  expect(notifRes.status()).toBe(200);
  const { nextStep, completed } = await notifRes.json();
  expect(completed).toBe(true);
  expect(nextStep).toBeNull();

  // Verify onboarding_completed_at is set
  const { data: coachRow } = await admin
    .from("coaches")
    .select("onboarding_completed_at")
    .eq("id", coach.id)
    .single();
  expect(coachRow?.onboarding_completed_at).not.toBeNull();
});

test("dashboard visit with onboarding complete shows no setup banner", async ({ coach, page }) => {
  // Mark onboarding complete
  await admin
    .from("coaches")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", coach.id);
  await page.context().addCookies(coach.cookies);

  await page.goto("/dashboard");
  // Should be on dashboard, not redirected to /onboarding
  expect(page.url()).not.toContain("/onboarding");
  await expect(page.locator("text=Finish setup")).toHaveCount(0);
});

test("dashboard visit without onboarding complete redirects to /onboarding (no loop)", async ({ coach, page }) => {
  // coach fixture creates with onboarding_completed_at = NULL by default
  await page.context().addCookies(coach.cookies);

  const redirects: number[] = [];
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 300 && status < 400) redirects.push(status);
  });

  await page.goto("/dashboard");
  expect(page.url()).toContain("/onboarding");
  // At most one redirect — no redirect loop
  expect(redirects.length).toBeLessThanOrEqual(2);
});
