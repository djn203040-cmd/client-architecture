import { describe, it, expect, vi, beforeEach } from "vitest";

// GMAIL-008 + reply-pipeline hardening. Tests processHistoryUpdate's detection
// logic: it must only fire LEAD_REPLIED for a message genuinely FROM the lead,
// record each inbound exactly once (idempotent on gmail_message_id), and carry
// the threadId through. We mock the Supabase admin client and the Gmail client
// so the logic runs without a database or network.

// ---- Mutable per-test fixtures the mocks read from ----
type DB = {
  // gmail_message_id (of one of OUR sent messages) -> lead_id it belongs to
  sentByMessageId: Map<string, string>;
  // lead_id -> email
  leadEmailById: Map<string, string>;
  // email -> { id, status }
  leadByEmail: Map<string, { id: string; status: string }>;
  // gmail_message_id of inbound messages we've already recorded (dedup store)
  recordedInbound: Set<string>;
};

let db: DB;
const inboundInserts: Array<Record<string, unknown>> = [];
const integrationUpdates: Array<Record<string, unknown>> = [];

// ---- Supabase admin mock: a thenable builder routed by table+op+filters ----
const { adminClient } = vi.hoisted(() => {
  return { adminClient: {} as Record<string, unknown> };
});

function makeBuilder(table: string) {
  const state: {
    table: string;
    op: "select" | "insert" | "update";
    filters: Record<string, unknown>;
    payload?: Record<string, unknown>;
  } = { table, op: "select", filters: {} };

  const resolve = () => {
    const f = state.filters;
    if (state.table === "integrations" && state.op === "select") {
      return { data: { metadata: { last_history_id: "100" } }, error: null };
    }
    if (state.table === "integrations" && state.op === "update") {
      integrationUpdates.push(state.payload ?? {});
      return { data: null, error: null };
    }
    if (state.table === "email_events" && state.op === "select") {
      const lead = db.sentByMessageId.get(f.gmail_message_id as string);
      return { data: lead ? { lead_id: lead } : null, error: null };
    }
    if (state.table === "email_events" && state.op === "insert") {
      const id = state.payload?.gmail_message_id as string;
      if (db.recordedInbound.has(id)) {
        return { data: null, error: { code: "23505", message: "duplicate" } };
      }
      db.recordedInbound.add(id);
      inboundInserts.push(state.payload ?? {});
      return { data: null, error: null };
    }
    if (state.table === "leads" && state.op === "select") {
      if (f.id) {
        const email = db.leadEmailById.get(f.id as string);
        return { data: email ? { email } : null, error: null };
      }
      if (f.email) {
        const lead = db.leadByEmail.get((f.email as string).toLowerCase());
        return { data: lead ?? null, error: null };
      }
    }
    if (state.table === "pending_actions") {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  };

  const builder: Record<string, unknown> = {
    select() { state.op = "select"; return builder; },
    insert(payload: Record<string, unknown>) { state.op = "insert"; state.payload = payload; return builder; },
    update(payload: Record<string, unknown>) { state.op = "update"; state.payload = payload; return builder; },
    eq(col: string, val: unknown) { state.filters[col] = val; return builder; },
    not() { return builder; },
    order() { return builder; },
    limit() { return builder; },
    gt() { return builder; },
    is() { return builder; },
    maybeSingle() { return Promise.resolve(resolve()); },
    single() { return Promise.resolve(resolve()); },
    then(onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) {
      return Promise.resolve(resolve()).then(onF, onR);
    },
  };
  return builder;
}

adminClient.from = (table: string) => makeBuilder(table);

vi.mock("@/lib/supabase/admin", () => ({ adminClient }));
vi.mock("@/lib/gmail/bounce-detector", () => ({ isBounceMessage: () => false }));

// ---- Gmail client mock ----
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");

const mockHistoryList = vi.fn();
const mockMessagesGet = vi.fn();

vi.mock("@/lib/gmail/client", () => ({
  getGmailClientForCoach: () =>
    Promise.resolve({
      users: {
        history: { list: mockHistoryList },
        messages: { get: mockMessagesGet },
      },
    }),
}));

import { processHistoryUpdate } from "@/lib/gmail/monitor";

function gmailMsg(opts: {
  id: string;
  from: string;
  inReplyTo?: string;
  subject?: string;
  threadId?: string;
  body?: string;
}) {
  const headers = [
    { name: "From", value: opts.from },
    { name: "Subject", value: opts.subject ?? "Re: hey" },
  ];
  if (opts.inReplyTo) headers.push({ name: "In-Reply-To", value: opts.inReplyTo });
  return {
    data: {
      id: opts.id,
      threadId: opts.threadId ?? "thread-1",
      snippet: opts.body ?? "snippet",
      internalDate: "1700000000000",
      payload: { headers, body: { data: b64(opts.body ?? "faktisk svar fra leadet") } },
    },
  };
}

beforeEach(() => {
  db = {
    sentByMessageId: new Map([["sent-1@mail.gmail.com", "l1"]]),
    leadEmailById: new Map([["l1", "augusta@example.com"]]),
    leadByEmail: new Map([["augusta@example.com", { id: "l1", status: "in_sequence" }]]),
    recordedInbound: new Set(),
  };
  inboundInserts.length = 0;
  integrationUpdates.length = 0;
  mockHistoryList.mockReset();
  mockMessagesGet.mockReset();
  mockHistoryList.mockResolvedValue({
    data: { history: [{ messagesAdded: [{ message: { id: "inbound-1" } }] }] },
  });
});

describe("processHistoryUpdate, reply detection", () => {
  it("fires LEAD_REPLIED + records inbound when In-Reply-To matches and From is the lead", async () => {
    mockMessagesGet.mockResolvedValue(
      gmailMsg({
        id: "inbound-1",
        from: "Augusta Vilsøe <augusta@example.com>",
        inReplyTo: "<sent-1@mail.gmail.com>",
        threadId: "thread-77",
      }),
    );

    const { eventsToFire } = await processHistoryUpdate("c1", "200");

    expect(eventsToFire).toHaveLength(1);
    expect(eventsToFire[0]).toMatchObject({
      name: "lead/replied",
      data: { coachId: "c1", leadId: "l1", messageId: "inbound-1", threadId: "thread-77" },
    });
    // Inbound persisted once, with the actual body captured.
    expect(inboundInserts).toHaveLength(1);
    expect(inboundInserts[0]).toMatchObject({
      event_type: "received",
      gmail_message_id: "inbound-1",
      lead_id: "l1",
    });
  });

  it("re-baselines and fires nothing when history.list 404s on a stale historyId", async () => {
    // Gmail purges history older than ~1 week: a stale stored baseline makes
    // history.list 404 forever. The monitor must NOT throw (which would strand
    // it, the throw is before the baseline advances); it must reset the
    // baseline to this push's current historyId and skip the lost delta.
    mockHistoryList.mockRejectedValue(
      Object.assign(new Error("Requested entity was not found."), {
        code: 404,
        status: "NOT_FOUND",
      }),
    );

    const { eventsToFire } = await processHistoryUpdate("c1", "999");

    expect(eventsToFire).toHaveLength(0);
    // Baseline reset to the incoming historyId so the next push queries validly.
    expect(integrationUpdates).toHaveLength(1);
    expect(integrationUpdates[0]).toMatchObject({
      metadata: { last_history_id: "999" },
    });
  });

  it("does NOT fire on a threaded message that is NOT from the lead (phantom/self-send guard)", async () => {
    // Same matching In-Reply-To, but the sender is the coach, not the lead.
    mockMessagesGet.mockResolvedValue(
      gmailMsg({
        id: "inbound-1",
        from: "Daniel Juel Nissen <daniel@coach.com>",
        inReplyTo: "<sent-1@mail.gmail.com>",
      }),
    );

    const { eventsToFire } = await processHistoryUpdate("c1", "200");

    expect(eventsToFire).toHaveLength(0);
    expect(inboundInserts).toHaveLength(0);
  });

  it("does NOT re-fire for an already-recorded inbound (idempotent on duplicate)", async () => {
    db.recordedInbound.add("inbound-1"); // Gmail history replayed a message we handled
    mockMessagesGet.mockResolvedValue(
      gmailMsg({
        id: "inbound-1",
        from: "Augusta <augusta@example.com>",
        inReplyTo: "<sent-1@mail.gmail.com>",
      }),
    );

    const { eventsToFire } = await processHistoryUpdate("c1", "200");

    expect(eventsToFire).toHaveLength(0);
    expect(inboundInserts).toHaveLength(0); // dedup short-circuited the insert
  });

  it("fires for a fresh email (no In-Reply-To) from an in_sequence lead, carrying threadId", async () => {
    mockMessagesGet.mockResolvedValue(
      gmailMsg({
        id: "inbound-1",
        from: "augusta@example.com",
        threadId: "thread-9",
      }),
    );

    const { eventsToFire } = await processHistoryUpdate("c1", "200");

    expect(eventsToFire).toHaveLength(1);
    expect(eventsToFire[0]).toMatchObject({
      name: "lead/replied",
      data: { coachId: "c1", leadId: "l1", messageId: "inbound-1", threadId: "thread-9" },
    });
    expect(inboundInserts).toHaveLength(1);
  });
});
