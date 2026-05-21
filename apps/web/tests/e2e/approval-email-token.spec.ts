import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { admin } from "../fixtures/createCoach";
import crypto from "node:crypto";

// 06-PLAN.md §1.4 — approval-email-token: load review page → approve → status updates;
// second click → "already used" (single-use nonce).

test("approval from review token: first use approves, second use rejected", async ({ coach, page }) => {
  const lead = await createLead(coach.id);
  const draft = await createDraft(coach.id, lead.id);

  // Issue a review token bound to the draft + coach
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  await admin.from("review_tokens").insert({
    token,
    draft_id: draft.id,
    coach_id: coach.id,
    expires_at: expiresAt,
  });

  // First approve via tokenized PATCH
  const first = await page.request.patch(`/api/review/${token}`, {
    data: { action: "approve" },
  });
  expect([200, 204]).toContain(first.status());

  // Second use must be rejected (410 Gone or 409 conflict)
  const second = await page.request.patch(`/api/review/${token}`, {
    data: { action: "approve" },
  });
  expect([410, 409, 401, 404]).toContain(second.status());
});
