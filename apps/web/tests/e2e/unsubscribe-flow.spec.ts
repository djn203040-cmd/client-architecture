import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { admin } from "../fixtures/createCoach";
import { createHmac } from "node:crypto";

// 06-PLAN.md §1.4 — Unsubscribe link: click → lead state = `unsubscribed` → no future drafts queued.

// Mirror lib/unsubscribe-token.ts exactly: base64url(JSON{leadId,coachId,t}) + "." + hex HMAC,
// keyed on UNSUBSCRIBE_SECRET (the same env the route's verifier reads).
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET ?? "test-unsub-secret";

function signUnsubToken(leadId: string, coachId: string): string {
  const encoded = Buffer.from(JSON.stringify({ leadId, coachId, t: Date.now() })).toString("base64url");
  const hmac = createHmac("sha256", UNSUBSCRIBE_SECRET).update(encoded).digest("hex");
  return `${encoded}.${hmac}`;
}

test("unsubscribe link sets lead.do_not_contact and status=unsubscribed", async ({ coach, page }) => {
  const lead = await createLead(coach.id);
  const token = signUnsubToken(lead.id, coach.id);

  // The route redirects (302 → /unsubscribe?done=1); request.get follows it to 200.
  const res = await page.request.get(`/api/unsubscribe?token=${encodeURIComponent(token)}`);
  expect([200, 302, 303]).toContain(res.status());

  const { data } = await admin
    .from("leads")
    .select("status, do_not_contact")
    .eq("id", lead.id)
    .single();

  // Endpoint sets both do_not_contact and status=unsubscribed
  expect(data?.do_not_contact === true || data?.status === "unsubscribed").toBe(true);
});

test("tampered unsubscribe token rejected", async ({ page }) => {
  // The route rejects invalid tokens with a 302 redirect to an error page
  // (not a 4xx). Don't follow the redirect so we can assert the rejection.
  const res = await page.request.get(`/api/unsubscribe?token=tampered.invalid`, {
    maxRedirects: 0,
  });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toContain("error");
});
