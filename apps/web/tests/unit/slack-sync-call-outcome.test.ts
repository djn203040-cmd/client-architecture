import { describe, it, expect, vi, beforeEach } from "vitest";

// Chainable adminClient stub keyed by table: notification_log yields the logged
// Slack ts, integrations yields the connected row. Inlined because vi.mock is
// hoisted.
const state: {
  logRow: { external_id: string } | null;
  integrationRow: {
    external_account_id: string;
    status: string;
  } | null;
} = { logRow: null, integrationRow: null };

vi.mock("@/lib/supabase/admin", () => {
  const makeChain = (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const chain: any = {};
    for (const m of [
      "select",
      "eq",
      "contains",
      "not",
      "order",
      "limit",
      "insert",
      "update",
    ]) {
      chain[m] = vi.fn(() => chain);
    }
    chain.maybeSingle = vi.fn(async () => ({
      data: table === "notification_log" ? state.logRow : state.integrationRow,
      error: null,
    }));
    return chain;
  };
  return { adminClient: { from: vi.fn((table: string) => makeChain(table)) } };
});

const conversationsOpen = vi.fn();
const chatUpdate = vi.fn();
vi.mock("@/lib/slack/client", () => ({
  getSlackClientForCoach: vi.fn(async () => ({
    conversations: { open: conversationsOpen },
    chat: { update: chatUpdate },
  })),
  evictSlackClientCache: vi.fn(),
}));

import { syncSlackCallOutcomeMessage } from "@/lib/slack/sync-call-outcome-message";

describe("syncSlackCallOutcomeMessage (#77 dashboard→Slack retirement)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.logRow = { external_id: "1783065356.191749" };
  });

  it("updates via the resolved DM channel id, never the stored user id", async () => {
    // The regression: external_account_id is a USER id (U…); chat.update with it
    // fails with message_not_found. The sync must resolve the D… channel first.
    state.integrationRow = {
      external_account_id: "U_TEST_CHANNEL_FIX",
      status: "connected",
    };
    conversationsOpen.mockResolvedValue({ channel: { id: "D_RESOLVED" } });
    chatUpdate.mockResolvedValue({ ok: true });

    await syncSlackCallOutcomeMessage({
      id: "outcome-1",
      coachId: "coach-1",
      outcome: "converted",
    });

    expect(conversationsOpen).toHaveBeenCalledWith({ users: "U_TEST_CHANNEL_FIX" });
    expect(chatUpdate).toHaveBeenCalledTimes(1);
    const arg = chatUpdate.mock.calls[0]![0] as { channel: string; ts: string };
    expect(arg.channel).toBe("D_RESOLVED");
    expect(arg.ts).toBe("1783065356.191749");
  });

  it("no-ops without a chat.update when the DM channel cannot be resolved", async () => {
    state.integrationRow = {
      external_account_id: "U_TEST_NO_CHANNEL",
      status: "connected",
    };
    conversationsOpen.mockResolvedValue({ channel: undefined });

    await syncSlackCallOutcomeMessage({
      id: "outcome-2",
      coachId: "coach-1",
      outcome: "no_show",
    });

    expect(chatUpdate).not.toHaveBeenCalled();
  });

  it("no-ops when no Slack log row exists for the outcome (pre-migration rows)", async () => {
    state.logRow = null;
    state.integrationRow = {
      external_account_id: "U_TEST_NO_LOG",
      status: "connected",
    };

    await syncSlackCallOutcomeMessage({
      id: "outcome-3",
      coachId: "coach-1",
      outcome: "completed",
    });

    expect(conversationsOpen).not.toHaveBeenCalled();
    expect(chatUpdate).not.toHaveBeenCalled();
  });
});
