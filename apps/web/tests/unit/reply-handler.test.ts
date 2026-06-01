import { describe, it, expect, vi, beforeEach } from "vitest";

// Fully replace the draft generator — the handler's job is to call it and route
// the result, not to run real AI/DB. vi.mock is hoisted, so this also keeps
// generate-reply's `server-only` + adminClient imports from ever executing.
vi.mock("@/lib/drafts/generate-reply", () => ({
  generateReplyDraft: vi.fn(),
}));

// adminClient is hit directly by steps 1–3 (update lead, pause sequence, cancel
// drafts). A chainable stub is enough: every builder method returns the same
// object, terminal reads resolve to benign data, and the builder is awaitable so
// `await adminClient.from(...).update(...).eq(...)` resolves. Inlined in the
// factory because vi.mock is hoisted above module-scope declarations.
vi.mock("@/lib/supabase/admin", () => {
  const makeChain = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const chain: any = {};
    for (const m of ["select", "update", "insert", "eq", "order", "limit"]) {
      chain[m] = vi.fn(() => chain);
    }
    chain.single = vi.fn(async () => ({ data: { status: "in_sequence" }, error: null }));
    chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable stub
    chain.then = (resolve: any) => resolve({ data: null, error: null });
    return chain;
  };
  return { adminClient: { from: vi.fn(() => makeChain()) } };
});

import { generateReplyDraft } from "@/lib/drafts/generate-reply";
import { replyHandlerFn } from "@/inngest/functions/reply-handler";

const mockGen = vi.mocked(generateReplyDraft);

function makeStep() {
  return {
    run: vi.fn(async (_id: string, fn: () => unknown) => fn()),
    sendEvent: vi.fn(async (_id: string, _ev: unknown) => undefined),
  };
}

const event = {
  name: "lead/replied",
  data: { coachId: "c1", leadId: "l1", messageId: "m1", threadId: "t1" },
};

function invoke(step: ReturnType<typeof makeStep>) {
  // Cast through unknown: the vitest step mock is structurally compatible but its
  // run() returns Promise<unknown> rather than the handler's generic Promise<T>.
  return replyHandlerFn({ event, step } as unknown as Parameters<typeof replyHandlerFn>[0]);
}

beforeEach(() => {
  mockGen.mockReset();
});

describe("replyHandlerFn — STATE-005 reply pipeline", () => {
  it("generates a reply draft and emits notification/lead_replied when pending (manual)", async () => {
    mockGen.mockResolvedValue({
      ok: true,
      draftId: "d1",
      leadName: "Reply Lead",
      status: "pending",
      confidenceLevel: "high",
      autonomousMode: "off",
    });
    const step = makeStep();

    const res = await invoke(step);

    // Regression guard: a reply must actually generate a draft (the old code
    // fired an orphaned "draft/generate" event with no consumer), and it must
    // forward the triggering message/thread so the draft answers THAT message.
    expect(mockGen).toHaveBeenCalledWith({
      coachId: "c1",
      leadId: "l1",
      messageId: "m1",
      threadId: "t1",
    });

    expect(step.sendEvent).toHaveBeenCalledWith(
      "notify-lead-replied",
      expect.objectContaining({
        name: "notification/lead_replied",
        data: expect.objectContaining({
          coachId: "c1",
          eventType: "lead_replied",
          payload: expect.objectContaining({
            draftId: "d1",
            leadName: "Reply Lead",
            confidenceLevel: "high",
          }),
        }),
      }),
    );
    // Manual mode never auto-sends.
    const sentManual = step.sendEvent.mock.calls.some(
      ([, ev]) => (ev as { name: string }).name === "draft/send_via_gmail",
    );
    expect(sentManual).toBe(false);
    expect(res.notified).toBe(true);
    expect(res.sent).toBe(false);
  });

  it("auto-sends (and does NOT notify) when the draft auto-approves (mode_a)", async () => {
    mockGen.mockResolvedValue({
      ok: true,
      draftId: "d2",
      leadName: "Reply Lead",
      status: "approved",
      confidenceLevel: "high",
      autonomousMode: "mode_a",
    });
    const step = makeStep();

    const res = await invoke(step);

    // Regression guard for the latent bug: an auto-approved reply must actually
    // be sent (it used to be marked approved and then silently never sent).
    expect(step.sendEvent).toHaveBeenCalledWith(
      "send-reply-mode-a",
      expect.objectContaining({
        name: "draft/send_via_gmail",
        data: expect.objectContaining({ draftId: "d2", coachId: "c1", source: "mode_a" }),
      }),
    );
    // Nothing to review → no reply notification.
    const notifiedA = step.sendEvent.mock.calls.some(
      ([, ev]) => (ev as { name: string }).name === "notification/lead_replied",
    );
    expect(notifiedA).toBe(false);
    expect(res.sent).toBe(true);
    expect(res.notified).toBe(false);
  });

  it("notifies AND arms the 24h auto-send timer for mode_b", async () => {
    mockGen.mockResolvedValue({
      ok: true,
      draftId: "d3",
      leadName: "Reply Lead",
      status: "pending",
      confidenceLevel: "high",
      autonomousMode: "mode_b",
    });
    const step = makeStep();

    const res = await invoke(step);

    expect(step.sendEvent).toHaveBeenCalledWith(
      "notify-lead-replied",
      expect.objectContaining({ name: "notification/lead_replied" }),
    );
    expect(step.sendEvent).toHaveBeenCalledWith(
      "arm-reply-mode-b",
      expect.objectContaining({
        name: "draft/created_mode_b",
        data: expect.objectContaining({ draftId: "d3", coachId: "c1" }),
      }),
    );
    expect(res.notified).toBe(true);
    expect(res.sent).toBe(false);
  });

  it("does NOT notify when generation fails", async () => {
    mockGen.mockResolvedValue({ ok: false, reason: "ai_error" });
    const step = makeStep();

    const res = await invoke(step);

    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(res.draftGenerated).toBe(false);
  });
});
