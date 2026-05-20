import { describe, it, beforeEach } from "vitest";
import { resetInngestQueue } from "@/tests/utils/inngest-runner";

beforeEach(() => {
  resetInngestQueue();
});

describe("draft-followup-cta (Phase 4 / DRAFT-007)", () => {
  it("schedules step.sleepUntil for +24h when no approval action taken", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("increments followup_count on the draft when the CTA fires", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("does NOT send a follow-up CTA if the draft was already approved", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });
});
