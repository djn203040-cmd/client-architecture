import { describe, it, beforeAll } from "vitest";

// Target (created by plan 04-04): verifySlackSignature from "@/lib/slack/signature"
// RED state: each test throws "not implemented" until 04-04 lands.

beforeAll(() => {
  process.env["SLACK_SIGNING_SECRET"] ??= "test-secret";
});

describe("slack-signature (Phase 4 / Pitfall-2)", () => {
  it("verifies a valid v0 signature with current timestamp", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });

  it("rejects timestamp older than 5 minutes (replay window)", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });

  it("rejects modified body (timing-safe mismatch)", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });

  it("rejects mismatched signing secret", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });
});
