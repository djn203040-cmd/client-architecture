import { describe, it, beforeEach } from "vitest";
import { resetInngestQueue } from "@/tests/utils/inngest-runner";

beforeEach(() => {
  resetInngestQueue();
});

describe("draft-hold-cascade (Phase 4 / DRAFT-008)", () => {
  it("schedules a second sleepUntil for the +48h hold step", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("transitions draft.status to 'held' after the second window expires", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("does NOT cascade into HOLD when the draft is already approved", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });
});
