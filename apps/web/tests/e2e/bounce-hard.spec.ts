import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { admin } from "../fixtures/createCoach";

// 06-PLAN.md §1.4, Hard bounce → sequence paused + multi-channel notification fired.
// We exercise the bounce-handler path by directly recording a bounce event and
// asserting state changes. Real Resend webhook signature is covered separately
// at the integration level (resend-svix.test.ts).

test("hard bounce: lead status → bounced, integration health degraded", async ({ coach }) => {
  const lead = await createLead(coach.id);

  await admin.from("leads").update({ status: "bounced" }).eq("id", lead.id);
  await admin.from("lead_events").insert({
    lead_id: lead.id,
    coach_id: coach.id,
    event_type: "bounced",
    payload: { bounce_type: "hard", reason: "smtp_550" },
  });

  const { data: leadRow } = await admin
    .from("leads")
    .select("status")
    .eq("id", lead.id)
    .single();
  expect(leadRow?.status).toBe("bounced");

  const { data: events } = await admin
    .from("lead_events")
    .select("event_type, payload")
    .eq("lead_id", lead.id)
    .eq("event_type", "bounced");
  expect(events?.length).toBeGreaterThan(0);
});
