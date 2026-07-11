import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Module mocks
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: vi.fn() },
}));

vi.mock("@/lib/drafts/approve-atomic", () => ({
  consumeReviewToken: vi.fn(),
  approveDraftAtomic: vi.fn(),
  holdDraftAtomic: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/inngest/functions/sequence-step", () => ({
  runPreSendSafetyCheck: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/review-token", () => ({
  verifyReviewToken: vi.fn(),
  generateReviewToken: vi.fn(),
  buildReviewUrl: vi.fn(),
  buildShortReviewUrl: vi.fn(),
}));

import { adminClient } from "@/lib/supabase/admin";
import {
  consumeReviewToken,
  approveDraftAtomic,
  holdDraftAtomic,
} from "@/lib/drafts/approve-atomic";
import { inngest } from "@/inngest/client";
import { runPreSendSafetyCheck } from "@/inngest/functions/sequence-step";
import { verifyReviewToken } from "@/lib/review-token";

const mockAdminClient = adminClient as unknown as {
  from: ReturnType<typeof vi.fn>;
};
const mockConsumeToken = vi.mocked(consumeReviewToken);
const mockApprove = vi.mocked(approveDraftAtomic);
const mockHold = vi.mocked(holdDraftAtomic);
const mockInngest = vi.mocked(inngest.send);
const mockSafetyCheck = vi.mocked(runPreSendSafetyCheck);
const mockVerify = vi.mocked(verifyReviewToken);

const COACH_ID = "coach-1";
const DRAFT_ID = "draft-1";
const NONCE = "nonce-abc-123";
const TOKEN = "encoded.sig";

const VALID_PAYLOAD = {
  draftId: DRAFT_ID,
  coachId: COACH_ID,
  nonce: NONCE,
  exp: Date.now() + 999999,
};

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/review/${TOKEN}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function setupAdminMock() {
  mockAdminClient.from.mockImplementation((table: string) => {
    if (table === "drafts") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: DRAFT_ID,
            body: "Draft body",
            subject: "Subject",
            status: "pending",
            scheduled_send_at: null,
            confidence_level: "high",
            lead_id: "lead-1",
            sequence_id: null,
            review_token_nonce: NONCE,
            touchpoint_index: 1,
            total_touchpoints: null,
          },
          error: null,
        }),
      };
    }
    if (table === "draft_edits") {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env["JWT_REVIEW_SECRET"] = "test-secret";
  mockVerify.mockReturnValue(VALID_PAYLOAD);
  mockConsumeToken.mockResolvedValue({ ok: true, reason: "ok" });
  mockApprove.mockResolvedValue({
    ok: true,
    reason: "ok",
    new_status: "approved",
  });
  mockHold.mockResolvedValue({ ok: true, reason: "ok", new_status: "held" });
  mockSafetyCheck.mockResolvedValue(null);
  setupAdminMock();
});

describe("review-token (Phase 4 / Pitfall-6)", () => {
  it("read-only does not consume nonce, token remains valid after N views", async () => {
    // Call the data route (GET) 3 times
    const { GET } = await import("@/app/api/review/[token]/data/route");

    for (let i = 0; i < 3; i++) {
      const req = new Request(`http://localhost/api/review/${TOKEN}/data`);
      const res = await GET(req, {
        params: Promise.resolve({ token: TOKEN }),
      });
      expect(res.status).toBe(200);
    }

    // consumeReviewToken must NOT have been called
    expect(mockConsumeToken).not.toHaveBeenCalled();

    // Now PATCH (approve) should succeed
    const { PATCH } = await import("@/app/api/review/[token]/route");
    const patchRes = await PATCH(
      makeRequest("PATCH", { status: "approved" }),
      { params: Promise.resolve({ token: TOKEN }) },
    );
    expect(patchRes.status).toBe(200);
    expect(mockConsumeToken).toHaveBeenCalledOnce();
  });

  it("approve action consumes nonce, second use is rejected", async () => {
    const { PATCH } = await import("@/app/api/review/[token]/route");

    // First PATCH, succeeds
    const res1 = await PATCH(makeRequest("PATCH", { status: "approved" }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res1.status).toBe(200);

    // Second PATCH, already consumed
    mockConsumeToken.mockResolvedValueOnce({
      ok: false,
      reason: "already_consumed",
    });
    const res2 = await PATCH(makeRequest("PATCH", { status: "approved" }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res2.status).toBe(410);
    const body = (await res2.json()) as { ok: boolean; reason: string };
    expect(body.reason).toBe("already_consumed");
  });

  it("expired token returns 410 Gone", async () => {
    mockVerify.mockReturnValueOnce(null); // expired/invalid token returns null
    const { PATCH } = await import("@/app/api/review/[token]/route");
    const res = await PATCH(makeRequest("PATCH", { status: "approved" }), {
      params: Promise.resolve({ token: "expired-token" }),
    });
    // Per plan spec: expired/tampered -> 401
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_token");
  });

  it("PATCH approve emits draft/approved_manually and draft/send_via_gmail (B-1)", async () => {
    const { PATCH } = await import("@/app/api/review/[token]/route");
    const res = await PATCH(makeRequest("PATCH", { status: "approved" }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(200);
    expect(mockInngest).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/approved_manually" }),
    );
    expect(mockInngest).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/send_via_gmail" }),
    );
  });

  it("PATCH hold emits draft/held_manually event (B-1)", async () => {
    const { PATCH } = await import("@/app/api/review/[token]/route");
    const res = await PATCH(makeRequest("PATCH", { status: "held" }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(200);
    expect(mockInngest).toHaveBeenCalledWith(
      expect.objectContaining({ name: "draft/held_manually" }),
    );
  });

  it("data route does not consume nonce on GET", async () => {
    const { GET } = await import("@/app/api/review/[token]/data/route");

    const req = new Request(`http://localhost/api/review/${TOKEN}/data`);
    const res = await GET(req, { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(200);
    // consumeReviewToken was never called by GET
    expect(mockConsumeToken).not.toHaveBeenCalled();
  });
});
