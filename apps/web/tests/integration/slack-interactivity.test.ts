import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { installSlackMock, resetSlackMock, mockWebClient } from "@/tests/utils/mocks/slack";

installSlackMock();

// ---------- module mocks ----------
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: vi.fn() },
}));

vi.mock("@/lib/drafts/approve-atomic", () => ({
  approveDraftAtomic: vi.fn(),
  holdDraftAtomic: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/inngest/functions/sequence-step", () => ({
  runPreSendSafetyCheck: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/slack/client", () => ({
  getSlackClientForCoach: vi.fn(async () => mockWebClient),
  evictSlackClientCache: vi.fn(),
}));

// ---------- imports after mocks ----------
import { adminClient } from "@/lib/supabase/admin";
import { approveDraftAtomic, holdDraftAtomic } from "@/lib/drafts/approve-atomic";
import { inngest } from "@/inngest/client";
import { runPreSendSafetyCheck } from "@/inngest/functions/sequence-step";
import { POST } from "@/app/api/webhooks/slack/interactivity/route";

const mockAdminClient = adminClient as unknown as { from: ReturnType<typeof vi.fn> };
const mockApprove = vi.mocked(approveDraftAtomic);
const mockHold = vi.mocked(holdDraftAtomic);
const mockSafetyCheck = vi.mocked(runPreSendSafetyCheck);
const mockInngestSend = vi.mocked(inngest.send);

const SIGNING_SECRET = "test-signing-secret-32-chars-pad";
const COACH_ID = "coach-1";
const DRAFT_ID = "draft-1";
const TEAM_ID = "T-test";

process.env["SLACK_SIGNING_SECRET"] = SIGNING_SECRET;

function makeSlackSignature(timestamp: string, body: string): string {
  const baseString = `v0:${timestamp}:${body}`;
  const hex = createHmac("sha256", SIGNING_SECRET).update(baseString).digest("hex");
  return `v0=${hex}`;
}

function makeBlockActionsBody(actionId: string, extraFields: Record<string, unknown> = {}): string {
  const payload = {
    type: "block_actions",
    user: { id: "U-test", team_id: TEAM_ID },
    actions: [{ action_id: actionId, value: DRAFT_ID, block_id: `draft_actions_${DRAFT_ID}` }],
    response_url: "https://hooks.slack.com/actions/test",
    trigger_id: "trigger-test",
    ...extraFields,
  };
  return `payload=${encodeURIComponent(JSON.stringify(payload))}`;
}

function makeRequest(rawBody: string): Request {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = makeSlackSignature(timestamp, rawBody);
  return new Request("http://localhost/api/webhooks/slack/interactivity", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    },
    body: rawBody,
  });
}

function setupIntegrationMock() {
  mockAdminClient.from.mockImplementation((table: string) => {
    if (table === "integrations") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { coach_id: COACH_ID },
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: { external_account_id: "U-test" },
          error: null,
        }),
      };
    }
    if (table === "drafts") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: DRAFT_ID,
            lead_id: "lead-1",
            sequence_id: "seq-1",
            coach_id: COACH_ID,
            subject: "Hello",
            body: "Follow up body",
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };
    }
    if (table === "draft_edits") {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    }
    if (table === "notification_log") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { external_id: "test-ts" },
          error: null,
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    };
  });
}

// Mock fetch for response_url calls
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  resetSlackMock();
  mockSafetyCheck.mockResolvedValue(null);
  mockApprove.mockResolvedValue({ ok: true, reason: "approved_by:slack", new_status: "approved" });
  mockHold.mockResolvedValue({ ok: true, reason: "held_by:slack", new_status: "held" });
  mockFetch.mockResolvedValue({ ok: true });
});

describe("slack-interactivity (Phase 4 / NOTIFY-008)", () => {
  it("approve flow: button click triggers CAS approve and updates the Slack message via response_url", async () => {
    setupIntegrationMock();

    const body = makeBlockActionsBody("draft_approve");
    const req = makeRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);

    // Safety check called
    expect(mockSafetyCheck).toHaveBeenCalledWith("lead-1", "seq-1");

    // CAS approve called with correct actor
    expect(mockApprove).toHaveBeenCalledWith(DRAFT_ID, "slack");

    // B-1: draft/approved_manually emitted
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/approved_manually" }),
    );

    // Gmail send deferred to Inngest (not synchronous)
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "draft/send_via_gmail",
        data: expect.objectContaining({ draftId: DRAFT_ID, coachId: COACH_ID, source: "slack" }),
      }),
    );

    // response_url updated with approved blocks
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/actions/test",
      expect.objectContaining({ method: "POST" }),
    );
    const fetchBody = JSON.parse(
      (mockFetch.mock.calls[0]![1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(fetchBody.replace_original).toBe(true);
    const blocks = fetchBody.blocks as Array<Record<string, unknown>>;
    expect(blocks[0]?.text).toMatchObject(
      expect.objectContaining({ text: expect.stringContaining("Approved") }),
    );
  });

  it("rejects payloads with missing or stale Slack signature", async () => {
    const body = makeBlockActionsBody("draft_approve");
    const req = new Request("http://localhost/api/webhooks/slack/interactivity", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-slack-request-timestamp": "100", // stale
        "x-slack-signature": "v0=invalid",
      },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("idempotent: replaying the same payload does not re-approve (CAS guard)", async () => {
    setupIntegrationMock();

    mockApprove.mockResolvedValue({
      ok: false,
      reason: "not_pending:approved",
      new_status: "approved",
    });

    const body = makeBlockActionsBody("draft_approve");
    const req = makeRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    // No Inngest send on CAS failure
    expect(mockInngestSend).not.toHaveBeenCalled();

    // Ephemeral "already approved" response sent via response_url
    const fetchBody = JSON.parse(
      (mockFetch.mock.calls[0]![1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(fetchBody.response_type).toBe("ephemeral");
    expect(fetchBody.text).toContain("already approved");
  });

  it("hold action triggers holdDraftAtomic and updates Slack message with held blocks", async () => {
    setupIntegrationMock();

    const body = makeBlockActionsBody("draft_hold");
    const req = makeRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockHold).toHaveBeenCalledWith(DRAFT_ID, "slack");

    // B-1: draft/held_manually emitted
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/held_manually" }),
    );

    const fetchBody = JSON.parse(
      (mockFetch.mock.calls[0]![1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(fetchBody.replace_original).toBe(true);
    const blocks = fetchBody.blocks as Array<Record<string, unknown>>;
    expect(blocks[0]?.text).toMatchObject(
      expect.objectContaining({ text: expect.stringContaining("Held") }),
    );
  });

  it("edit action opens Slack modal via views.open with trigger_id", async () => {
    setupIntegrationMock();

    const body = makeBlockActionsBody("draft_edit");
    const req = makeRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockWebClient.views.open).toHaveBeenCalledOnce();
    const openCall = mockWebClient.views.open.mock.calls[0]![0] as Record<string, unknown>;
    expect(openCall.trigger_id).toBe("trigger-test");
    const view = openCall.view as Record<string, unknown>;
    expect(view.callback_id).toBe("draft_edit_submit");
    expect(view.private_metadata).toBe(DRAFT_ID);
  });

  it("view_submission: saves draft_edits row and approves in one atomic step", async () => {
    let draftEditsRow: Record<string, unknown> | null = null;
    let draftsUpdateCalled = false;

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          contains: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { coach_id: COACH_ID }, error: null }),
          single: vi.fn().mockResolvedValue({ data: { external_account_id: "U-test" }, error: null }),
        };
      }
      if (table === "drafts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: DRAFT_ID,
              lead_id: "lead-1",
              sequence_id: "seq-1",
              coach_id: COACH_ID,
              subject: "Original subject",
              body: "Original body",
            },
            error: null,
          }),
          update: vi.fn().mockImplementation(() => {
            draftsUpdateCalled = true;
            return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
          }),
        };
      }
      if (table === "draft_edits") {
        return {
          insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
            draftEditsRow = row;
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }
      if (table === "notification_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
      };
    });

    const modalPayload = {
      type: "view_submission",
      user: { id: "U-test", team_id: TEAM_ID },
      view: {
        callback_id: "draft_edit_submit",
        private_metadata: DRAFT_ID,
        state: {
          values: {
            draft_subject_input: { value: { value: "Edited subject" } },
            draft_body_input: { value: { value: "Edited body content" } },
          },
        },
      },
    };
    const rawBody = `payload=${encodeURIComponent(JSON.stringify(modalPayload))}`;
    const req = makeRequest(rawBody);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.response_action).toBe("clear");

    // draft_edits row uses original_body/edited_body columns
    expect(draftEditsRow).not.toBeNull();
    const row = draftEditsRow as unknown as Record<string, unknown>;
    expect(row["original_body"]).toBe("Original body");
    expect(row["edited_body"]).toBe("Edited body content");

    // drafts table updated
    expect(draftsUpdateCalled).toBe(true);

    // B-1: approved + send events fired (Edit path)
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/approved_manually" }),
    );
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/send_via_gmail", data: expect.objectContaining({ source: "slack_edit" }) }),
    );
  });
});
