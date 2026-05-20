import { describe, it, beforeAll } from "vitest";

// Targets (created by plan 04-03):
//   generateReviewToken, verifyReviewToken from "@/lib/review-token"
// RED state: each test throws "not implemented" until 04-03 lands.

beforeAll(() => {
  process.env["JWT_REVIEW_SECRET"] ??= "test-secret";
});

describe("review-token (Phase 4 / NOTIFY-002 + Pitfall-6)", () => {
  it("generates a token with embedded payload", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("verifies a valid token and returns payload", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("rejects expired token (exp < now)", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("rejects tampered payload (HMAC mismatch)", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("rejects malformed token (missing separator)", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });
});
