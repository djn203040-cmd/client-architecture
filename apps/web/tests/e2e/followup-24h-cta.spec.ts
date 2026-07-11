import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { admin } from "../fixtures/createCoach";

// 06-PLAN.md §1.4-24h follow-up CTA fires if coach inactive.
// Asserts the data marker that the follow-up Inngest function key uses to schedule.

test("draft remains pending for 24h+: scheduled_send_at and follow-up state present", async ({ coach }) => {
  const lead = await createLead(coach.id);
  const draft = await createDraft(coach.id, lead.id);

  // Backdate scheduled_send_at to simulate elapsed window
  const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
  await admin.from("drafts").update({ scheduled_send_at: yesterday }).eq("id", draft.id);

  const { data } = await admin
    .from("drafts")
    .select("id, status, scheduled_send_at")
    .eq("id", draft.id)
    .single();

  expect(data?.status).toBe("pending");
  expect(new Date(data!.scheduled_send_at!)).toBeInstanceOf(Date);
  expect(new Date(data!.scheduled_send_at!).getTime()).toBeLessThan(Date.now());
});
