import { beforeEach, describe, expect, it, vi } from "vitest";

// #83, the reconciler finds coach-approved sequence drafts whose fixed send
// time has passed but which never went out (a lost Inngest timer), and re-emits
// the single send event. Idempotency lives in send-via-gmail's atomic claim
// (#139), so here we assert the selection predicate and that each stranded draft
// emits exactly one send.
//
// #139 also added a second sweep: drafts stuck in the transient `sending` status
// because the send crashed past its retries. Those are resolved from
// email_events (the send was witnessed → finish the bookkeeping) or left alone
// and logged (unwitnessed → a human must check Gmail before any resend).

type Row = Record<string, unknown>;

const state = {
  stranded: [] as Row[],
  stuckSending: [] as Row[],
  /** draftId → the email_events 'sent' row proving delivery, if any. */
  sentWitness: {} as Record<string, Row | undefined>,
  /** draftId → an already-logged lead_events 'email_sent' row, if any. */
  leadEventLogged: {} as Record<string, Row | undefined>,
  updates: [] as Array<{ table: string; payload: Row; filters: Filter[] }>,
  inserts: [] as Array<{ table: string; payload: Row }>,
};

type Filter = [op: string, col: string, val: unknown];

// Capture the stranded-select predicate so we can assert it directly.
const calls = { in: vi.fn(), not: vi.fn(), lte: vi.fn() };

function filterValue(filters: Filter[], col: string): unknown {
  return filters.find((f) => f[1] === col)?.[2];
}

/** What a SELECT on `table` with these filters returns. */
function resolveRows(table: string, filters: Filter[]): Row[] {
  if (table === "drafts") {
    return filterValue(filters, "status") === "sending" ? state.stuckSending : state.stranded;
  }
  if (table === "email_events") {
    const witness = state.sentWitness[String(filterValue(filters, "draft_id"))];
    return witness ? [witness] : [];
  }
  if (table === "lead_events") {
    const draftId = (filterValue(filters, "payload") as { draft_id?: string } | undefined)
      ?.draft_id;
    const logged = state.leadEventLogged[String(draftId)];
    return logged ? [logged] : [];
  }
  return [];
}

vi.mock("@/lib/supabase/admin", () => {
  const from = vi.fn((table: string) => {
    const filters: Filter[] = [];
    let mode: "select" | "update" | "insert" = "select";
    let payload: Row = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const chain: any = {};
    const record = (op: string) => (col: string, ...rest: unknown[]) => {
      filters.push([op, col, rest.at(-1)]);
      if (op === "in") calls.in(col, rest.at(-1));
      if (op === "not") calls.not(col, rest[0], rest.at(-1));
      if (op === "lte") calls.lte(col, rest.at(-1));
      return chain;
    };

    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(record("eq"));
    chain.in = vi.fn(record("in"));
    chain.not = vi.fn(record("not"));
    chain.lte = vi.fn(record("lte"));
    chain.contains = vi.fn(record("contains"));
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.update = vi.fn((p: Row) => {
      mode = "update";
      payload = p;
      return chain;
    });
    chain.insert = vi.fn((p: Row) => {
      mode = "insert";
      payload = p;
      return chain;
    });

    const settle = () => {
      if (mode === "update") {
        state.updates.push({ table, payload, filters });
        return { data: null, error: null };
      }
      if (mode === "insert") {
        state.inserts.push({ table, payload });
        return { data: null, error: null };
      }
      return { data: resolveRows(table, filters), error: null };
    };

    chain.maybeSingle = vi.fn(async () => {
      const res = settle();
      return { data: Array.isArray(res.data) ? (res.data[0] ?? null) : res.data, error: null };
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable stub
    chain.then = (resolve: any) => resolve(settle());

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
  state.stuckSending = [];
  state.sentWitness = {};
  state.leadEventLogged = {};
  state.updates = [];
  state.inserts = [];
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
    expect(res).toMatchObject({ stranded: 2 });
  });

  it("does nothing when no drafts are stranded", async () => {
    const step = makeStep();
    const res = await invoke(step);
    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(res).toMatchObject({ stranded: 0, stuckSending: 0, completed: 0 });
  });

  describe("stuck 'sending' sweep (#139)", () => {
    const STUCK = { id: "s1", coach_id: "c1", lead_id: "l1", subject: "Following up" };

    it("only considers 'sending' drafts older than the stuck threshold", async () => {
      await invoke(makeStep());

      const sendingCutoff = calls.lte.mock.calls.find(([col]) => col === "updated_at");
      expect(sendingCutoff, "no updated_at cutoff on the sending sweep").toBeTruthy();
      // 15 minutes back, allowing a second of drift for test execution.
      const age = Date.now() - new Date(String(sendingCutoff![1])).getTime();
      expect(age).toBeGreaterThan(14 * 60_000);
      expect(age).toBeLessThan(16 * 60_000);
    });

    it("completes a witnessed send instead of re-sending it", async () => {
      state.stuckSending = [STUCK];
      state.sentWitness["s1"] = { id: "ev1", created_at: "2026-07-30T10:00:00.000Z" };
      const step = makeStep();

      const res = await invoke(step);

      // Never re-emitted: the lead already got this email.
      expect(step.sendEvent).not.toHaveBeenCalled();

      const flip = state.updates.find((u) => u.table === "drafts");
      expect(flip?.payload).toEqual({
        status: "sent",
        sent_at: "2026-07-30T10:00:00.000Z",
      });
      // Guarded so a concurrent writer that already moved it on isn't clobbered.
      expect(flip?.filters).toContainEqual(["eq", "status", "sending"]);
      expect(res).toMatchObject({ stuckSending: 1, completed: 1 });
    });

    it("backfills the missing lead_events row for a witnessed send", async () => {
      state.stuckSending = [STUCK];
      state.sentWitness["s1"] = { id: "ev1", created_at: "2026-07-30T10:00:00.000Z" };

      await invoke(makeStep());

      const logged = state.inserts.find((i) => i.table === "lead_events");
      expect(logged?.payload).toMatchObject({
        coach_id: "c1",
        lead_id: "l1",
        event_type: "email_sent",
        payload: { draft_id: "s1", subject: "Following up" },
      });
    });

    it("does not duplicate a lead_events row that already exists", async () => {
      state.stuckSending = [STUCK];
      state.sentWitness["s1"] = { id: "ev1", created_at: "2026-07-30T10:00:00.000Z" };
      state.leadEventLogged["s1"] = { id: "le1" };

      await invoke(makeStep());

      expect(state.inserts.filter((i) => i.table === "lead_events")).toHaveLength(0);
    });

    it("leaves an unwitnessed stuck draft alone rather than risk a duplicate email", async () => {
      state.stuckSending = [STUCK]; // no sentWitness entry
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      const step = makeStep();

      const res = await invoke(step);

      expect(step.sendEvent).not.toHaveBeenCalled();
      expect(state.updates.filter((u) => u.table === "drafts")).toHaveLength(0);
      expect(errorLog).toHaveBeenCalled();
      expect(res).toMatchObject({ stuckSending: 1, completed: 0 });
      errorLog.mockRestore();
    });
  });
});
