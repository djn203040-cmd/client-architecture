import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createSequence } from "../fixtures/createSequence";
import { createDraft } from "../fixtures/createDraft";
import { mockOauthCallback } from "../fixtures/mockOauthCallback";
import { admin } from "../fixtures/createCoach";

test("full approval flow: pending → approved via dashboard", async ({ coach, page }) => {
  await mockOauthCallback("gmail", coach.id);
  const lead = await createLead(coach.id);
  const seq = await createSequence(coach.id, lead.id);
  const draft = await createDraft(coach.id, lead.id, { sequenceId: seq.id });

  await page.context().addCookies(coach.cookies);

  // Mock Gmail send — intercept before approval so any dispatched Inngest
  // event can't reach the real Gmail API
  await page.route("**/gmail.googleapis.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "mock-message-id" }),
    }),
  );

  // Approve via API (approve button triggers this route)
  const approveRes = await page.request.patch(`/api/drafts/${draft.id}`, {
    data: { status: "approved" },
  });
  expect(approveRes.status()).toBe(200);
  const body = await approveRes.json();
  expect(body.ok).toBe(true);
  expect(body.new_status).toBe("approved");

  // Verify DB reflects approved status (approveDraftAtomic is synchronous)
  const { data: updated } = await admin
    .from("drafts")
    .select("status")
    .eq("id", draft.id)
    .single();
  expect(updated?.status).toBe("approved");
});

test("approval rejected for already-approved draft (idempotency guard)", async ({ coach, page }) => {
  const lead = await createLead(coach.id);
  const seq = await createSequence(coach.id, lead.id);
  const draft = await createDraft(coach.id, lead.id, { sequenceId: seq.id, status: "approved" });

  await page.context().addCookies(coach.cookies);

  const res = await page.request.patch(`/api/drafts/${draft.id}`, {
    data: { status: "approved" },
  });
  expect(res.status()).toBe(409);
});
