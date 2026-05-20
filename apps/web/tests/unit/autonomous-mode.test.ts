import { describe, it } from "vitest";

// Targets (created by plan 04-06):
//   createDraftForCoach, setAutonomousMode from "@/lib/autonomous-mode"
// RED state: each test throws "not implemented" until 04-06 lands.

describe("autonomous-mode (Phase 4 / DRAFT-009)", () => {
  it("creates a draft with status='approved' when coach is in Mode A", () => {
    throw new Error("not implemented — see plan 04-06-PLAN.md");
  });

  it("creates a draft with status='pending' when coach is in Mode B", () => {
    throw new Error("not implemented — see plan 04-06-PLAN.md");
  });

  it("creates a draft with status='pending' when coach is in Manual mode", () => {
    throw new Error("not implemented — see plan 04-06-PLAN.md");
  });

  it("requires high-friction phrase confirmation before persisting Mode A", () => {
    // Asserts: API rejects { mode: 'mode_a' } without
    //   confirmation_phrase: 'send without review'
    throw new Error("not implemented — see plan 04-06-PLAN.md");
  });
});
