import { describe, it, expect } from "vitest";
import { validateGmailScopes, parseScopeString } from "@/lib/gmail/scope-validation";

describe("HEALTH-007: Gmail scope validation", () => {
  it("returns ok=true when all required scopes present", () => {
    const r = validateGmailScopes([
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ]);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("returns ok=false when gmail.send missing (under-scoped)", () => {
    const r = validateGmailScopes(["https://www.googleapis.com/auth/gmail.readonly"]);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("https://www.googleapis.com/auth/gmail.send");
  });

  it("returns ok=false when both required scopes missing", () => {
    const r = validateGmailScopes([]);
    expect(r.ok).toBe(false);
    expect(r.missing.length).toBe(2);
  });

  it("parseScopeString splits Google's space-delimited scope param", () => {
    expect(parseScopeString("https://a https://b")).toEqual(["https://a", "https://b"]);
    expect(parseScopeString("")).toEqual([]);
    expect(parseScopeString(null)).toEqual([]);
  });
});
