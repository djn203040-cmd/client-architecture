import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { mockOauthCallback } from "../fixtures/mockOauthCallback";
import { admin } from "../fixtures/createCoach";

// 06-PLAN.md §1.4, Full happy path: invite coach → connect Gmail → add lead → AI draft → approve → sent.
// Each previous spec covers a stage in isolation; this consolidates the journey.

test("full happy path: invited coach completes draft approval end-to-end", async ({ coach, page }) => {
  // Stage 1: Gmail connect (simulated OAuth)
  await mockOauthCallback("gmail", coach.id);

  const { data: integration } = await admin
    .from("integrations")
    .select("status")
    .eq("coach_id", coach.id)
    .eq("provider", "gmail")
    .single();
  expect(integration?.status).toBe("connected");

  // Stage 2: Add lead
  const lead = await createLead(coach.id);
  expect(lead.id).toBeTruthy();

  // Stage 3: AI draft surfaces in queue
  const draft = await createDraft(coach.id, lead.id);
  expect(draft.status).toBe("pending");

  // Stage 4: Approve via dashboard PATCH route
  await page.context().addCookies(coach.cookies);
  await page.route("**/gmail.googleapis.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "mock-message-id" }),
    }),
  );

  const approveRes = await page.request.patch(`/api/drafts/${draft.id}`, {
    data: { status: "approved" },
  });
  expect(approveRes.status()).toBe(200);

  // Stage 5: DB reflects the new status
  const { data: updated } = await admin
    .from("drafts")
    .select("status")
    .eq("id", draft.id)
    .single();
  expect(["approved", "sent"]).toContain(updated?.status);
});
