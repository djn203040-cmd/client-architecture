import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { admin } from "../fixtures/createCoach";
import { createHmac } from "node:crypto";

// 06-PLAN.md §1.4, approval-email-token: load review page → approve → status updates;
// second click → "already used" (single-use nonce rotates in consume_review_token).

// Mirror lib/review-token.ts: base64url(JSON{draftId,coachId,nonce,exp}) + "." + hex HMAC,
// keyed on JWT_REVIEW_SECRET (the same env the route's verifier reads). The nonce
// must equal the draft's review_token_nonce (the route consumes + rotates it).
const JWT_REVIEW_SECRET = process.env.JWT_REVIEW_SECRET ?? "test-review-secret";

function generateReviewToken(draftId: string, coachId: string, nonce: string): string {
  const encoded = Buffer.from(
    JSON.stringify({ draftId, coachId, nonce, exp: Date.now() + 24 * 3600 * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", JWT_REVIEW_SECRET).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

test("approval from review token: first use approves, second use rejected", async ({ coach, page }) => {
  const lead = await createLead(coach.id);
  const draft = await createDraft(coach.id, lead.id);

  // Read the draft's auto-generated single-use nonce and sign a token with it.
  const { data: row } = await admin
    .from("drafts")
    .select("review_token_nonce")
    .eq("id", draft.id)
    .single();
  const nonce = (row as { review_token_nonce: string }).review_token_nonce;
  const token = generateReviewToken(draft.id, coach.id, nonce);

  // First approve via tokenized PATCH
  const first = await page.request.patch(`/api/review/${token}`, {
    data: { status: "approved" },
  });
  expect([200, 204]).toContain(first.status());

  // Second use must be rejected, the nonce rotated on first consume (410 Gone).
  const second = await page.request.patch(`/api/review/${token}`, {
    data: { status: "approved" },
  });
  expect([410, 409, 401, 404]).toContain(second.status());
});
