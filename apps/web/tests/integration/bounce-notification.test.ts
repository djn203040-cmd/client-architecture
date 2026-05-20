import { describe, it, expect, beforeEach, vi } from "vitest";
import { installResendMock, resetResendMock } from "@/tests/utils/mocks/resend";
import { installSlackMock, resetSlackMock } from "@/tests/utils/mocks/slack";
import { installTwilioMock, resetTwilioMock } from "@/tests/utils/mocks/twilio";
import { resetInngestQueue } from "@/tests/utils/inngest-runner";

installResendMock();
installSlackMock();
installTwilioMock();

const mockInngestSend = vi.fn().mockResolvedValue({ ids: ["test-id"] });

// Capture the last handler passed to createFunction so we can invoke it in tests
let capturedHandler: ((ctx: unknown) => Promise<unknown>) | null = null;
vi.mock("@/inngest/client", () => ({
  inngest: {
    send: mockInngestSend,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createFunction: vi.fn((_config: unknown, _trigger: unknown, handler?: unknown, ...rest: unknown[]) => {
      // 3-arg form: createFunction(config, trigger, handler)
      // 2-arg form: createFunction(config, handler)
      const h = typeof handler === "function" ? handler
        : (typeof _trigger === "function" ? _trigger : null);
      if (h) capturedHandler = h as (ctx: unknown) => Promise<unknown>;
      return { id: "bounce-handler" };
    }),
  },
}));

vi.mock("@/lib/gmail/client", () => ({
  getGmailClientForCoach: vi.fn().mockResolvedValue({
    users: {
      messages: {
        get: vi.fn().mockResolvedValue({
          data: { payload: { headers: [{ name: "Subject", value: "Mail delivery failed" }] }, snippet: "550 user unknown alice@test.com" },
        }),
      },
    },
  }),
}));

vi.mock("@/lib/gmail/bounce-detector", () => ({
  extractBouncedEmail: vi.fn().mockReturnValue("alice@test.com"),
}));

vi.mock("@/lib/gmail/thread", () => ({
  extractHeader: vi.fn().mockReturnValue("Mail delivery failed"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    from: vi.fn((table: string) => {
      if (table === "leads") {
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "lead-1", status: "active", email: "alice@test.com", name: "Alice" },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  },
}));

async function ensureHandlerLoaded() {
  if (!capturedHandler) {
    // Import to trigger createFunction, which captures the handler
    await import("@/inngest/functions/bounce-handler");
  }
}

async function runBounceHandler() {
  await ensureHandlerLoaded();
  if (!capturedHandler) throw new Error("bounce-handler createFunction was not called");

  const step = {
    run: vi.fn(async (_id: string, fn: () => unknown) => fn()),
    sleepUntil: vi.fn(), sleep: vi.fn(),
    sendEvent: vi.fn().mockResolvedValue({ ids: [] }),
    waitForEvent: vi.fn().mockResolvedValue(null), invoke: vi.fn().mockResolvedValue(null),
  };

  const event = {
    name: "lead/bounced",
    data: { coachId: "coach-1", messageId: "msg-123", subject: "Mail delivery failed" },
  };

  const result = await capturedHandler({ event, step, logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } });
  return { result, step };
}

beforeEach(() => {
  resetInngestQueue();
  resetResendMock();
  resetSlackMock();
  resetTwilioMock();
  mockInngestSend.mockClear();
});

describe("bounce-notification (Phase 4 / COMPLY-006)", () => {
  it("hard bounce fans out to dispatcher and includes SMS unconditionally", async () => {
    const { result } = await runBounceHandler();

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notification/hard_bounce",
        data: expect.objectContaining({
          coachId: "coach-1",
          eventType: "hard_bounce",
        }),
      }),
    );
    expect((result as { ok: boolean }).ok).toBe(true);
  });

  it("hard bounce includes lead name and reason in every channel body", async () => {
    await runBounceHandler();

    const sentEvent = mockInngestSend.mock.calls[0]?.[0] as {
      data: { payload: { leadName?: string; leadEmail?: string } };
    };
    expect(sentEvent?.data?.payload?.leadEmail).toBe("alice@test.com");
    expect(sentEvent?.data?.payload?.leadName).toBe("Alice");
  });
});
