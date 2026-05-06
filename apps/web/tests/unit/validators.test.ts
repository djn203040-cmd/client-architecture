import { describe, it, expect } from "vitest";
import { LoginSchema, InviteCoachSchema, SetPasswordSchema } from "@client/shared/validators";

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
