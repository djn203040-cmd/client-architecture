import { beforeEach, describe, expect, it, vi } from "vitest";

// The /admin surface over drafts stranded in `sending` (#139). The reconciler
// resolves the witnessed case on its own; these are the operator paths for the
// unwitnessed one, where the whole risk is sending a lead a duplicate email.

type Row = Record<string, unknown>;
type Filter = [op: string, col: string, val: unknown];

const state = {
  /** Rows a SELECT on `drafts` returns. */
  drafts: [] as Row[],
  coaches: [] as Row[],
  leads: [] as Row[],
  /** draftId → the email_events 'sent' row proving delivery, if any. */
  witness: {} as Record<string, Row | undefined>,
  leadEventLogged: {} as Record<string, Row | undefined>,
  /** Rows a conditional UPDATE ... RETURNING hands back. Empty = lost the race. */
  updateReturns: [{ id: "d1" }] as Row[],
  updates: [] as Array<{ table: string; payload: Row; filters: Filter[] }>,
  inserts: [] as Array<{ table: string; payload: Row }>,
  selects: [] as Array<{ table: string; filters: Filter[] }>,
};

function filterValue(filters: Filter[], col: string): unknown {
  return filters.find((f) => f[1] === col)?.[2];
}

function resolveRows(table: string, filters: Filter[]): Row[] {
  if (table === "drafts") return state.drafts;
  if (table === "coaches") return state.coaches;
  if (table === "leads") return state.leads;
  if (table === "email_events") {
    const single = state.witness[String(filterValue(filters, "draft_id"))];
    if (single) return [single];
    // The list form (fetchStuckSends) filters with .in("draft_id", [...]).
    const ids = filterValue(filters, "draft_id");
    if (Array.isArray(ids)) {
      return ids.flatMap((id) => (state.witness[String(id)] ? [{ draft_id: id }] : []));
    }
    return [];
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
        return { data: state.updateReturns, error: null };
      }
      if (mode === "insert") {
        state.inserts.push({ table, payload });
        return { data: null, error: null };
      }
      state.selects.push({ table, filters });
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

const { mockSend, mockGmailClient } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGmailClient: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({ inngest: { send: mockSend } }));
vi.mock("@/lib/gmail/client", () => ({ getGmailClientForCoach: mockGmailClient }));

import {
  checkGmailForSend,
  fetchStuckSends,
  resolveStuckSend,
} from "@/lib/admin/stuck-sends";

const DRAFT = {
  id: "d1",
  coach_id: "c1",
  lead_id: "l1",
  subject: "Following up",
  status: "sending",
  updated_at: "2026-07-30T10:00:00.000Z",
};

/** A Gmail stub whose Sent search returns `messages`. */
function gmailWith(messages: Array<{ id: string; subject: string; internalDate: string }>) {
  return {
    users: {
      messages: {
        list: vi.fn(async () => ({ data: { messages: messages.map((m) => ({ id: m.id })) } })),
        get: vi.fn(async ({ id }: { id: string }) => {
          const m = messages.find((x) => x.id === id)!;
          return {
            data: {
              id: m.id,
              threadId: `t-${m.id}`,
              internalDate: m.internalDate,
              payload: {
                headers: [
                  { name: "Subject", value: m.subject },
                  { name: "Message-ID", value: `<rfc-${m.id}@mail.gmail.com>` },
                ],
              },
            },
          };
        }),
      },
    },
  };
}

beforeEach(() => {
  state.drafts = [];
  state.coaches = [];
  state.leads = [];
  state.witness = {};
  state.leadEventLogged = {};
  state.updateReturns = [{ id: "d1" }];
  state.updates = [];
  state.inserts = [];
  state.selects = [];
  vi.clearAllMocks();
  mockGmailClient.mockResolvedValue(gmailWith([]));
});

describe("fetchStuckSends", () => {
  it("selects only 'sending' drafts past the shared stuck cutoff", async () => {
    await fetchStuckSends();

    const draftSelect = state.selects.find((s) => s.table === "drafts")!;
    expect(draftSelect.filters).toContainEqual(["eq", "status", "sending"]);
    const cutoff = filterValue(draftSelect.filters, "updated_at");
    // Same 15-minute threshold the reconciler sweeps on; a drift here would make
    // the panel and the sweep disagree about what "stuck" means.
    const age = Date.now() - new Date(String(cutoff)).getTime();
    expect(age).toBeGreaterThan(14 * 60_000);
    expect(age).toBeLessThan(16 * 60_000);
  });

  it("marks a draft with a 'sent' email_event as witnessed (self-healing)", async () => {
    state.drafts = [DRAFT];
    state.coaches = [{ id: "c1", name: "Camilla", email: "c@x.com" }];
    state.leads = [{ id: "l1", name: "Jane", email: "jane@example.com" }];
    state.witness["d1"] = { draft_id: "d1" };

    const [row] = await fetchStuckSends();

    expect(row).toMatchObject({
      draft_id: "d1",
      coach_name: "Camilla",
      lead_email: "jane@example.com",
      witnessed: true,
    });
  });

  it("marks a draft with no send on record as unwitnessed", async () => {
    state.drafts = [DRAFT];
    const [row] = await fetchStuckSends();
    expect(row?.witnessed).toBe(false);
  });
});

describe("checkGmailForSend", () => {
  it("reports none when the coach's Sent mail has nothing to the lead", async () => {
    state.drafts = [DRAFT];
    state.leads = [{ email: "jane@example.com" }];

    expect(await checkGmailForSend("d1")).toEqual({ status: "none" });
  });

  it("returns the matches with the draft's subject flagged", async () => {
    state.drafts = [DRAFT];
    state.leads = [{ email: "jane@example.com" }];
    mockGmailClient.mockResolvedValue(
      gmailWith([
        { id: "m1", subject: "Re: Following up", internalDate: "1785492000000" },
        { id: "m2", subject: "Something else", internalDate: "1785495600000" },
      ]),
    );

    const res = await checkGmailForSend("d1");

    expect(res.status).toBe("found");
    if (res.status !== "found") return;
    // "Re: " chain stripped before comparing, so an in-thread send still matches.
    expect(res.matches.find((m) => m.gmailMessageId === "m1")?.subjectMatches).toBe(true);
    expect(res.matches.find((m) => m.gmailMessageId === "m2")?.subjectMatches).toBe(false);
    expect(res.matches[0]?.rfcMessageId).toBe("rfc-m1@mail.gmail.com");
  });

  it("reports unavailable, never 'none', when Gmail can't be reached", async () => {
    state.drafts = [DRAFT];
    state.leads = [{ email: "jane@example.com" }];
    mockGmailClient.mockRejectedValue(new Error("invalid_grant"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    // A revoked grant reading as "nothing was sent" would walk the operator
    // straight into the duplicate this whole mechanism exists to prevent.
    expect((await checkGmailForSend("d1")).status).toBe("unavailable");
    errorLog.mockRestore();
  });
});

describe("resolveStuckSend — mark_sent", () => {
  beforeEach(() => {
    state.drafts = [DRAFT];
    state.leads = [{ email: "jane@example.com" }];
  });

  it("flips the draft to sent, guarded on it still being 'sending'", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await resolveStuckSend("d1", "mark_sent");

    expect(res.ok).toBe(true);
    const flip = state.updates.find((u) => u.table === "drafts")!;
    expect(flip.payload).toMatchObject({ status: "sent" });
    expect(flip.filters).toContainEqual(["eq", "status", "sending"]);
    warn.mockRestore();
  });

  it("recovers the real Gmail Message-ID so replies still thread", async () => {
    mockGmailClient.mockResolvedValue(
      gmailWith([{ id: "m1", subject: "Following up", internalDate: "1785492000000" }]),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await resolveStuckSend("d1", "mark_sent");

    const event = state.inserts.find((i) => i.table === "email_events")!;
    expect(event.payload).toMatchObject({
      draft_id: "d1",
      event_type: "sent",
      gmail_message_id: "rfc-m1@mail.gmail.com",
      gmail_thread_id: "t-m1",
    });
    warn.mockRestore();
  });

  it("writes the email_events row before flipping the draft", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await resolveStuckSend("d1", "mark_sent");

    // recordDelivery's invariant: a `sent` draft is never observable without the
    // email_event that witnesses it, or the reconciler would re-judge it unsent.
    expect(state.inserts.some((i) => i.table === "email_events")).toBe(true);
    expect(state.updates.some((u) => u.table === "drafts")).toBe(true);
    warn.mockRestore();
  });

  it("does not duplicate the email_event when the send was already witnessed", async () => {
    state.witness["d1"] = {
      id: "ev1",
      created_at: "2026-07-30T10:00:05.000Z",
      gmail_message_id: "rfc-existing",
      gmail_thread_id: "t-existing",
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await resolveStuckSend("d1", "mark_sent");

    expect(state.inserts.filter((i) => i.table === "email_events")).toHaveLength(0);
    // sent_at comes from the witness, not "now" — the email left at that moment.
    expect(state.updates.find((u) => u.table === "drafts")?.payload).toEqual({
      status: "sent",
      sent_at: "2026-07-30T10:00:05.000Z",
    });
    warn.mockRestore();
  });

  it("reports the race when something else resolved the draft first", async () => {
    state.updateReturns = [];

    const res = await resolveStuckSend("d1", "mark_sent");

    expect(res).toMatchObject({ ok: false, reason: "not_stuck" });
  });
});

describe("resolveStuckSend — resend", () => {
  beforeEach(() => {
    state.drafts = [DRAFT];
    state.leads = [{ email: "jane@example.com" }];
  });

  it("releases the claim and re-queues the send when Gmail shows nothing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await resolveStuckSend("d1", "resend");

    expect(res).toMatchObject({ ok: true, outcome: "resent" });
    const release = state.updates.find((u) => u.table === "drafts")!;
    expect(release.payload).toEqual({ status: "approved" });
    expect(release.filters).toContainEqual(["eq", "status", "sending"]);
    // sequence_scheduled bypasses the cadence gate — this send time has passed.
    expect(mockSend).toHaveBeenCalledWith({
      name: "draft/send_via_gmail",
      data: { draftId: "d1", coachId: "c1", source: "sequence_scheduled" },
    });
    warn.mockRestore();
  });

  it("refuses when an email_event already witnesses the send", async () => {
    state.witness["d1"] = { id: "ev1", created_at: "2026-07-30T10:00:05.000Z" };

    const res = await resolveStuckSend("d1", "resend");

    expect(res).toMatchObject({ ok: false, reason: "already_sent" });
    expect(mockSend).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);
  });

  it("refuses when Gmail shows a message to the lead after the send started", async () => {
    mockGmailClient.mockResolvedValue(
      gmailWith([{ id: "m1", subject: "Following up", internalDate: "1785492000000" }]),
    );

    const res = await resolveStuckSend("d1", "resend");

    expect(res).toMatchObject({ ok: false, reason: "already_sent" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("still resends when Gmail is unreachable — unknown must not block the operator", async () => {
    mockGmailClient.mockRejectedValue(new Error("invalid_grant"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await resolveStuckSend("d1", "resend");

    expect(res).toMatchObject({ ok: true, outcome: "resent" });
    expect(mockSend).toHaveBeenCalled();
    errorLog.mockRestore();
    warn.mockRestore();
  });

  it("restores the claim when the send queue is unreachable", async () => {
    mockSend.mockRejectedValue(new Error("Event key not found"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await resolveStuckSend("d1", "resend");

    expect(res).toMatchObject({ ok: false, reason: "requeue_failed" });
    // Back to `sending`, so it stays on the panel and retryable. An ad-hoc draft
    // left in `approved` has no scheduled_send_at for the reconciler to find.
    const restore = state.updates.filter((u) => u.table === "drafts").at(-1)!;
    expect(restore.payload).toEqual({ status: "sending" });
    expect(restore.filters).toContainEqual(["eq", "status", "approved"]);
    errorLog.mockRestore();
  });

  it("refuses a draft that is no longer stuck", async () => {
    state.drafts = [{ ...DRAFT, status: "sent" }];

    const res = await resolveStuckSend("d1", "resend");

    expect(res).toMatchObject({ ok: false, reason: "not_stuck" });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
