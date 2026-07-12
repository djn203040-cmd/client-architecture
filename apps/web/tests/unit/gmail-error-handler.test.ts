import { describe, it, expect, vi, beforeEach } from "vitest";

// adminClient is hit by handleInvalidGrant's first two steps (mark integration
// disconnected, pause sequences) plus the legacy notification_log write that the
// fix replaced. A chainable stub is enough: every builder method returns the same
// object and the builder is awaitable. Inlined because vi.mock is hoisted.
vi.mock("@/lib/supabase/admin", () => {
  const makeChain = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const chain: any = {};
    for (const m of ["select", "update", "insert", "eq"]) {
      chain[m] = vi.fn(() => chain);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable stub
    chain.then = (resolve: any) => resolve({ data: null, error: null });
    return chain;
  };
  return { adminClient: { from: vi.fn(() => makeChain()) } };
});

// The whole point of the fix: handleInvalidGrant must EMIT
// notification/integration_broken. Stub the Inngest client so we can assert it.
vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn(async () => undefined) },
}));

import { inngest } from "@/inngest/client";
import {
  handleInvalidGrant,
  isInvalidGrantError,
  OAuthInvalidGrantError,
} from "@/lib/gmail/error-handler";

const mockSend = vi.mocked(inngest.send);

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue(undefined as never);
});

describe("handleInvalidGrant, integration_broken emission", () => {
  it("emits notification/integration_broken for the broken Gmail connection", async () => {
    await handleInvalidGrant("coach-1");

    // Regression guard: toggling the integration_broken row used to do nothing
    // because nothing emitted this event. It must fire now.
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notification/integration_broken",
        data: expect.objectContaining({
          coachId: "coach-1",
          eventType: "integration_broken",
          payload: expect.objectContaining({ provider: "Gmail" }),
        }),
      }),
    );
  });

  it("does not throw when the notification emit fails (best-effort error path)", async () => {
    mockSend.mockRejectedValueOnce(new Error("inngest down"));

    // The integration is already marked disconnected; a notification failure
    // must not re-throw inside the OAuth error path.
    await expect(handleInvalidGrant("coach-2")).resolves.toBeUndefined();
  });
});

describe("isInvalidGrantError", () => {
  it("detects invalid_grant by code, nested response, and message", () => {
    expect(isInvalidGrantError({ code: "invalid_grant" })).toBe(true);
    expect(
      isInvalidGrantError({ response: { data: { error: "invalid_grant" } } }),
    ).toBe(true);
    expect(isInvalidGrantError(new Error("Token error: invalid_grant"))).toBe(true);
    expect(isInvalidGrantError({ code: "rate_limited" })).toBe(false);
    expect(isInvalidGrantError(null)).toBe(false);
  });

  it("OAuthInvalidGrantError carries the coachId", () => {
    const err = new OAuthInvalidGrantError("coach-9");
    expect(err.coachId).toBe("coach-9");
    expect(err.name).toBe("OAuthInvalidGrantError");
  });
});
