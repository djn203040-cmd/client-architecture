import { beforeEach, describe, expect, it, vi } from "vitest";

// #82 — the three signature-less providers (setmore/tidycal/ms_bookings) are
// gated by a per-coach URL token verified against the Vault-stored secret.

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    schema: () => ({ rpc }),
  },
}));

import { verifyCalendarWebhookToken } from "@/lib/calendar/verify-webhook-token";

const STORED = "a".repeat(64); // hex secret, like randomBytes(32).toString("hex")

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: STORED, error: null });
});

describe("verifyCalendarWebhookToken", () => {
  it("accepts the correct token", async () => {
    expect(await verifyCalendarWebhookToken("coach-1", "setmore", STORED)).toBe(true);
  });

  it("rejects a wrong token of equal length", async () => {
    expect(await verifyCalendarWebhookToken("coach-1", "setmore", "b".repeat(64))).toBe(false);
  });

  it("rejects a wrong token of different length", async () => {
    expect(await verifyCalendarWebhookToken("coach-1", "tidycal", "short")).toBe(false);
  });

  it("rejects a null/missing token without even hitting the DB", async () => {
    expect(await verifyCalendarWebhookToken("coach-1", "ms_bookings", null)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when no secret is provisioned for the coach", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await verifyCalendarWebhookToken("coach-1", "setmore", STORED)).toBe(false);
  });

  it("fails closed on an RPC error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await verifyCalendarWebhookToken("coach-1", "setmore", STORED)).toBe(false);
  });
});
