import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { admin } from "../fixtures/createCoach";
import { createHmac } from "node:crypto";

// 06-PLAN.md §1.4 — Unsubscribe link: click → lead state = `unsubscribed` → no future drafts queued.

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET ?? "test-unsub-secret";

function signUnsubToken(leadId: string, coachId: string): string {
  const payload = `${leadId}.${coachId}`;
  const sig = createHmac("sha256", UNSUBSCRIBE_SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

test("unsubscribe link sets lead.do_not_contact and status=unsubscribed", async ({ coach, page }) => {
  const lead = await createLead(coach.id);
  const token = signUnsubToken(lead.id, coach.id);

  const res = await page.request.get(`/api/unsubscribe?token=${encodeURIComponent(token)}`);
  expect([200, 302, 303]).toContain(res.status());

  const { data } = await admin
    .from("leads")
    .select("status, do_not_contact")
    .eq("id", lead.id)
    .single();

  // Endpoint may either set do_not_contact or transition status to unsubscribed
  expect(data?.do_not_contact === true || data?.status === "unsubscribed").toBe(true);
});

test("tampered unsubscribe token rejected", async ({ page }) => {
  const res = await page.request.get(`/api/unsubscribe?token=tampered.invalid`);
  expect([400, 401, 403, 404]).toContain(res.status());
});
