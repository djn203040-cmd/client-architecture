import { describe, it, expect, beforeEach, vi } from "vitest";
import { installResendMock, resetResendMock } from "@/tests/utils/mocks/resend";
import { installSlackMock, resetSlackMock } from "@/tests/utils/mocks/slack";
import { installTwilioMock, resetTwilioMock } from "@/tests/utils/mocks/twilio";
import { resetInngestQueue } from "@/tests/utils/inngest-runner";

installResendMock();
installSlackMock();
installTwilioMock();

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      data: [],
    })),
  },
}));

const mockSendDashboard = vi.fn().mockResolvedValue({ channel: "dashboard", status: "sent", external_id: "d1", error_message: null });
const mockSendEmail     = vi.fn().mockResolvedValue({ channel: "email",     status: "sent", external_id: "e1", error_message: null });
const mockSendSlack     = vi.fn().mockResolvedValue({ channel: "slack",     status: "sent", external_id: "s1", error_message: null });
const mockSendWhatsApp  = vi.fn().mockResolvedValue({ channel: "whatsapp",  status: "sent", external_id: "w1", error_message: null });
const mockSendSMS       = vi.fn().mockResolvedValue({ channel: "sms",       status: "sent", external_id: "sms1", error_message: null });

vi.mock("@/lib/notifications/channels/dashboard", () => ({ sendDashboard: mockSendDashboard }));
vi.mock("@/lib/notifications/channels/email",     () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/notifications/channels/slack",     () => ({ sendSlack: mockSendSlack }));
vi.mock("@/lib/notifications/channels/whatsapp",  () => ({ sendWhatsApp: mockSendWhatsApp }));
vi.mock("@/lib/notifications/channels/sms",       () => ({ sendSMS: mockSendSMS }));

const mockComputeEnabledChannels = vi.fn();
vi.mock("@/lib/notifications/dispatcher", () => ({
  computeEnabledChannels: mockComputeEnabledChannels,
  CHANNELS_FOR_HARD_BOUNCE_UNCONDITIONAL: ["sms"],
}));

const allEnabled = { dashboard: true, email: true, slack: true, whatsapp: true, sms: true };

beforeEach(() => {
  resetInngestQueue();
  resetResendMock();
  resetSlackMock();
  resetTwilioMock();
  mockSendDashboard.mockClear();
  mockSendEmail.mockClear();
  mockSendSlack.mockClear();
  mockSendWhatsApp.mockClear();
  mockSendSMS.mockClear();
  mockComputeEnabledChannels.mockClear();
  // Default: reset to happy-path success
  mockSendDashboard.mockResolvedValue({ channel: "dashboard", status: "sent", external_id: "d1", error_message: null });
  mockSendEmail.mockResolvedValue({ channel: "email", status: "sent", external_id: "e1", error_message: null });
  mockSendSlack.mockResolvedValue({ channel: "slack", status: "sent", external_id: "s1", error_message: null });
  mockSendWhatsApp.mockResolvedValue({ channel: "whatsapp", status: "sent", external_id: "w1", error_message: null });
  mockSendSMS.mockResolvedValue({ channel: "sms", status: "sent", external_id: "sms1", error_message: null });
});

async function runDispatcher(eventName: string, data: Record<string, unknown>) {
  const { notificationDispatcher } = await import("@/inngest/functions/notification-dispatcher");
  const fn = notificationDispatcher as unknown as { fn?: (ctx: unknown) => Promise<unknown> };

  const stepLog: string[] = [];
  const step = {
    run: vi.fn(async (id: string, fn: () => unknown) => {
      stepLog.push(id);
      return fn();
    }),
    sleepUntil: vi.fn(),
    sleep: vi.fn(),
    sendEvent: vi.fn().mockResolvedValue({ ids: [] }),
    waitForEvent: vi.fn().mockResolvedValue(null),
    invoke: vi.fn().mockResolvedValue(null),
  };

  const handler = fn.fn ?? (typeof notificationDispatcher === "function" ? notificationDispatcher : null);
  if (!handler) throw new Error("no handler on notificationDispatcher");

  const result = await handler({ event: { name: eventName, data }, step, logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } });
  return { result, step, stepLog };
}

describe("notification-dispatcher (Phase 4 / DRAFT-001 + DRAFT-002 + NOTIFY-006)", () => {
  it("fires draft_ready event 24h before scheduled send", async () => {
    mockComputeEnabledChannels.mockResolvedValue({ dashboard: true, email: false, slack: false, whatsapp: false, sms: false });

    const { step } = await runDispatcher("notification/draft_ready", {
      coachId: "coach-1", eventType: "draft_ready",
      payload: { draftId: "d-1", leadName: "Alice" },
    });

    expect(step.run).toHaveBeenCalledWith("compute-enabled-channels", expect.any(Function));
    expect(step.run).toHaveBeenCalledWith("send-dashboard", expect.any(Function));
    expect(mockSendDashboard).toHaveBeenCalledOnce();
  });

  it("fans out to all enabled notification channels for the coach", async () => {
    mockComputeEnabledChannels.mockResolvedValue(allEnabled);

    const { result } = await runDispatcher("notification/draft_ready", {
      coachId: "coach-2", eventType: "draft_ready",
      payload: { draftId: "d-2", leadName: "Bob" },
    });

    expect(mockSendDashboard).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendSlack).toHaveBeenCalledOnce();
    expect(mockSendWhatsApp).toHaveBeenCalledOnce();
    expect(mockSendSMS).toHaveBeenCalledOnce();
    expect((result as { dispatched: number }).dispatched).toBe(5);
  });

  it("dispatches all channels in parallel (Promise.allSettled, not serial)", async () => {
    mockComputeEnabledChannels.mockResolvedValue(allEnabled);
    // Make slack throw — Promise.allSettled means others still succeed
    mockSendSlack.mockRejectedValue(new Error("slack_down"));

    const { result } = await runDispatcher("notification/draft_ready", {
      coachId: "coach-3", eventType: "draft_ready",
      payload: { draftId: "d-3", leadName: "Carol" },
    });

    expect(mockSendDashboard).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendSMS).toHaveBeenCalledOnce();
    const results = (result as { results: { status: string }[] }).results;
    expect(results.some((r) => r.status === "rejected")).toBe(true);
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);
  });

  it("filters channels per coach preferences before dispatch", async () => {
    mockComputeEnabledChannels.mockResolvedValue({
      dashboard: true, email: true, slack: false, whatsapp: false, sms: false,
    });

    const { result } = await runDispatcher("notification/draft_ready", {
      coachId: "coach-4", eventType: "draft_ready",
      payload: { draftId: "d-4", leadName: "Dave" },
    });

    expect(mockSendDashboard).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendSlack).not.toHaveBeenCalled();
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(mockSendSMS).not.toHaveBeenCalled();
    expect((result as { dispatched: number }).dispatched).toBe(2);
  });

  it("isolates a single channel failure from the others", async () => {
    mockComputeEnabledChannels.mockResolvedValue(allEnabled);
    mockSendEmail.mockRejectedValue(new Error("email_quota_exceeded"));

    await runDispatcher("notification/draft_ready", {
      coachId: "coach-5", eventType: "draft_ready",
      payload: { draftId: "d-5", leadName: "Eve" },
    });

    expect(mockSendDashboard).toHaveBeenCalledOnce();
    expect(mockSendSlack).toHaveBeenCalledOnce();
    expect(mockSendWhatsApp).toHaveBeenCalledOnce();
    expect(mockSendSMS).toHaveBeenCalledOnce();
  });

  it("uses distinct step ids per channel (Pitfall 8 mitigation)", async () => {
    mockComputeEnabledChannels.mockResolvedValue(allEnabled);

    const { stepLog } = await runDispatcher("notification/draft_ready", {
      coachId: "coach-6", eventType: "draft_ready",
      payload: { draftId: "d-6", leadName: "Frank" },
    });

    const channelIds = stepLog.filter((id) => id.startsWith("send-"));
    const uniqueIds = new Set(channelIds);
    expect(uniqueIds.size).toBe(channelIds.length);
    expect(uniqueIds).toContain("send-dashboard");
    expect(uniqueIds).toContain("send-email");
    expect(uniqueIds).toContain("send-slack");
    expect(uniqueIds).toContain("send-whatsapp");
    expect(uniqueIds).toContain("send-sms");
  });
});
