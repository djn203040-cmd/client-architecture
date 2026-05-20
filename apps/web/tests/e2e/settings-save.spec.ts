import { test, expect } from "../fixtures";
import { mockOauthCallback } from "../fixtures/mockOauthCallback";
import { admin } from "../fixtures/createCoach";

async function withOnboardingComplete(coachId: string) {
  await admin
    .from("coaches")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", coachId);
}

test("profile timezone PATCH persists to DB", async ({ coach, page }) => {
  await withOnboardingComplete(coach.id);
  await page.context().addCookies(coach.cookies);

  const res = await page.request.patch(`/api/settings/profile`, {
    data: { timezone: "Europe/Copenhagen" },
  });
  expect(res.status()).toBe(200);

  const { data } = await admin
    .from("coaches")
    .select("timezone")
    .eq("id", coach.id)
    .single();
  expect(data?.timezone).toBe("Europe/Copenhagen");
});

test("notifications matrix toggle persists to DB", async ({ coach, page }) => {
  await withOnboardingComplete(coach.id);
  await page.context().addCookies(coach.cookies);

  const res = await page.request.patch(`/api/settings/notifications`, {
    data: { event_type: "draft_ready", channel: "email", enabled: true },
  });
  expect(res.status()).toBe(200);

  const { data } = await admin
    .from("notification_preferences")
    .select("enabled")
    .eq("coach_id", coach.id)
    .eq("event_type", "draft_ready")
    .eq("channel", "email")
    .maybeSingle();
  expect(data?.enabled).toBe(true);
});

test("dashboard channel cannot be disabled", async ({ coach, page }) => {
  await withOnboardingComplete(coach.id);
  await page.context().addCookies(coach.cookies);

  const res = await page.request.patch(`/api/settings/notifications`, {
    data: { event_type: "draft_ready", channel: "dashboard", enabled: false },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.reason).toBe("dashboard_always_on");
});

test("danger zone disconnect-gmail rejects wrong confirm phrase", async ({ coach, page }) => {
  await mockOauthCallback("gmail", coach.id);
  await withOnboardingComplete(coach.id);
  await page.context().addCookies(coach.cookies);

  // Wrong case — should be rejected
  const badRes = await page.request.post(`/api/settings/danger/disconnect-gmail`, {
    data: { confirmPhrase: "Disconnect Gmail" },
  });
  expect(badRes.status()).toBe(400);
});

test("danger zone disconnect-gmail succeeds with correct phrase and creates audit log", async ({ coach, page }) => {
  await mockOauthCallback("gmail", coach.id);
  await withOnboardingComplete(coach.id);
  await page.context().addCookies(coach.cookies);

  const res = await page.request.post(`/api/settings/danger/disconnect-gmail`, {
    data: { confirmPhrase: "disconnect gmail" },
  });
  expect(res.status()).toBe(200);

  // Integration should be disconnected
  const { data: integ } = await admin
    .from("integrations")
    .select("status")
    .eq("coach_id", coach.id)
    .eq("provider", "gmail")
    .single();
  expect(integ?.status).toBe("disconnected");

  // Audit log row created
  const { data: audit } = await admin
    .from("audit_log")
    .select("action")
    .eq("coach_id", coach.id)
    .eq("action", "gmail_disconnected")
    .maybeSingle();
  expect(audit).not.toBeNull();
});
