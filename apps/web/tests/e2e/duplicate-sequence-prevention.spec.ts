import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createSequence } from "../fixtures/createSequence";
import { admin } from "../fixtures/createCoach";

test("only one active sequence allowed per coach+lead+track (DB invariant)", async ({ coach }) => {
  const lead = await createLead(coach.id, { status: "no_show" });

  // First active sequence, should succeed
  const seq1 = await createSequence(coach.id, lead.id, { track: "no_show", status: "active" });
  expect(seq1.id).toBeTruthy();

  // Second active sequence for same (coach, lead, track), must fail due to unique partial index
  const { error } = await admin
    .from("sequences")
    .insert({ coach_id: coach.id, lead_id: lead.id, module: 1, track: "no_show", status: "active" });

  expect(error).not.toBeNull();
  // Postgres unique constraint violation: code 23505
  expect(error?.code).toBe("23505");
});

test("different tracks for same lead can coexist", async ({ coach }) => {
  const lead = await createLead(coach.id);

  const s1 = await createSequence(coach.id, lead.id, { track: "no_show" });
  const s2 = await createSequence(coach.id, lead.id, { track: "call_completed" });

  expect(s1.id).toBeTruthy();
  expect(s2.id).toBeTruthy();
});

test("cancelled sequence does not block a new active sequence for same track", async ({ coach }) => {
  const lead = await createLead(coach.id);

  // Simulate what Inngest does: cancel old, create new
  const old = await createSequence(coach.id, lead.id, { track: "no_show", status: "cancelled" });
  expect(old.id).toBeTruthy();

  const current = await createSequence(coach.id, lead.id, { track: "no_show", status: "active" });
  expect(current.id).toBeTruthy();
});
