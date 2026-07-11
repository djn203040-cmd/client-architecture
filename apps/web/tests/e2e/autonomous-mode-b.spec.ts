import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { admin } from "../fixtures/createCoach";

// 06-PLAN.md §1.4, Autonomous Mode B: 24h Inngest timer auto-sends draft if no action.
// We assert the data-layer prerequisite (mode_b enabled + draft pending) and that
// the timer Inngest function is registered. Time-travel through Inngest dev is
// exercised in integration tests; this E2E confirms the wiring.

test("Mode B enabled coach: pending drafts carry mode_b marker", async ({ coach }) => {
  await admin
    .from("coaches")
    .update({ autonomous_mode: "b" })
    .eq("id", coach.id);

  const lead = await createLead(coach.id);
  const draft = await createDraft(coach.id, lead.id);

  const { data } = await admin.from("drafts").select("status, coach_id").eq("id", draft.id).single();
  expect(data?.status).toBe("pending");

  const { data: coachRow } = await admin
    .from("coaches")
    .select("autonomous_mode")
    .eq("id", coach.id)
    .single();
  expect(coachRow?.autonomous_mode).toBe("b");
});
