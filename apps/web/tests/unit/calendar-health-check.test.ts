import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mirrors tests/unit/gmail-error-handler.test.ts: chainable adminClient stub +
// mocked Inngest client, but with a mutable state bag so tests can steer the
// integration's current status (dedup transition), the Vault token blob, and
// inspect update/rpc calls. Inlined because vi.mock is hoisted.
vi.mock("@/lib/supabase/admin", () => {
  const state = {
    integrationStatus: "connected" as string,
    vaultTokens: null as Record<string, unknown> | null,
    updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
    rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  };
  const makeChain = (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const chain: any = {};
    for (const m of ["select", "eq", "in", "is", "lt"]) {
      chain[m] = vi.fn(() => chain);
    }
    chain.update = vi.fn((values: Record<string, unknown>) => {
      state.updates.push({ table, values });
      return chain;
    });
    chain.maybeSingle = vi.fn(async () => ({
      data: { status: state.integrationStatus },
      error: null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable stub
    chain.then = (resolve: any) => resolve({ data: null, error: null });
    return chain;
  };
  const adminClient = {
    from: vi.fn((table: string) => makeChain(table)),
    schema: vi.fn(() => ({
      rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
        state.rpcCalls.push({ fn, args });
        if (fn === "get_calendar_tokens") return { data: state.vaultTokens, error: null };
        return { data: "vault-id-1", error: null };
      }),
    })),
  };
  return { adminClient, __mockState: state };
});

vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn(async () => undefined) },
}));

import { inngest } from "@/inngest/client";
import * as adminModule from "@/lib/supabase/admin";
import {
  isCalendarAuthDeadError,
  handleCalendarIntegrationBroken,
} from "@/lib/calendar/error-handler";
import { checkCalendarIntegration, computeExpiresAt } from "@/lib/calendar/health";
import { refreshAccessToken, OAuthRefreshError } from "@/lib/oauth/shared";
import { CALENDAR_PROVIDERS } from "@/lib/calendar/providers";

const mockSend = vi.mocked(inngest.send);
const mockState = (
  adminModule as unknown as {
    __mockState: {
      integrationStatus: string;
      vaultTokens: Record<string, unknown> | null;
      updates: Array<{ table: string; values: Record<string, unknown> }>;
      rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
    };
  }
).__mockState;

const mockFetch = vi.fn();

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue(undefined as never);
  mockState.integrationStatus = "connected";
  mockState.vaultTokens = null;
  mockState.updates.length = 0;
  mockState.rpcCalls.length = 0;
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("CALENDLY_CLIENT_ID", "test-client-id");
  vi.stubEnv("CALENDLY_CLIENT_SECRET", "test-client-secret");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("isCalendarAuthDeadError", () => {
  it("detects a dead grant by 401 status, invalid_grant code, and message", () => {
    expect(isCalendarAuthDeadError(new OAuthRefreshError("calendly", 401))).toBe(true);
    expect(isCalendarAuthDeadError(new OAuthRefreshError("calendly", 400, "invalid_grant"))).toBe(
      true,
    );
    expect(isCalendarAuthDeadError(new Error("token error: invalid_grant"))).toBe(true);
  });

  it("does NOT flag transient noise or our-side misconfig as a dead grant", () => {
    expect(isCalendarAuthDeadError(new OAuthRefreshError("calendly", 500))).toBe(false);
    expect(isCalendarAuthDeadError(new OAuthRefreshError("calendly", 429))).toBe(false);
    // invalid_client = OUR OAuth app credentials are wrong — not the coach's grant.
    expect(isCalendarAuthDeadError(new OAuthRefreshError("square", 400, "invalid_client"))).toBe(
      false,
    );
    expect(isCalendarAuthDeadError(new Error("fetch failed"))).toBe(false);
    expect(isCalendarAuthDeadError(null)).toBe(false);
  });
});

describe("handleCalendarIntegrationBroken — integration_broken emission", () => {
  it("marks the integration disconnected and emits notification/integration_broken once", async () => {
    await handleCalendarIntegrationBroken("coach-1", "calendly");

    const update = mockState.updates.find((u) => u.table === "integrations");
    expect(update?.values).toMatchObject({
      status: "disconnected",
      error_message: expect.stringContaining("reconnect"),
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notification/integration_broken",
        data: expect.objectContaining({
          coachId: "coach-1",
          eventType: "integration_broken",
          // Payload carries the display label (channel templates render it).
          payload: expect.objectContaining({ provider: "Calendly" }),
        }),
      }),
    );
  });

  it("dedups: an already-disconnected integration does not re-notify", async () => {
    await handleCalendarIntegrationBroken("coach-1", "calendly");
    expect(mockSend).toHaveBeenCalledTimes(1);

    // The first call flipped the row; a persistently-broken integration on the
    // next cron run sees status=disconnected and must stay quiet.
    mockState.integrationStatus = "disconnected";
    await handleCalendarIntegrationBroken("coach-1", "calendly");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the notification emit fails (best-effort error path)", async () => {
    mockSend.mockRejectedValueOnce(new Error("inngest down"));
    await expect(handleCalendarIntegrationBroken("coach-2", "square")).resolves.toBeUndefined();
  });
});

describe("refreshAccessToken", () => {
  const calendly = CALENDAR_PROVIDERS.calendly;

  it("POSTs grant_type=refresh_token and keeps the old refresh token when omitted", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "new-at", expires_in: 7200 }), { status: 200 }),
    );

    const tokens = await refreshAccessToken({ provider: calendly, refreshToken: "old-rt" });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(calendly.oauth!.tokenUrl);
    const body = String(init.body);
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=old-rt");
    expect(tokens.access_token).toBe("new-at");
    // Rotation-safe fallback: response omitted refresh_token → keep the old one.
    expect(tokens.refresh_token).toBe("old-rt");
    expect(tokens.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("throws OAuthRefreshError carrying the provider's invalid_grant code", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
    );

    const err = await refreshAccessToken({ provider: calendly, refreshToken: "dead-rt" }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(OAuthRefreshError);
    expect((err as OAuthRefreshError).oauthErrorCode).toBe("invalid_grant");
    expect(isCalendarAuthDeadError(err)).toBe(true);
  });
});

describe("checkCalendarIntegration — detect → mark disconnected → emit once", () => {
  it("skips integrations without a refresh token (Acuity-style non-expiring tokens)", async () => {
    mockState.vaultTokens = { access_token: "at-only" };
    await expect(checkCalendarIntegration("coach-1", "acuity")).resolves.toBe("skipped");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("leaves fresh tokens alone (expiry outside the refresh window)", async () => {
    mockState.vaultTokens = {
      refresh_token: "rt",
      expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };
    await expect(checkCalendarIntegration("coach-1", "calendly")).resolves.toBe("fresh");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refreshes a near-expiry token and writes the rotated tokens back to Vault", async () => {
    mockState.vaultTokens = {
      access_token: "old-at",
      refresh_token: "old-rt",
      owner: "https://api.calendly.com/users/abc",
      created_at: Math.floor(Date.now() / 1000) - 100,
      expires_in: 7200,
    };
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: "new-at", refresh_token: "new-rt", expires_in: 7200 }),
        { status: 200 },
      ),
    );

    await expect(checkCalendarIntegration("coach-1", "calendly")).resolves.toBe("refreshed");

    const store = mockState.rpcCalls.find((c) => c.fn === "store_calendar_tokens");
    expect(store).toBeDefined();
    const blob = store!.args["p_tokens"] as Record<string, unknown>;
    expect(blob["access_token"]).toBe("new-at");
    expect(blob["refresh_token"]).toBe("new-rt"); // rotated token persisted
    expect(blob["owner"]).toBe("https://api.calendly.com/users/abc"); // provider fields survive merge
    expect(typeof blob["expires_at"]).toBe("number"); // absolute expiry stamped for next run

    const update = mockState.updates.find((u) => u.table === "integrations");
    expect(update?.values).toMatchObject({ error_message: null });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("on invalid_grant: marks disconnected, emits integration_broken once, dedups on repeat", async () => {
    mockState.vaultTokens = { refresh_token: "dead-rt", expires_in: 7200 };
    // Fresh Response per call — a Response body can only be read once.
    mockFetch.mockImplementation(async () =>
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
    );

    await expect(checkCalendarIntegration("coach-1", "calendly")).resolves.toBe("broken");

    const update = mockState.updates.find((u) => u.table === "integrations");
    expect(update?.values).toMatchObject({ status: "disconnected" });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notification/integration_broken",
        data: expect.objectContaining({
          coachId: "coach-1",
          eventType: "integration_broken",
          payload: expect.objectContaining({ provider: "Calendly" }),
        }),
      }),
    );

    // Repeat run against the persistently-broken grant: still "broken", no re-notify.
    mockState.integrationStatus = "disconnected";
    await expect(checkCalendarIntegration("coach-1", "calendly")).resolves.toBe("broken");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("on transient failure (5xx): stays connected, no notification", async () => {
    mockState.vaultTokens = { refresh_token: "rt", expires_in: 7200 };
    mockFetch.mockResolvedValueOnce(new Response("bad gateway", { status: 502 }));

    await expect(checkCalendarIntegration("coach-1", "calendly")).resolves.toBe("error");

    const statusFlips = mockState.updates.filter(
      (u) => u.table === "integrations" && u.values["status"] === "disconnected",
    );
    expect(statusFlips).toHaveLength(0);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("computeExpiresAt — provider expiry shapes", () => {
  it("reads epoch-seconds, ISO strings, and created_at+expires_in; null when unknown", () => {
    expect(computeExpiresAt({ expires_at: 1_800_000_000 })).toBe(1_800_000_000);
    expect(computeExpiresAt({ expires_at: "2026-08-01T00:00:00Z" })).toBe(
      Math.floor(Date.parse("2026-08-01T00:00:00Z") / 1000),
    );
    expect(computeExpiresAt({ created_at: 1_000, expires_in: 7200 })).toBe(8_200);
    expect(computeExpiresAt({ expires_in: 7200 })).toBeNull(); // relative-only → refresh every run
    expect(computeExpiresAt({})).toBeNull();
  });
});
