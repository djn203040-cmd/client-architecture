import { describe, it } from "vitest";

describe("approve-atomic (Phase 4 / DRAFT-011)", () => {
  it("calls the approve_draft_atomic RPC on the happy path", () => {
    throw new Error("not implemented — see plan 04-01-PLAN.md");
  });

  it("concurrent attempts result in exactly one success and one 409", () => {
    throw new Error("not implemented — see plan 04-01-PLAN.md");
  });

  it("returns not_pending when the draft is already approved/sent/held", () => {
    throw new Error("not implemented — see plan 04-01-PLAN.md");
  });
});
