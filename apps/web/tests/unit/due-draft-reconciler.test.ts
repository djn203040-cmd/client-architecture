import { beforeEach, describe, expect, it, vi } from "vitest";

// #83, the reconciler finds coach-approved sequence drafts whose fixed send
// time has passed but which never went out (a lost Inngest timer), and re-emits
// the single send event. Idempotency lives in send-via-gmail (skips status='sent'),
// so here we assert the selection predicate and that each stranded draft emits
// exactly one send.

const state = {
  stranded: [] as Array<{ id: string; coach_id: string }>,
};

// Capture the query builder so we can assert the filter predicate.
const calls = {
  in: vi.fn(),
  not: vi.fn(),
  lte: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => {
  const from = vi.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.in = vi.fn((col: string, vals: string[]) => {
      calls.in(col, vals);
      return chain;
    });
    chain.not = vi.fn((col: string, op: string, val: unknown) => {
      calls.not(col, op, val);
      return chain;
    });
    chain.lte = vi.fn((col: string, val: unknown) => {
      calls.lte(col, val);
      return chain;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable stub
    chain.then = (resolve: any) => resolve({ data: state.stranded, error: null });
    return chain;
  });
  return { adminClient: { from } };
});

import { dueDraftReconcilerHandler } from "@/inngest/functions/due-draft-reconciler";

function makeStep() {
  return {
    run: vi.fn(async (_id: string, fn: () => unknown) => fn()),
    sendEvent: vi.fn(async (_id: string, _ev: unknown) => ({ ids: [] as string[] })),
  };
}

function invoke(step: ReturnType<typeof makeStep>) {
  return dueDraftReconcilerHandler({
    event: { name: "cron/reconcile_due_sends", data: {} },
    step,
  } as unknown as Parameters<typeof dueDraftReconcilerHandler>[0]);
}

beforeEach(() => {
  state.stranded = [];
  vi.clearAllMocks();
});

describe("dueDraftReconcilerHandler", () => {
  it("selects only approved/edited drafts that are past their scheduled_send_at", async () => {
    await invoke(makeStep());
    expect(calls.in).toHaveBeenCalledWith("status", ["approved", "edited"]);
    expect(calls.not).toHaveBeenCalledWith("scheduled_send_at", "is", null);
    expect(calls.lte.mock.calls[0]?.[0]).toBe("scheduled_send_at");
  });

  it("emits exactly one send per stranded draft with source=sequence_scheduled", async () => {
    state.stranded = [
      { id: "d1", coach_id: "c1" },
      { id: "d2", coach_id: "c2" },
    ];
    const step = makeStep();

    const res = await invoke(step);

    const sends = step.sendEvent.mock.calls.filter(
      ([, ev]) => (ev as { name: string }).name === "draft/send_via_gmail",
    );
    expect(sends).toHaveLength(2);
    expect((sends[0]![1] as { data: unknown }).data).toEqual({
      draftId: "d1",
      coachId: "c1",
      source: "sequence_scheduled",
    });
    expect(res).toEqual({ stranded: 2 });
  });

  it("does nothing when no drafts are stranded", async () => {
    const step = makeStep();
    const res = await invoke(step);
    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(res).toEqual({ stranded: 0 });
  });
});
