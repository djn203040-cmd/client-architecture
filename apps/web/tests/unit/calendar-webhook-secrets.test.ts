import { beforeEach, describe, expect, it, vi } from "vitest";

// Per-coach webhook secret resolution + coach binding for the signed providers
// whose signature key is app-level (acuity, square). The token in the webhook
// URL must match the Vault secret once one is provisioned; coaches connected
// before provisioning existed pass on signature alone.

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    schema: () => ({ rpc }),
  },
}));

import {
  getStoredCalendarWebhookSecret,
  verifyUrlTokenIfProvisioned,
} from "@/lib/calendar/webhook-secrets";

const STORED = "a".repeat(64); // hex secret, like randomBytes(32).toString("hex")

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: STORED, error: null });
});

describe("getStoredCalendarWebhookSecret", () => {
  it("returns the stored secret", async () => {
    expect(await getStoredCalendarWebhookSecret("coach-1", "calendly")).toBe(STORED);
    expect(rpc).toHaveBeenCalledWith("get_calendar_webhook_secret", {
      p_coach_id: "coach-1",
      p_provider: "calendly",
    });
  });

  it("returns null when no secret is provisioned", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await getStoredCalendarWebhookSecret("coach-1", "calendly")).toBeNull();
  });

  it("returns null on an empty-string secret", async () => {
    rpc.mockResolvedValue({ data: "", error: null });
    expect(await getStoredCalendarWebhookSecret("coach-1", "calendly")).toBeNull();
  });

  it("returns null on an RPC error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getStoredCalendarWebhookSecret("coach-1", "calendly")).toBeNull();
  });
});

describe("verifyUrlTokenIfProvisioned", () => {
  it("accepts the correct token when a secret is provisioned", async () => {
    expect(await verifyUrlTokenIfProvisioned("coach-1", "acuity", STORED)).toBe(true);
  });

  it("rejects a wrong token of equal length", async () => {
    expect(await verifyUrlTokenIfProvisioned("coach-1", "acuity", "b".repeat(64))).toBe(false);
  });

  it("rejects a missing token when a secret is provisioned", async () => {
    expect(await verifyUrlTokenIfProvisioned("coach-1", "square", null)).toBe(false);
  });

  it("passes a pre-provisioning coach with no stored secret (legacy grace)", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await verifyUrlTokenIfProvisioned("coach-1", "acuity", null)).toBe(true);
  });

  it("passes legacy grace even when a stray token is sent", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await verifyUrlTokenIfProvisioned("coach-1", "square", "anything")).toBe(true);
  });
});
