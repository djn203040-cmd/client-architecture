import { describe, it } from "vitest";

// Target (created by plan 04-05): buildSmsBody from "@/lib/notifications/channels/sms"
// RED state: each test throws "not implemented" until 04-05 lands.

describe("sms-body (Phase 4 / NOTIFY-005 + Pitfall-5)", () => {
  it("builds initial SMS body under 160 chars for typical lead name", () => {
    throw new Error("not implemented — see plan 04-05-PLAN.md");
  });

  it("builds follow-up SMS body under 160 chars", () => {
    throw new Error("not implemented — see plan 04-05-PLAN.md");
  });

  it("long lead name", () => {
    // Inputs the eventual test will use:
    //   lead_name = "x".repeat(50)
    //   short_link = "https://app.sonorous.com/r/" + "a".repeat(22)
    // Asserts: lead-name truncated to ≤ 30 chars, total body ≤ 160.
    throw new Error("not implemented — see plan 04-05-PLAN.md");
  });

  it("builds hard-bounce SMS body", () => {
    throw new Error("not implemented — see plan 04-05-PLAN.md");
  });
});
