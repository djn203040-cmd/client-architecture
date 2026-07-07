import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression for #55 (part 1): a revoked/expired refresh token fails inside
// googleapis' refreshTokenNoCache DURING a request, so the API call itself
// rejects with a raw `Error: invalid_grant`. The `on("tokens")` event never
// fires (it only fires on successful refresh), and the old Proxy in
// getGmailClientForCoach only wrapped direct function properties of the ROOT
// client — `gmail.users` is an object, so nested calls like
// `gmail.users.messages.send(...)` escaped the wrapper and handleInvalidGrant
// never ran. These tests drive the REAL error-handler (mocked adminClient +
// inngest, mirroring gmail-error-handler.test.ts) through the wrapped client
// and assert the full self-heal: disconnect + pause + notify.

// Chainable adminClient stub. getGmailClientForCoach needs
// schema("private").rpc("get_gmail_tokens") to resolve tokens;
// handleInvalidGrant needs from("integrations"/"sequences").update().eq().eq().
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
  return {
    adminClient: {
      from: vi.fn(() => makeChain()),
      schema: vi.fn(() => ({
        rpc: vi.fn(async () => ({
          data: { access_token: "at", refresh_token: "rt" },
          error: null,
        })),
      })),
    },
  };
});

// handleInvalidGrant must EMIT notification/integration_broken — stub Inngest
// so we can assert the notify half of the self-heal.
vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn(async () => undefined) },
}));

// OAuth2 client stub — credentials/token-refresh behavior is simulated at the
// gmail-call level below, where the failure actually surfaces.
vi.mock("@/lib/gmail/auth", () => ({
  createOAuth2Client: vi.fn(() => ({ setCredentials: vi.fn(), on: vi.fn() })),
}));

// Fake gmail client with the real nested shape (users.messages.send). The send
// mock is swapped per-test to simulate refresh-path failures. vi.hoisted so the
// hoisted vi.mock factory below can reference it without a TDZ error.
const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));
vi.mock("googleapis", () => ({
  google: {
    gmail: vi.fn(() => ({ users: { messages: { send: sendMock } } })),
  },
}));

import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { getGmailClientForCoach } from "@/lib/gmail/client";
import { OAuthInvalidGrantError } from "@/lib/gmail/error-handler";

const mockInngestSend = vi.mocked(inngest.send);
const mockFrom = vi.mocked(adminClient.from);

beforeEach(() => {
  sendMock.mockReset();
  mockInngestSend.mockReset();
  mockInngestSend.mockResolvedValue(undefined as never);
  mockFrom.mockClear();
});

describe("getGmailClientForCoach — refresh-path invalid_grant self-heal (#55)", () => {
  it("routes a raw refresh-path invalid_grant on a NESTED call through handleInvalidGrant", async () => {
    // Exactly what google-auth-library's refreshTokenNoCache throws when the
    // refresh token is revoked: a bare Error whose message is "invalid_grant".
    sendMock.mockRejectedValueOnce(new Error("invalid_grant"));

    const gmail = await getGmailClientForCoach("coach-55");

    await expect(
      gmail.users.messages.send({ userId: "me", requestBody: { raw: "x" } }),
    ).rejects.toBeInstanceOf(OAuthInvalidGrantError);

    // Disconnect + pause: handleInvalidGrant updates both tables.
    expect(mockFrom).toHaveBeenCalledWith("integrations");
    expect(mockFrom).toHaveBeenCalledWith("sequences");

    // Notify: the coach is told their Gmail connection broke.
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notification/integration_broken",
        data: expect.objectContaining({
          coachId: "coach-55",
          eventType: "integration_broken",
          payload: expect.objectContaining({ provider: "Gmail" }),
        }),
      }),
    );
  });

  it("also handles the structured GaxiosError shape (response.data.error)", async () => {
    sendMock.mockRejectedValueOnce(
      Object.assign(new Error("request failed"), {
        response: { data: { error: "invalid_grant" } },
      }),
    );

    const gmail = await getGmailClientForCoach("coach-56");

    await expect(
      gmail.users.messages.send({ userId: "me", requestBody: { raw: "x" } }),
    ).rejects.toBeInstanceOf(OAuthInvalidGrantError);
    expect(mockInngestSend).toHaveBeenCalledTimes(1);
  });

  it("re-throws non-invalid_grant errors untouched and does NOT disconnect", async () => {
    const rateLimit = Object.assign(new Error("rateLimitExceeded"), { code: 429 });
    sendMock.mockRejectedValueOnce(rateLimit);

    const gmail = await getGmailClientForCoach("coach-57");

    await expect(
      gmail.users.messages.send({ userId: "me", requestBody: { raw: "x" } }),
    ).rejects.toBe(rateLimit);

    // No self-heal side effects for unrelated failures.
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("passes successful nested calls through unchanged", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "m1", threadId: "t1" } });

    const gmail = await getGmailClientForCoach("coach-58");
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: "x" },
    });

    expect(result).toEqual({ data: { id: "m1", threadId: "t1" } });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
