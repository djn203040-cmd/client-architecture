import { describe, it, beforeEach, expect, vi } from "vitest";
import { installResendMock, resetResendMock, mockResend } from "@/tests/utils/mocks/resend";

installResendMock();

// Mock server-only supabase admin
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    from: vi.fn(),
  },
}));

// Mock review-token to avoid server-only imports in tests
vi.mock("@/lib/review-token", () => ({
  generateReviewToken: vi.fn(() => "encoded-payload.test-sig"),
  buildReviewUrl: vi.fn((token: string) => `https://app.sonorous.com/review/${token}`),
  buildShortReviewUrl: vi.fn((token: string) => `https://app.sonorous.com/r/${token}`),
  verifyReviewToken: vi.fn(),
}));

import { adminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/channels/email";
import {
  buildDraftReadyEmail,
  buildDraftFollowupEmail,
} from "@/lib/email/templates/draft-ready";

// Also mock getResendClient to avoid singleton caching issues
vi.mock("@/lib/resend/client", () => ({
  getResendClient: vi.fn(() => mockResend),
}));

const mockAdminClient = adminClient as unknown as { from: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  resetResendMock();
  process.env["JWT_REVIEW_SECRET"] = "test-secret";
  process.env["NEXT_PUBLIC_APP_URL"] = "https://app.sonorous.com";
  process.env["RESEND_API_KEY"] = "re_test";

  // Default: coach found, draft found
  mockAdminClient.from.mockImplementation((table: string) => {
    if (table === "coaches") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { email: "coach@example.com", name: "Test Coach" },
          error: null,
        }),
      };
    }
    if (table === "drafts") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "draft-1",
            review_token_nonce: "nonce-1",
            body: "Hi there, following up.",
            subject: "Quick follow-up",
          },
          error: null,
        }),
      };
    }
    if (table === "notification_log") {
      return {
        insert: vi.fn().mockResolvedValue({ data: [{ id: "log-1" }], error: null }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }), insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
  });
});

describe("email-channel (Phase 4 / NOTIFY-002)", () => {
  it("invokes Resend SDK with html + text + from + to payload", async () => {
    void mockResend; // keep reference so tree-shaking doesn't elide the mock

    const result = await sendEmail({
      coachId: "coach-1",
      eventType: "draft_ready",
      payload: {
        draftId: "draft-1",
        leadName: "Alice",
        sendTime: "10:00 AM",
        confidenceLevel: "high",
      },
    });

    expect(mockResend.emails.send).toHaveBeenCalledOnce();
    const call = mockResend.emails.send.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.from).toBe("Sonorous Drafts <drafts@sonorous.com>");
    expect(call.to).toBe("coach@example.com");
    expect(typeof call.html).toBe("string");
    expect(typeof call.text).toBe("string");
    expect((call.html as string).length).toBeGreaterThan(100);
    expect(result.status).toBe("sent");
    expect(result.external_id).toBe("test-email-id");
  });

  it("embeds a tokenized review link that resolves to /review/[token]", async () => {
    const result = await sendEmail({
      coachId: "coach-1",
      eventType: "draft_ready",
      payload: {
        draftId: "draft-1",
        leadName: "Bob",
        sendTime: "2:00 PM",
        confidenceLevel: "high",
      },
    });

    expect(result.status).toBe("sent");
    const call = mockResend.emails.send.mock.calls[0]![0] as Record<string, unknown>;
    const html = call.html as string;
    const text = call.text as string;
    // The review URL should be embedded in both HTML and plain text
    expect(html).toContain("/review/");
    expect(text).toContain("/review/");
  });

  it("logs notification_log entry with external_id from Resend response", async () => {
    let insertedRow: Record<string, unknown> | null = null;
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "coaches") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: "coach@example.com", name: "Test Coach" },
            error: null,
          }),
        };
      }
      if (table === "drafts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "draft-1", review_token_nonce: "nonce-1", body: "body", subject: "subject" },
            error: null,
          }),
        };
      }
      if (table === "notification_log") {
        return {
          insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
            insertedRow = row;
            return Promise.resolve({ data: [{ id: "log-1" }], error: null });
          }),
        };
      }
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    const result = await sendEmail({
      coachId: "coach-1",
      eventType: "draft_ready",
      payload: {
        draftId: "draft-1",
        leadName: "Carol",
        sendTime: "3:00 PM",
        confidenceLevel: "high",
      },
    });

    expect(result.external_id).toBe("test-email-id");
    expect(result.status).toBe("sent");
    expect(insertedRow).not.toBeNull();
    const row = insertedRow as unknown as Record<string, unknown>;
    expect(row["external_id"]).toBe("test-email-id");
    expect(row["status"]).toBe("sent");
    expect(row["channel"]).toBe("email");
  });

  it("logs notification_log with status='failed' and does NOT throw on Resend error", async () => {
    let insertedRow: Record<string, unknown> | null = null;

    mockResend.emails.send.mockResolvedValueOnce({
      data: null,
      error: { message: "rate_limit_exceeded" },
    });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "coaches") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: "coach@example.com", name: "Test Coach" },
            error: null,
          }),
        };
      }
      if (table === "drafts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "draft-1", review_token_nonce: "nonce-1", body: "body", subject: "sub" },
            error: null,
          }),
        };
      }
      if (table === "notification_log") {
        return {
          insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
            insertedRow = row;
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    // Must NOT throw
    const result = await sendEmail({
      coachId: "coach-1",
      eventType: "draft_ready",
      payload: { draftId: "draft-1", leadName: "Dave", sendTime: "4:00 PM" },
    });

    expect(result.status).toBe("failed");
    expect(result.external_id).toBeNull();
    expect(insertedRow).not.toBeNull();
    expect((insertedRow as unknown as Record<string, unknown>)["status"]).toBe("failed");
  });

  it("confidence pill present in HTML when confidenceLevel === 'low'", () => {
    const { html } = buildDraftReadyEmail({
      leadName: "Eve",
      subject: "Subject",
      body: "Body",
      sendTime: "5:00 PM",
      confidenceLevel: "low",
      reviewUrl: "https://app.sonorous.com/review/token",
      settingsUrl: "https://app.sonorous.com/settings",
      unsubscribeUrl: "https://app.sonorous.com/unsubscribe",
    });
    expect(html).toContain("Voice model has limited examples");
    // Warm amber colors only — no neon green, no dark purple
    expect(html).not.toContain("#00FF00");
    expect(html).not.toContain("#00ff00");
    expect(html).not.toContain("#1a0033");
  });

  it("subject is exactly 'Draft ready for {lead_name}' for draft_ready", () => {
    const { subject } = buildDraftReadyEmail({
      leadName: "Frank",
      subject: "Sub",
      body: "Body",
      sendTime: "now",
      confidenceLevel: "high",
      reviewUrl: "https://example.com",
      settingsUrl: "https://example.com/settings",
      unsubscribeUrl: "https://example.com/unsub",
    });
    expect(subject).toBe("Draft ready for Frank");
  });

  it("subject is exactly 'Reminder: draft for {lead_name} still waiting' for followup", () => {
    const { subject } = buildDraftFollowupEmail({
      leadName: "Grace",
      subject: "Sub",
      body: "Body",
      sendTime: "now",
      confidenceLevel: "high",
      reviewUrl: "https://example.com",
      settingsUrl: "https://example.com/settings",
      unsubscribeUrl: "https://example.com/unsub",
    });
    expect(subject).toBe("Reminder: draft for Grace still waiting");
  });
});
