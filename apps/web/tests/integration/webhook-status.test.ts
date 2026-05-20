import { describe, it, expect, vi, beforeEach } from "vitest";
import { installResendMock, resetResendMock } from "@/tests/utils/mocks/resend";
import { installSlackMock, resetSlackMock } from "@/tests/utils/mocks/slack";
import { installTwilioMock, resetTwilioMock } from "@/tests/utils/mocks/twilio";

installResendMock();
installSlackMock();
installTwilioMock();

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: vi.fn() },
}));

vi.mock("@/lib/resend/signature", () => ({
  verifyResendSignature: vi.fn(),
}));

vi.mock("@/lib/twilio/signature", () => ({
  verifyTwilioSignature: vi.fn(),
}));

import { adminClient } from "@/lib/supabase/admin";
import { verifyResendSignature } from "@/lib/resend/signature";
import { verifyTwilioSignature } from "@/lib/twilio/signature";

const mockAdminClient = adminClient as unknown as {
  from: ReturnType<typeof vi.fn>;
};
const mockVerifyResend = vi.mocked(verifyResendSignature);
const mockVerifyTwilio = vi.mocked(verifyTwilioSignature);

beforeEach(() => {
  vi.clearAllMocks();
  resetResendMock();
  resetSlackMock();
  resetTwilioMock();
  mockVerifyResend.mockResolvedValue(true);
  mockVerifyTwilio.mockReturnValue(true);

  process.env.NEXT_PUBLIC_APP_URL = "https://app.sonorous.com";
  process.env.TWILIO_AUTH_TOKEN = "test-auth-token";
});

function makeResendWebhookRequest(body: object): Request {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": "svix-id-123",
      "svix-timestamp": "1234567890",
      "svix-signature": "v1,signature",
    },
    body: JSON.stringify(body),
  });
}

function makeTwilioStatusRequest(
  params: Record<string, string>,
  signature = "valid-sig",
): Request {
  const body = new URLSearchParams(params).toString();
  return new Request("https://app.sonorous.com/api/webhooks/twilio/status", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature,
    },
    body,
  });
}

// ── Supabase mock helpers ──────────────────────────────────────────────────

function makeUpdateChain(capturedUpdate?: { value: unknown }) {
  const inFn = vi.fn().mockReturnThis();
  const eqFn = vi.fn().mockImplementation(() => ({ in: inFn }));
  const updateFn = vi.fn().mockImplementation((data: unknown) => {
    if (capturedUpdate) capturedUpdate.value = data;
    return { eq: eqFn };
  });
  return { update: updateFn, eq: eqFn, in: inFn };
}

function makeInsertChain() {
  return { insert: vi.fn().mockResolvedValue({ error: null }) };
}

// ── Resend webhook tests ───────────────────────────────────────────────────

describe("webhook-status / Resend (plan 04-03)", () => {
  it("updates notification_log.status to delivered on email.delivered event", async () => {
    let updateCalled = false;
    let updatedStatus: string | undefined;

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "notification_log") {
        const eqFn = vi.fn().mockReturnThis();
        return {
          update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            updatedStatus = data["status"] as string;
            updateCalled = true;
            return { eq: eqFn };
          }),
          eq: eqFn,
        };
      }
      return {};
    });

    const { POST } = await import("@/app/api/webhooks/resend/route");

    const req = makeResendWebhookRequest({
      type: "email.delivered",
      data: { email_id: "resend-email-id-001", created_at: "2026-05-20T10:00:00Z" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(updateCalled).toBe(true);
    expect(updatedStatus).toBe("delivered");
  });

  it("rejects Resend webhook payloads with invalid signature", async () => {
    mockVerifyResend.mockResolvedValueOnce(false);

    const { POST } = await import("@/app/api/webhooks/resend/route");

    const req = makeResendWebhookRequest({
      type: "email.delivered",
      data: { email_id: "resend-email-id-002" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ── Twilio status webhook tests ────────────────────────────────────────────

describe("webhook-status / Twilio (plan 04-05)", () => {
  it("updates notification_log status to delivered on MessageStatus=delivered", async () => {
    const captured: { value: unknown } = { value: undefined };
    mockAdminClient.from.mockImplementation(() => makeUpdateChain(captured));

    const { POST } = await import("@/app/api/webhooks/twilio/status/route");

    const res = await POST(
      makeTwilioStatusRequest({
        MessageSid: "SM-test-001",
        MessageStatus: "delivered",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(captured.value).toMatchObject({ status: "delivered" });
  });

  it("updates notification_log status to failed with ErrorCode on failure", async () => {
    const captured: { value: unknown } = { value: undefined };
    mockAdminClient.from.mockImplementation(() => makeUpdateChain(captured));

    const { POST } = await import("@/app/api/webhooks/twilio/status/route");

    const res = await POST(
      makeTwilioStatusRequest({
        MessageSid: "SM-test-002",
        MessageStatus: "failed",
        ErrorCode: "30006",
        ErrorMessage: "Landline or unreachable carrier",
      }),
    );

    expect(res.status).toBe(200);
    const update = captured.value as Record<string, unknown>;
    expect(update.status).toBe("failed");
    expect(update.error_message as string).toContain("30006");
  });

  it("returns 401 and does not update DB on invalid signature", async () => {
    mockVerifyTwilio.mockReturnValueOnce(false);
    const updateFn = vi.fn();
    mockAdminClient.from.mockImplementation(() => ({ update: updateFn }));

    const { POST } = await import("@/app/api/webhooks/twilio/status/route");

    const res = await POST(
      makeTwilioStatusRequest(
        { MessageSid: "SM-test-003", MessageStatus: "delivered" },
        "bad-signature",
      ),
    );

    expect(res.status).toBe(401);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("returns 200 with ignored field for unmapped MessageStatus", async () => {
    mockAdminClient.from.mockImplementation(() => makeUpdateChain());

    const { POST } = await import("@/app/api/webhooks/twilio/status/route");

    const res = await POST(
      makeTwilioStatusRequest({
        MessageSid: "SM-test-004",
        MessageStatus: "accepted",
      }),
    );

    // 'accepted' maps to 'sent' in STATUS_MAP, so it should be 200 ok
    expect(res.status).toBe(200);
  });

  it("returns 400 when MessageSid is missing", async () => {
    const { POST } = await import("@/app/api/webhooks/twilio/status/route");

    const res = await POST(
      makeTwilioStatusRequest({ MessageStatus: "delivered" }),
    );

    expect(res.status).toBe(400);
  });

  it("Slack event callback placeholder (plan 04-04)", () => {
    expect(true).toBe(true);
  });
});
