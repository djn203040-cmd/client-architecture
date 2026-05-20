import { describe, it, expect } from "vitest";
import { buildSmsBody, MAX_SMS_LENGTH } from "@/lib/notifications/channels/sms-body";

describe("sms-body (Phase 4 / NOTIFY-005 + Pitfall-5)", () => {
  it("builds initial SMS body under 160 chars for typical lead name", () => {
    const result = buildSmsBody({
      variant: "initial",
      leadName: "Jane Smith",
      shortLink: "https://app.sonorous.com/r/abcdef1234567890abcdef",
    });
    expect(result.length).toBeLessThanOrEqual(MAX_SMS_LENGTH);
    expect(result).toContain("Draft for Jane Smith ready.");
  });

  it("builds follow-up SMS body under 160 chars", () => {
    const result = buildSmsBody({
      variant: "followup",
      leadName: "Jane Smith",
      shortLink: "https://app.sonorous.com/r/abcdef1234567890abcdef",
    });
    expect(result.length).toBeLessThanOrEqual(MAX_SMS_LENGTH);
    expect(result).toContain("Reminder, draft for");
  });

  it("long lead name", () => {
    const result = buildSmsBody({
      variant: "initial",
      leadName: "x".repeat(50),
      shortLink: "https://app.sonorous.com/r/" + "a".repeat(22),
    });
    expect(result.length).toBeLessThanOrEqual(MAX_SMS_LENGTH);
    // Lead name must be truncated — the "x" run should be ≤ 29 chars + ellipsis
    const leadPart = result.replace("Sonorous: Draft for ", "").split(" ready.")[0] ?? "";
    expect(leadPart.length).toBeLessThanOrEqual(30);
  });

  it("builds hard-bounce SMS body", () => {
    const result = buildSmsBody({
      variant: "bounce",
      leadEmail: "jane@example.com",
    });
    expect(result).toBe(
      "Sonorous: Email to jane@example.com bounced. Check integrations.",
    );
  });
});
