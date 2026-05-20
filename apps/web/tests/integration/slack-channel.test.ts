import { describe, it, beforeEach, expect, vi } from "vitest";
import { installSlackMock, resetSlackMock, mockWebClient } from "@/tests/utils/mocks/slack";

installSlackMock();

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    from: vi.fn(),
  },
}));

// Mock the Slack client factory so tests don't need vault/integration DB reads
vi.mock("@/lib/slack/client", () => ({
  getSlackClientForCoach: vi.fn(async () => mockWebClient),
  evictSlackClientCache: vi.fn(),
}));

import { adminClient } from "@/lib/supabase/admin";
import { sendSlack } from "@/lib/notifications/channels/slack";

const mockAdminClient = adminClient as unknown as {
  from: ReturnType<typeof vi.fn>;
};

const DRAFT_ID = "draft-1";
const COACH_ID = "coach-1";

function setupDefaultMocks(confidenceLevel: "high" | "low" = "high") {
  mockAdminClient.from.mockImplementation((table: string) => {
    if (table === "integrations") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            external_account_id: "U-test",
            status: "connected",
          },
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
            id: DRAFT_ID,
            body: "Hi there, following up on our call.",
            subject: "Quick follow-up",
            confidence_level: confidenceLevel,
            scheduled_send_at: "2026-05-20T10:00:00Z",
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
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetSlackMock();
  process.env["NEXT_PUBLIC_APP_URL"] = "https://app.sonorous.com";
});

describe("slack-channel (Phase 4 / NOTIFY-003)", () => {
  it("posts a Block Kit message with the expected block structure", async () => {
    setupDefaultMocks();

    const result = await sendSlack({
      coachId: COACH_ID,
      eventType: "draft_ready",
      payload: { draftId: DRAFT_ID, leadName: "Alice", sendTime: "10:00 AM" },
    });

    expect(mockWebClient.chat.postMessage).toHaveBeenCalledOnce();
    const call = mockWebClient.chat.postMessage.mock.calls[0]![0] as Record<string, unknown>;

    // Posts to authed user DM channel
    expect(call.channel).toBe("U-test");

    // Has blocks array
    const blocks = call.blocks as unknown[];
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);

    // Header block
    const header = blocks.find(
      (b) => (b as Record<string, unknown>).type === "header",
    ) as Record<string, unknown> | undefined;
    expect(header).toBeDefined();

    // Section block with full draft body (DRAFT-013: never truncated)
    const section = blocks.find(
      (b) => (b as Record<string, unknown>).type === "section",
    ) as Record<string, unknown> | undefined;
    expect(section).toBeDefined();
    const sectionText = (section?.text as Record<string, unknown>)?.text as string;
    expect(sectionText).toContain("Quick follow-up");
    expect(sectionText).toContain("Hi there, following up on our call.");

    expect(result.status).toBe("sent");
    expect(result.channel).toBe("slack");
  });

  it("includes Approve / Edit / Hold action buttons with draft_id payload", async () => {
    setupDefaultMocks();

    await sendSlack({
      coachId: COACH_ID,
      eventType: "draft_ready",
      payload: { draftId: DRAFT_ID, leadName: "Bob", sendTime: "11:00 AM" },
    });

    const call = mockWebClient.chat.postMessage.mock.calls[0]![0] as Record<string, unknown>;
    const blocks = call.blocks as Array<Record<string, unknown>>;

    const actionsBlock = blocks.find((b) => b.type === "actions");
    expect(actionsBlock).toBeDefined();

    const elements = (actionsBlock?.elements as Array<Record<string, unknown>>) ?? [];
    expect(elements).toHaveLength(3);

    const approve = elements.find((e) => e.action_id === "draft_approve");
    const edit = elements.find((e) => e.action_id === "draft_edit");
    const hold = elements.find((e) => e.action_id === "draft_hold");

    expect(approve?.style).toBe("primary");
    expect(approve?.value).toBe(DRAFT_ID);

    expect(edit?.value).toBe(DRAFT_ID);

    expect(hold?.style).toBe("danger");
    expect(hold?.confirm).toBeDefined();
  });

  it("confidence badge only rendered when confidence_level === 'low'", async () => {
    // High confidence — no warning badge
    setupDefaultMocks("high");
    await sendSlack({
      coachId: COACH_ID,
      eventType: "draft_ready",
      payload: { draftId: DRAFT_ID, leadName: "Carol" },
    });

    const highBlocks = (
      mockWebClient.chat.postMessage.mock.calls[0]![0] as Record<string, unknown>
    ).blocks as Array<Record<string, unknown>>;
    const contextBlocks = highBlocks.filter((b) => b.type === "context");
    const hasWarning = contextBlocks.some((b) => {
      const els = b.elements as Array<Record<string, unknown>>;
      return els?.some((e) => (e.text as string)?.includes("limited examples"));
    });
    expect(hasWarning).toBe(false);

    vi.clearAllMocks();
    resetSlackMock();

    // Low confidence — badge present
    setupDefaultMocks("low");
    await sendSlack({
      coachId: COACH_ID,
      eventType: "draft_ready",
      payload: { draftId: DRAFT_ID, leadName: "Dave" },
    });

    const lowBlocks = (
      mockWebClient.chat.postMessage.mock.calls[0]![0] as Record<string, unknown>
    ).blocks as Array<Record<string, unknown>>;
    const lowContextBlocks = lowBlocks.filter((b) => b.type === "context");
    const hasWarningLow = lowContextBlocks.some((b) => {
      const els = b.elements as Array<Record<string, unknown>>;
      return els?.some((e) => (e.text as string)?.includes("limited examples"));
    });
    expect(hasWarningLow).toBe(true);
  });

  it("logs the resulting ts + channel into notification_log", async () => {
    let insertedRow: Record<string, unknown> | null = null;

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { external_account_id: "U-test", status: "connected" },
            error: null,
          }),
        };
      }
      if (table === "drafts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: DRAFT_ID, body: "body", subject: "sub", confidence_level: "high", scheduled_send_at: null },
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
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const result = await sendSlack({
      coachId: COACH_ID,
      eventType: "draft_ready",
      payload: { draftId: DRAFT_ID, leadName: "Eve" },
    });

    expect(result.status).toBe("sent");
    expect(result.external_id).toBe("test-ts");
    expect(insertedRow).not.toBeNull();
    const row = insertedRow as unknown as Record<string, unknown>;
    expect(row["external_id"]).toBe("test-ts");
    expect(row["status"]).toBe("sent");
    expect(row["channel"]).toBe("slack");
  });

  it("logs status='failed' and does NOT throw on Slack API error", async () => {
    let insertedRow: Record<string, unknown> | null = null;

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { external_account_id: "U-test", status: "connected" },
            error: null,
          }),
        };
      }
      if (table === "drafts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: DRAFT_ID, body: "body", subject: "sub", confidence_level: "high", scheduled_send_at: null },
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
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    mockWebClient.chat.postMessage.mockResolvedValueOnce({
      ok: false,
      error: "not_in_channel",
      ts: undefined,
    });

    const result = await sendSlack({
      coachId: COACH_ID,
      eventType: "draft_ready",
      payload: { draftId: DRAFT_ID, leadName: "Frank" },
    });

    expect(result.status).toBe("failed");
    expect(result.external_id).toBeNull();
    expect(result.error_message).toContain("slack_post_failed");
    expect(insertedRow).not.toBeNull();
    expect((insertedRow as unknown as Record<string, unknown>)["status"]).toBe("failed");
  });
});
