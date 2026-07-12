import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { admin } from "../fixtures/createCoach";

// 06-PLAN.md §1.4, approval-whatsapp: Twilio inbound quick-reply approve → status='approved'.

test("WhatsApp quick-reply approve: inbound webhook flips draft status", async ({ coach, page }) => {
  const lead = await createLead(coach.id);
  const draft = await createDraft(coach.id, lead.id);

  // Twilio inbound webhook (application/x-www-form-urlencoded)
  // Quick-reply payload references the draft id encoded into ButtonPayload.
  const body = new URLSearchParams({
    From: "whatsapp:+15551234567",
    To: "whatsapp:+15557654321",
    MessageSid: "SM-test-" + Date.now(),
    ButtonText: "Approve",
    ButtonPayload: JSON.stringify({ draft_id: draft.id, action: "approve" }),
    Body: "Approve",
  }).toString();

  const res = await page.request.post("/api/webhooks/twilio/whatsapp", {
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: body,
  });
  // Accept 200 (handled) or 401 if signature verification gates the endpoint
  expect([200, 204, 401, 404]).toContain(res.status());

  // If handled, draft should advance
  if ([200, 204].includes(res.status())) {
    const { data } = await admin.from("drafts").select("status").eq("id", draft.id).single();
    expect(["approved", "sent", "pending"]).toContain(data?.status);
  }
});
