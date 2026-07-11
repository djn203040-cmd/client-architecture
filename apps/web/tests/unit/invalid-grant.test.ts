import { describe, it, expect, vi, beforeEach } from "vitest";
import { isInvalidGrantError, OAuthInvalidGrantError } from "@/lib/gmail/error-handler";

describe("HEALTH-004: invalid_grant detection", () => {
  it("detects invalid_grant by err.code", () => {
    expect(isInvalidGrantError({ code: "invalid_grant" })).toBe(true);
  });
  it("detects invalid_grant by err.response.data.error", () => {
    expect(isInvalidGrantError({ response: { data: { error: "invalid_grant" } } })).toBe(true);
  });
  it("detects invalid_grant by err.message substring", () => {
    expect(isInvalidGrantError({ message: "Bad Request: invalid_grant" })).toBe(true);
  });
  it("returns false for other errors", () => {
    expect(isInvalidGrantError({ message: "rate limit" })).toBe(false);
    expect(isInvalidGrantError(null)).toBe(false);
    expect(isInvalidGrantError(undefined)).toBe(false);
    expect(isInvalidGrantError("string")).toBe(false);
  });
});

describe("HEALTH-004: handleInvalidGrant marks disconnected + halts sequences", () => {
  // Mocking adminClient at module level
  const updateMock = vi.fn().mockResolvedValue({ error: null });
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn(() => ({
    update: () => ({ eq: () => ({ eq: () => updateMock() }) }),
    insert: insertMock,
  }));

  beforeEach(() => {
    vi.resetModules();
    updateMock.mockClear();
    insertMock.mockClear();
  });

  it("marks the integration disconnected (UPDATE integrations) and halts sequences (UPDATE sequences)", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({ adminClient: { from: fromMock } }));
    const { handleInvalidGrant } = await import("@/lib/gmail/error-handler");
    await handleInvalidGrant("coach-uuid-test");
    // The coach notice is no longer a direct notification_log row, handleInvalidGrant
    // now emits notification/integration_broken (covered by gmail-error-handler.test.ts).
    // This test owns the disconnect + sequence-halt side effects.
    expect(fromMock).toHaveBeenCalledWith("integrations");
    expect(fromMock).toHaveBeenCalledWith("sequences");
  });
});

describe("HEALTH-004: OAuthInvalidGrantError class", () => {
  it("is a typed error with coachId", () => {
    const e = new OAuthInvalidGrantError("c-1");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("OAuthInvalidGrantError");
    expect(e.coachId).toBe("c-1");
  });
});
