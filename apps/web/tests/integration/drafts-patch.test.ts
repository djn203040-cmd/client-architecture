import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------- module mocks ----------
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    from: vi.fn(),
  },
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

// ---------- helpers ----------
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { approveDraftAtomic, holdDraftAtomic } from "@/lib/drafts/approve-atomic";
import { inngest } from "@/inngest/client";
import { runPreSendSafetyCheck } from "@/inngest/functions/sequence-step";

const mockCreateClient = vi.mocked(createClient);
const mockAdminClient = adminClient as unknown as { from: ReturnType<typeof vi.fn> };
const mockApprove = vi.mocked(approveDraftAtomic);
const mockHold = vi.mocked(holdDraftAtomic);
const mockSafetyCheck = vi.mocked(runPreSendSafetyCheck);
const mockInngest = vi.mocked(inngest.send);

const COACH_ID = "coach-uuid-1";
const DRAFT_ID = "draft-uuid-1";
const LEAD_ID = "lead-uuid-1";
const SEQ_ID = "seq-uuid-1";

const fakeDraft = {
  id: DRAFT_ID,
  coach_id: COACH_ID,
  lead_id: LEAD_ID,
  sequence_id: SEQ_ID,
  status: "pending" as const,
  body: "Hello lead",
  subject: "Subject",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/drafts/${DRAFT_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAuth(userId: string | null) {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  } as never);
}

function mockDraftQuery(
  draft: (Omit<typeof fakeDraft, "sequence_id"> & { sequence_id: string | null }) | null,
) {
  mockAdminClient.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: draft }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSafetyCheck.mockResolvedValue(null);
  mockInngest.mockResolvedValue(undefined as never);
});

describe("PATCH /api/drafts/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth(null);
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({ status: "approved" }), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    mockAuth(COACH_ID);
    mockDraftQuery(fakeDraft);
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({}), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when draft not found", async () => {
    mockAuth(COACH_ID);
    mockDraftQuery(null);
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({ status: "held" }), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when coach_id does not match", async () => {
    mockAuth("other-coach");
    mockDraftQuery(fakeDraft);
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({ status: "held" }), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and fires Inngest events on approve happy path", async () => {
    mockAuth(COACH_ID);
    mockDraftQuery(fakeDraft);
    mockApprove.mockResolvedValue({ ok: true, reason: "approved_by:dashboard", new_status: "approved" });
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({ status: "approved" }), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.new_status).toBe("approved");
    expect(mockInngest).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/approved_manually" }),
    );
    expect(mockInngest).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/send_via_gmail" }),
    );
  });

  it("approves a standalone (no-sequence) draft: skips safety check + approved_manually, still sends (#41)", async () => {
    mockAuth(COACH_ID);
    mockDraftQuery({ ...fakeDraft, sequence_id: null });
    mockApprove.mockResolvedValue({ ok: true, reason: "approved_by:dashboard", new_status: "approved" });
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({ status: "approved" }), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.new_status).toBe("approved");
    // No sequence → no pre-send safety check
    expect(mockSafetyCheck).not.toHaveBeenCalled();
    // No sequence → no timer-cancel signal (nothing to cancel)
    expect(mockInngest).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/approved_manually" }),
    );
    // Still hands off to Gmail send like any other approval path
    expect(mockInngest).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/send_via_gmail" }),
    );
  });

  it("returns 409 when CAS contention (approve_draft_atomic returns ok=false)", async () => {
    mockAuth(COACH_ID);
    mockDraftQuery(fakeDraft);
    mockApprove.mockResolvedValue({ ok: false, reason: "concurrent_attempt", new_status: null });
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({ status: "approved" }), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("concurrent_attempt");
  });

  it("returns 409 when pre-send safety check blocks", async () => {
    mockAuth(COACH_ID);
    mockDraftQuery(fakeDraft);
    mockSafetyCheck.mockResolvedValue("dnc_flag");
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({ status: "approved" }), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.reason).toBe("dnc_flag");
  });

  it("writes draft_edits row on body-only edit", async () => {
    mockAuth(COACH_ID);
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "draft_edits") return { insert: insertMock };
      if (table === "drafts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: fakeDraft }),
            }),
          }),
          update: updateMock,
        };
      }
      return {};
    });
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const res = await PATCH(makeRequest({ body: "Updated body text" }), {
      params: Promise.resolve({ id: DRAFT_ID }),
    });
    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ original_body: fakeDraft.body, edited_body: "Updated body text" }),
    );
  });
});
