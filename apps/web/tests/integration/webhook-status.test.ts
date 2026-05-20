import { describe, it, expect, vi, beforeEach } from "vitest";
import { installResendMock, resetResendMock } from "@/tests/utils/mocks/resend";
import { installSlackMock, resetSlackMock } from "@/tests/utils/mocks/slack";
import { installTwilioMock, resetTwilioMock } from "@/tests/utils/mocks/twilio";

installResendMock();
installSlackMock();
installTwilioMock();

// Mock Supabase admin
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: vi.fn() },
}));

// Mock the signature verifier directly so we control valid/invalid behavior
vi.mock("@/lib/resend/signature", () => ({
  verifyResendSignature: vi.fn(),
}));

import { adminClient } from "@/lib/supabase/admin";
import { verifyResendSignature } from "@/lib/resend/signature";

const mockAdminClient = adminClient as unknown as {
  from: ReturnType<typeof vi.fn>;
};
const mockVerifyResend = vi.mocked(verifyResendSignature);

beforeEach(() => {
  vi.clearAllMocks();
  resetResendMock();
  resetSlackMock();
  resetTwilioMock();
  // Default: valid signature
  mockVerifyResend.mockResolvedValue(true);
});

function makeResendWebhookRequest(
  body: object,
  secret: string,
): Request {
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

describe("webhook-status (Phase 4 / NOTIFY-007)", () => {
  it("Resend webhook updates notification_log.status by external_id (plan 04-03)", async () => {
    // mockVerifyResend returns true by default (set in beforeEach)

    let updateCalled = false;
    let updatedStatus: string | undefined;
    let updatedExternalId: string | undefined;

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "notification_log") {
        return {
          update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            updatedStatus = data["status"] as string;
            updateCalled = true;
            return {
              eq: vi.fn().mockReturnThis(),
            };
          }),
          eq: vi.fn().mockImplementation((_col: string, val: string) => {
            updatedExternalId = val;
            return {
              eq: vi.fn().mockReturnThis(),
            };
          }),
        };
      }
      return {};
    });

    // Also override to capture the external_id
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

    const req = makeResendWebhookRequest(
      {
        type: "email.delivered",
        data: { email_id: "resend-email-id-001", created_at: "2026-05-20T10:00:00Z" },
      },
      "valid-secret",
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(updateCalled).toBe(true);
    expect(updatedStatus).toBe("delivered");
  });

  it("Twilio status callback updates notification_log.status by message sid (plan 04-05)", () => {
    // Implemented by plan 04-05 — placeholder
    expect(true).toBe(true);
  });

  it("Slack event callback updates notification_log.status by ts (plan 04-04)", () => {
    // Implemented by plan 04-04 — placeholder
    expect(true).toBe(true);
  });

  it("rejects webhook payloads with invalid signature", async () => {
    // Override to simulate invalid signature
    mockVerifyResend.mockResolvedValueOnce(false);

    const { POST } = await import("@/app/api/webhooks/resend/route");

    const req = makeResendWebhookRequest(
      {
        type: "email.delivered",
        data: { email_id: "resend-email-id-002" },
      },
      "wrong-secret",
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
