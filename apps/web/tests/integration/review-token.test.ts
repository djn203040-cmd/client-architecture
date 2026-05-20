import { describe, it } from "vitest";

describe("review-token (Phase 4 / Pitfall-6)", () => {
  it("read-only does not consume nonce — token remains valid after N views", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("approve action consumes nonce — second use is rejected", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("expired token returns 410 Gone", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });
});
