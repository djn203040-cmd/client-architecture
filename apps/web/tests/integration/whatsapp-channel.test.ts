import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { installTwilioMock, resetTwilioMock, mockTwilioClient } from "@/tests/utils/mocks/twilio";

installTwilioMock();

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: vi.fn() },
}));

vi.mock("@/lib/review-token", () => ({
  generateReviewToken: vi.fn(() => "test-token-abc"),
  buildReviewUrl: vi.fn((t: string) => `https://app.sonorous.com/review/${t}`),
  buildShortReviewUrl: vi.fn((t: string) => `https://app.sonorous.com/r/${t}`),
}));

import { adminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/notifications/channels/whatsapp";

const mockAdmin = adminClient as unknown as { from: ReturnType<typeof vi.fn> };

function coachChain(phone: string | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: phone ? { phone } : null, error: null }),
  };
  return chain;
}

function draftChain(followupCount = 0) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: "draft-id-001", review_token_nonce: "nonce-abc", followup_count: followupCount },
      error: null,
    }),
  };
  return chain;
}

function logChain(insertFn?: Mock<(...args: unknown[]) => unknown>) {
  return { insert: insertFn ?? vi.fn().mockResolvedValue({ error: null }) };
}

// Returns a from() implementation that dispatches by table name
function makeMockFrom(overrides: {
  followupCount?: number;
  coachPhone?: string | null;
  insertFn?: Mock<(...args: unknown[]) => unknown>;
}) {
  const { followupCount = 0, coachPhone = "+447700900123", insertFn } = overrides;
  return (table: string) => {
    if (table === "coaches") return coachChain(coachPhone ?? null);
    if (table === "drafts") return draftChain(followupCount);
    if (table === "notification_log") return logChain(insertFn);
    return logChain();
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetTwilioMock();

  process.env.TWILIO_ACCOUNT_SID = "AC-test-sid";
  process.env.TWILIO_AUTH_TOKEN = "test-auth-token";
  process.env.TWILIO_WHATSAPP_FROM = "+14155238886";
  process.env.TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID = "MGtest-draft-ready-sid";
  process.env.TWILIO_WHATSAPP_DRAFT_FOLLOWUP_CONTENT_SID = "MGtest-draft-followup-sid";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.sonorous.com";
});

describe("whatsapp-channel (Phase 4 / NOTIFY-004)", () => {
  it("invokes Twilio messages.create with ContentSid + ContentVariables shape", async () => {
    mockAdmin.from.mockImplementation(makeMockFrom({}));

    const result = await sendWhatsApp({
      coachId: "coach-1",
      eventType: "draft_ready",
      payload: { draftId: "draft-id-001", leadName: "Jane Smith", sendTime: "Tuesday 3:00 PM" },
    });

    expect(result.status).toBe("sent");
    expect(result.external_id).toBe("test-message-sid");

    const call = mockTwilioClient.messages.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).toBeDefined();
    expect(call.contentSid).toBe("MGtest-draft-ready-sid");

    const vars = JSON.parse(call.contentVariables as string) as Record<string, string>;
    expect(vars["1"]).toBe("Jane Smith");
    expect(vars["2"]).toBe("Tuesday 3:00 PM");
    expect(vars["3"]).toContain("/review/");
    expect(call.statusCallback).toContain("/api/webhooks/twilio/status");
  });

  it("uses the WhatsApp Business 'from' channel address", async () => {
    mockAdmin.from.mockImplementation(makeMockFrom({}));

    await sendWhatsApp({
      coachId: "coach-1",
      eventType: "draft_ready",
      payload: { draftId: "draft-id-001", leadName: "Test Lead", sendTime: "Now" },
    });

    const call = mockTwilioClient.messages.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.from).toBe("whatsapp:+14155238886");
    expect(call.to).toBe("whatsapp:+447700900123");
  });

  it("logs sid + status into notification_log", async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockAdmin.from.mockImplementation(makeMockFrom({ insertFn }));

    await sendWhatsApp({
      coachId: "coach-1",
      eventType: "draft_ready",
      payload: { draftId: "draft-id-001", leadName: "Test Lead", sendTime: "Now" },
    });

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        external_id: "test-message-sid",
        status: "sent",
        channel: "whatsapp",
      }),
    );
  });

  it("uses draft_followup template when followup_count >= 1 (2 variables only)", async () => {
    mockAdmin.from.mockImplementation(makeMockFrom({ followupCount: 1 }));

    const result = await sendWhatsApp({
      coachId: "coach-1",
      eventType: "lead_replied",
      payload: { draftId: "draft-id-001", leadName: "Jane Smith", sendTime: "Now" },
    });

    expect(result.status).toBe("sent");
    const call = mockTwilioClient.messages.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.contentSid).toBe("MGtest-draft-followup-sid");

    const vars = JSON.parse(call.contentVariables as string) as Record<string, string>;
    expect(vars["1"]).toBe("Jane Smith");
    expect(vars["2"]).toContain("/review/");
    expect(vars["3"]).toBeUndefined();
  });

  it("returns failed status when TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID is missing", async () => {
    delete process.env.TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID;
    mockAdmin.from.mockImplementation(makeMockFrom({}));

    const result = await sendWhatsApp({
      coachId: "coach-1",
      eventType: "draft_ready",
      payload: { draftId: "draft-id-001", leadName: "Test Lead" },
    });

    expect(result.status).toBe("failed");
    expect(mockTwilioClient.messages.create).not.toHaveBeenCalled();
  });
});
