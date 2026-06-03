import { describe, it, expect } from "vitest";
import { LoginSchema, InviteCoachSchema, SetPasswordSchema } from "@client/shared/validators";
import { CreateLeadSchema, UpdateLeadSchema } from "@client/shared/validators";
import { isTerminalState } from "@client/shared";
import type { TLeadStatus } from "@client/shared/types";

describe("INFRA-005: LoginSchema", () => {
  it("accepts a valid email + 8-char password", () => {
    expect(() => LoginSchema.parse({ email: "coach@example.com", password: "valid123" })).not.toThrow();
  });
  it("rejects malformed email", () => {
    expect(() => LoginSchema.parse({ email: "not-email", password: "valid123" })).toThrow();
  });
  it("rejects passwords shorter than 8 characters", () => {
    expect(() => LoginSchema.parse({ email: "a@b.co", password: "short" })).toThrow();
  });
});

describe("INFRA-005: InviteCoachSchema", () => {
  it("accepts valid invite payload", () => {
    expect(() => InviteCoachSchema.parse({ email: "coach@example.com", name: "Jane Coach" })).not.toThrow();
  });
  it("rejects empty name", () => {
    expect(() => InviteCoachSchema.parse({ email: "coach@example.com", name: "" })).toThrow();
  });
  it("rejects missing email field", () => {
    expect(() => InviteCoachSchema.parse({ name: "Jane" } as unknown)).toThrow();
  });
});

describe("INFRA-005: SetPasswordSchema", () => {
  it("accepts strong password (uppercase + number)", () => {
    expect(() => SetPasswordSchema.parse({ password: "Strong1Pass" })).not.toThrow();
  });
  it("rejects password without uppercase", () => {
    expect(() => SetPasswordSchema.parse({ password: "weak1pass" })).toThrow();
  });
  it("rejects password without number", () => {
    expect(() => SetPasswordSchema.parse({ password: "WeakPassword" })).toThrow();
  });
});

describe("INFRA-005: CreateLeadSchema", () => {
  it("accepts valid manual lead", () => {
    expect(() =>
      CreateLeadSchema.parse({ name: "Jane", email: "j@x.co", source: "manual" })
    ).not.toThrow();
  });
  it("accepts lead with all optional fields", () => {
    expect(() =>
      CreateLeadSchema.parse({
        name: "Jane Doe",
        email: "jane@example.com",
        source: "calendly",
        phone: "+1234567890",
        coach_notes: "Met at webinar",
      })
    ).not.toThrow();
  });
  it("rejects invalid source enum", () => {
    expect(() =>
      CreateLeadSchema.parse({ name: "Jane", email: "j@x.co", source: "bogus" })
    ).toThrow();
  });
  it("rejects empty name", () => {
    expect(() =>
      CreateLeadSchema.parse({ name: "", email: "j@x.co", source: "manual" })
    ).toThrow();
  });
  it("rejects invalid email", () => {
    expect(() =>
      CreateLeadSchema.parse({ name: "Jane", email: "not-an-email", source: "manual" })
    ).toThrow();
  });
  it("rejects coach_notes exceeding 5000 chars", () => {
    expect(() =>
      CreateLeadSchema.parse({ name: "Jane", email: "j@x.co", source: "manual", coach_notes: "a".repeat(5001) })
    ).toThrow();
  });
});

describe("INFRA-005: UpdateLeadSchema", () => {
  it("accepts partial update with status only", () => {
    expect(() => UpdateLeadSchema.parse({ status: "replied" })).not.toThrow();
  });
  it("accepts do_not_contact boolean", () => {
    expect(() => UpdateLeadSchema.parse({ do_not_contact: true })).not.toThrow();
  });
  it("rejects invalid status enum", () => {
    expect(() => UpdateLeadSchema.parse({ status: "totally_fake" })).toThrow();
  });
  it("accepts empty partial update (no fields required)", () => {
    expect(() => UpdateLeadSchema.parse({})).not.toThrow();
  });
});

describe("STATE-001: isTerminalState helper", () => {
  it("returns true for terminal states", () => {
    const terminal: TLeadStatus[] = ["converted", "lost", "unsubscribed", "do_not_contact", "bounced"];
    terminal.forEach((s) => expect(isTerminalState(s)).toBe(true));
  });
  it("returns false for non-terminal states", () => {
    const nonTerminal: TLeadStatus[] = [
      "identified",
      "call_booked",
      "no_show",
      "call_completed",
      "in_sequence",
      "replied",
    ];
    nonTerminal.forEach((s) => expect(isTerminalState(s)).toBe(false));
  });
});
