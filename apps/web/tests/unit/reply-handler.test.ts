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
    sendEvent: vi.fn(async () => undefined),
  };
}

const event = {
  name: "lead/replied",
  data: { coachId: "c1", leadId: "l1", messageId: "m1" },
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
  it("generates a reply draft and emits notification/lead_replied when pending", async () => {
    mockGen.mockResolvedValue({
      ok: true,
      draftId: "d1",
      leadName: "Reply Lead",
      status: "pending",
      confidenceLevel: "high",
    });
    const step = makeStep();

    const res = await invoke(step);

    // Regression guard: a reply must actually generate a draft (the old code
    // fired an orphaned "draft/generate" event with no consumer).
    expect(mockGen).toHaveBeenCalledWith({ coachId: "c1", leadId: "l1" });

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
    expect(res.notified).toBe(true);
  });

  it("does NOT notify when the draft auto-approves (mode_a)", async () => {
    mockGen.mockResolvedValue({
      ok: true,
      draftId: "d2",
      leadName: "Reply Lead",
      status: "approved",
      confidenceLevel: "high",
    });
    const step = makeStep();

    await invoke(step);

    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  it("does NOT notify when generation fails", async () => {
    mockGen.mockResolvedValue({ ok: false, reason: "ai_error" });
    const step = makeStep();

    const res = await invoke(step);

    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(res.draftGenerated).toBe(false);
  });
});
