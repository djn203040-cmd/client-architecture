import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    from: vi.fn(() => ({ upsert: mockUpsert })),
  },
}));

function makeRequest(body: unknown): Request {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

async function callPatch(body: unknown, authed = true) {
  mockGetUser.mockResolvedValue({
    data: { user: authed ? { id: "coach-test" } : null },
    error: null,
  });
  const { PATCH } = await import("@/app/api/settings/notifications/route");
  const res = await PATCH(makeRequest(body) as never);
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  vi.resetModules();
  mockUpsert.mockResolvedValue({ data: null, error: null });
});

describe("PATCH /api/settings/notifications", () => {
  it("rejects disabling dashboard (D-13 server-side lock)", async () => {
    const { status, json } = await callPatch({ event_type: "draft_ready", channel: "dashboard", enabled: false });
    expect(status).toBe(400);
    expect(json.reason).toBe("dashboard_always_on");
  });

  it("rejects disabling hard_bounce × sms (D-15 server-side lock)", async () => {
    const { status, json } = await callPatch({ event_type: "hard_bounce", channel: "sms", enabled: false });
    expect(status).toBe(400);
    expect(json.reason).toBe("hard_bounce_sms_always_on");
  });

  it("allows enabling dashboard", async () => {
    const { status, json } = await callPatch({ event_type: "draft_ready", channel: "dashboard", enabled: true });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("allows toggling draft_ready + email off", async () => {
    const { status, json } = await callPatch({ event_type: "draft_ready", channel: "email", enabled: false });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const { status, json } = await callPatch({ event_type: "draft_ready", channel: "email", enabled: false }, false);
    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("rejects invalid input (missing enabled field)", async () => {
    const { status } = await callPatch({ event_type: "draft_ready", channel: "email" });
    expect(status).toBe(400);
  });

  it("allows re-enabling hard_bounce × sms (enabled=true is fine)", async () => {
    const { status, json } = await callPatch({ event_type: "hard_bounce", channel: "sms", enabled: true });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
