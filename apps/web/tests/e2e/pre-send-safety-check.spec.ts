import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createSequence } from "../fixtures/createSequence";
import { createDraft } from "../fixtures/createDraft";

// runPreSendSafetyCheck is called by PATCH /api/drafts/[id] when approving.
// It blocks sends to leads in terminal states or with DNC/bounced flags.

const TERMINAL_STATUS_CASES = [
  "do_not_contact",
  "unsubscribed",
  "converted",
  "closed",
] as const;

for (const status of TERMINAL_STATUS_CASES) {
  test(`approve blocked when lead status is ${status}`, async ({ coach, page }) => {
    const lead = await createLead(coach.id, { status });
    const seq = await createSequence(coach.id, lead.id);
    const draft = await createDraft(coach.id, lead.id, { sequenceId: seq.id });
    await page.context().addCookies(coach.cookies);

    const res = await page.request.patch(`/api/drafts/${draft.id}`, {
      data: { status: "approved" },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.reason).toBeTruthy();
  });
}

test("approve blocked when lead has do_not_contact=true (status not terminal)", async ({ coach, page }) => {
  const lead = await createLead(coach.id, { status: "call_completed", do_not_contact: true });
  const seq = await createSequence(coach.id, lead.id);
  const draft = await createDraft(coach.id, lead.id, { sequenceId: seq.id });
  await page.context().addCookies(coach.cookies);

  const res = await page.request.patch(`/api/drafts/${draft.id}`, {
    data: { status: "approved" },
  });
  expect(res.status()).toBe(409);
});

test("approve blocked when lead is bounced", async ({ coach, page }) => {
  const lead = await createLead(coach.id, { status: "call_completed", bounced: true });
  const seq = await createSequence(coach.id, lead.id);
  const draft = await createDraft(coach.id, lead.id, { sequenceId: seq.id });
  await page.context().addCookies(coach.cookies);

  const res = await page.request.patch(`/api/drafts/${draft.id}`, {
    data: { status: "approved" },
  });
  expect(res.status()).toBe(409);
});
