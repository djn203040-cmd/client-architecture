import { describe, it, expect, vi, beforeEach } from "vitest";

// adminClient is hit by handleSlackIntegrationBroken's first step (flag the
// integration disconnected). A chainable stub is enough: every builder method
// returns the same object and the builder is awaitable. Inlined because vi.mock
// is hoisted.
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

// The whole point of the fix: handleSlackIntegrationBroken must EMIT
// notification/integration_broken. Stub the Inngest client so we can assert it.
vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn(async () => undefined) },
}));

// Stub the client module so importing the cache-evictor doesn't pull in
// server-only / @slack/web-api in the unit context.
vi.mock("@/lib/slack/client", () => ({
  evictSlackClientCache: vi.fn(),
}));

import { inngest } from "@/inngest/client";
import { evictSlackClientCache } from "@/lib/slack/client";
import {
  handleSlackIntegrationBroken,
  isSlackAuthRevokedError,
} from "@/lib/slack/error-handler";

const mockSend = vi.mocked(inngest.send);

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue(undefined as never);
  vi.mocked(evictSlackClientCache).mockReset();
});

describe("handleSlackIntegrationBroken, integration_broken emission", () => {
  it("emits notification/integration_broken for the broken Slack connection", async () => {
    await handleSlackIntegrationBroken("coach-1");

    // Regression guard: toggling the integration_broken row used to do nothing
    // for Slack because nothing emitted this event. It must fire now.
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notification/integration_broken",
        data: expect.objectContaining({
          coachId: "coach-1",
          eventType: "integration_broken",
          payload: expect.objectContaining({ provider: "Slack" }),
        }),
      }),
    );
  });

  it("evicts the cached Slack client so a reconnect uses the fresh token", async () => {
    await handleSlackIntegrationBroken("coach-3");
    expect(evictSlackClientCache).toHaveBeenCalledWith("coach-3");
  });

  it("does not throw when the notification emit fails (best-effort error path)", async () => {
    mockSend.mockRejectedValueOnce(new Error("inngest down"));

    // The integration is already marked disconnected; a notification failure
    // must not re-throw inside the send error path that called us.
    await expect(handleSlackIntegrationBroken("coach-2")).resolves.toBeUndefined();
  });
});

describe("isSlackAuthRevokedError", () => {
  it("detects a revoked token via the SDK error's data.error code", () => {
    expect(isSlackAuthRevokedError({ data: { error: "invalid_auth" } })).toBe(true);
    expect(isSlackAuthRevokedError({ data: { error: "token_revoked" } })).toBe(true);
    expect(isSlackAuthRevokedError({ data: { error: "account_inactive" } })).toBe(true);
  });

  it("detects a revoked token via the error message and our slack_post_failed wrapper", () => {
    expect(isSlackAuthRevokedError(new Error("An API error occurred: invalid_auth"))).toBe(true);
    expect(isSlackAuthRevokedError("slack_post_failed:token_revoked")).toBe(true);
  });

  it("does not treat transient/unrelated errors as a revoked token", () => {
    expect(isSlackAuthRevokedError({ data: { error: "rate_limited" } })).toBe(false);
    expect(isSlackAuthRevokedError({ data: { error: "channel_not_found" } })).toBe(false);
    expect(isSlackAuthRevokedError(new Error("network timeout"))).toBe(false);
    expect(isSlackAuthRevokedError(null)).toBe(false);
    expect(isSlackAuthRevokedError(undefined)).toBe(false);
  });
});
