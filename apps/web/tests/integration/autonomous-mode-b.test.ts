import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetInngestQueue, getSentEvents, runInngestStep } from "@/tests/utils/inngest-runner";
import type { InngestHandler } from "@/tests/utils/inngest-runner";

// ── Hoisted mocks (must be declared before vi.mock calls) ─────────────────────

const {
  mockSingle,
  mockFrom,
  mockApproveDraftAtomic,
  mockRunPreSendSafetyCheck,
} = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockApproveDraftAtomic = vi.fn();
  const mockRunPreSendSafetyCheck = vi.fn();
  return { mockSingle, mockFrom, mockApproveDraftAtomic, mockRunPreSendSafetyCheck };
});

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: mockFrom },
}));

vi.mock("@/lib/drafts/approve-atomic", () => ({
  approveDraftAtomic: mockApproveDraftAtomic,
  holdDraftAtomic: vi.fn(),
  consumeReviewToken: vi.fn(),
}));

vi.mock("@/inngest/functions/sequence-step", () => ({
  runPreSendSafetyCheck: mockRunPreSendSafetyCheck,
  buildDraftGeneratePayload: vi.fn(),
}));

import {
  autonomousModeBTimerHandler as _handler,
} from "@/inngest/functions/autonomous-mode-b-timer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autonomousModeBTimerHandler = _handler as unknown as InngestHandler<any>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

function makeEvent(draftId = "draft-1", coachId = "coach-1") {
  return {
    name: "draft/created_mode_b",
    data: { draftId, coachId, scheduledSendAt: futureDate },
  };
}

function mockPendingDraft() {
  mockSingle.mockResolvedValue({
    data: { status: "pending", lead_id: "lead-1", sequence_id: "seq-1" },
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetInngestQueue();
  vi.clearAllMocks();
});

describe("autonomous-mode-b (Phase 4 / DRAFT-010)", () => {
  it("wakes from sleepUntil after 24h and auto-sends if still pending", async () => {
    mockPendingDraft();
    mockRunPreSendSafetyCheck.mockResolvedValue(null);
    mockApproveDraftAtomic.mockResolvedValue({ ok: true, reason: "approved", new_status: "approved" });

    const result = await runInngestStep(autonomousModeBTimerHandler, makeEvent());

    expect(result).toMatchObject({ sent: true, draftId: "draft-1" });
    const sent = getSentEvents();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ name: "draft/send_via_gmail" });
  });

  it("uses CAS to flip status pending → approved exactly once", async () => {
    mockPendingDraft();
    mockRunPreSendSafetyCheck.mockResolvedValue(null);
    mockApproveDraftAtomic.mockResolvedValue({ ok: true, reason: "approved", new_status: "approved" });

    await runInngestStep(autonomousModeBTimerHandler, makeEvent("draft-2"));

    expect(mockApproveDraftAtomic).toHaveBeenCalledOnce();
    expect(mockApproveDraftAtomic).toHaveBeenCalledWith("draft-2", "mode_b");
  });

  it("no-ops when the draft was already approved by the coach", async () => {
    mockSingle.mockResolvedValue({
      data: { status: "approved", lead_id: "lead-1", sequence_id: "seq-1" },
    });

    const result = await runInngestStep(autonomousModeBTimerHandler, makeEvent("draft-3"));

    expect(result).toMatchObject({ cancelled: true, reason: "not_pending:approved" });
    expect(getSentEvents()).toHaveLength(0);
    expect(mockApproveDraftAtomic).not.toHaveBeenCalled();
  });
});
