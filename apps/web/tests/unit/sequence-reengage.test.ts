import { describe, it, expect, vi, beforeEach } from "vitest";

// Replace the AI/DB-backed generator; the handler's job is to pace and route it.
vi.mock("@/lib/drafts/generate-reengagement", () => ({
  generateReengagementDraft: vi.fn(),
}));

// Table-aware adminClient stub. The handler reads coaches (config + mode), leads
// (status), and drafts (pending count), and writes leads/sequences/lead_events.
// A mutable `state` object lets each test script those reads.
const state = {
  config: { reengage_silence_days: 3, reengage_max_attempts: 2 } as Record<string, unknown>,
  mode: "off" as string,
  leadStatus: "replied" as string,
  pendingCount: 0 as number,
};

vi.mock("@/lib/supabase/admin", () => {
  const tableRow = (table: string): unknown => {
    if (table === "coaches") return { sequence_config: state.config, autonomous_mode: state.mode };
    if (table === "leads") return { status: state.leadStatus };
    return null;
  };
  const from = vi.fn((table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const chain: any = {};
    for (const m of ["select", "update", "insert", "eq", "order", "limit", "is"]) {
      chain[m] = vi.fn(() => chain);
    }
    chain.maybeSingle = vi.fn(async () => ({ data: tableRow(table), error: null }));
    chain.single = vi.fn(async () => ({ data: tableRow(table), error: null }));
    // Awaited builders: the drafts pending-count query reads `count`; writes read `data`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable stub
    chain.then = (resolve: any) =>
      resolve(
        table === "drafts"
          ? { data: null, error: null, count: state.pendingCount }
          : { data: null, error: null },
      );
    return chain;
  });
  return { adminClient: { from } };
});

import { generateReengagementDraft } from "@/lib/drafts/generate-reengagement";
import { sequenceReengageHandler } from "@/inngest/functions/sequence-reengage";
import { adminClient } from "@/lib/supabase/admin";

const mockGen = vi.mocked(generateReengagementDraft);

function makeStep() {
  return {
    run: vi.fn(async (_id: string, fn: () => unknown) => fn()),
    sleep: vi.fn(async (_id: string, _duration: string) => undefined),
    sendEvent: vi.fn(async (_id: string, _ev: unknown) => ({ ids: [] as string[] })),
  };
}

const event = { name: "lead/replied", data: { coachId: "c1", leadId: "l1" } };

function invoke(step: ReturnType<typeof makeStep>) {
  return sequenceReengageHandler({
    event,
    step,
  } as unknown as Parameters<typeof sequenceReengageHandler>[0]);
}

beforeEach(() => {
  mockGen.mockReset();
  state.config = { reengage_silence_days: 3, reengage_max_attempts: 2 };
  state.mode = "off";
  state.leadStatus = "replied";
  state.pendingCount = 0;
  vi.mocked(adminClient.from).mockClear();
});

describe("sequenceReengageHandler — silence-gated re-engagement", () => {
  it("waits the silence window, nudges each attempt, then closes the lead", async () => {
    mockGen.mockResolvedValue({
      ok: true,
      draftId: "d1",
      leadName: "Quiet Lead",
      status: "pending",
      confidenceLevel: "high",
    });
    const step = makeStep();

    const res = await invoke(step);

    // maxAttempts = 2 → two silence sleeps and two generated nudges.
    expect(step.sleep).toHaveBeenCalledTimes(2);
    expect(mockGen).toHaveBeenCalledTimes(2);
    expect(mockGen).toHaveBeenNthCalledWith(1, {
      coachId: "c1",
      leadId: "l1",
      attempt: 1,
      maxAttempts: 2,
    });
    expect(mockGen).toHaveBeenNthCalledWith(2, {
      coachId: "c1",
      leadId: "l1",
      attempt: 2,
      maxAttempts: 2,
    });

    // Manual mode dispatches the draft_ready notification for each nudge.
    const notified = step.sendEvent.mock.calls.filter(
      ([, ev]) => (ev as { name: string }).name === "notification/draft_ready",
    );
    expect(notified.length).toBe(2);

    // Exhausted → lead marked lost.
    expect(vi.mocked(adminClient.from)).toHaveBeenCalledWith("sequences");
    expect(res).toEqual({ completed: true, attempts: 2 });
  });

  it("stops without nudging when the lead is no longer in 'replied'", async () => {
    state.leadStatus = "converted";
    const step = makeStep();

    const res = await invoke(step);

    expect(mockGen).not.toHaveBeenCalled();
    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(res).toEqual({ stopped: true, attempt: 1, reason: "status:converted" });
  });

  it("stops when the coach is still sitting on a pending draft", async () => {
    state.pendingCount = 1;
    const step = makeStep();

    const res = await invoke(step);

    expect(mockGen).not.toHaveBeenCalled();
    expect(res).toEqual({ stopped: true, attempt: 1, reason: "draft_pending" });
  });

  it("auto-sends each nudge under mode_a", async () => {
    state.mode = "mode_a";
    state.config = { reengage_silence_days: 3, reengage_max_attempts: 1 };
    mockGen.mockResolvedValue({
      ok: true,
      draftId: "d9",
      leadName: "Quiet Lead",
      status: "approved",
      confidenceLevel: "high",
    });
    const step = makeStep();

    await invoke(step);

    const sent = step.sendEvent.mock.calls.filter(
      ([, ev]) => (ev as { name: string }).name === "draft/send_via_gmail",
    );
    expect(sent.length).toBe(1);
  });

  it("stops if a nudge fails to generate", async () => {
    mockGen.mockResolvedValue({ ok: false, reason: "no_voice_model" });
    const step = makeStep();

    const res = await invoke(step);

    expect(res).toEqual({
      stopped: true,
      attempt: 1,
      reason: "generate_failed:no_voice_model",
    });
  });
});
