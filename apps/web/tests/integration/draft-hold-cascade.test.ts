import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetInngestQueue } from "@/tests/utils/inngest-runner";

vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ["test-id"] }), createFunction: vi.fn() },
}));

const mockHoldDraftAtomic = vi.fn().mockResolvedValue({ ok: true, reason: "held", new_status: "held" });
vi.mock("@/lib/drafts/approve-atomic", () => ({
  holdDraftAtomic: mockHoldDraftAtomic,
}));

let statusSequence: Array<string | null> = [];
let statusCallCount = 0;

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: mockAdminFrom, rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

function setupMock(sequence: Array<string | null>) {
  statusSequence = sequence;
  statusCallCount = 0;
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "drafts") {
      return {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          const idx = Math.min(statusCallCount, statusSequence.length - 1);
          statusCallCount++;
          const status = statusSequence[idx];
          return {
            maybeSingle: vi.fn().mockResolvedValue({
              data: status ? { status, lead_id: "lead-1", followup_count: 0, body: "Hi", subject: "Re:", scheduled_send_at: null } : null,
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: { followup_count: 0, body: "Hi", subject: "Re:", scheduled_send_at: null, lead_id: "lead-1" },
              error: null,
            }),
          };
        }),
      };
    }
    if (table === "leads") {
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Bob", email: "bob@test.com" }, error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

async function runCascade(firstStatus = "pending", secondStatus = "pending") {
  setupMock([firstStatus, secondStatus]);
  const { draftFollowupCtaHandler } = await import("@/inngest/functions/draft-followup-cta");

  const sleepUntilIds: string[] = [];
  const step = {
    run: vi.fn(async (_id: string, fn: () => unknown) => fn()),
    sleepUntil: vi.fn(async (id: string) => { sleepUntilIds.push(id); }),
    sleep: vi.fn(), sendEvent: vi.fn().mockResolvedValue({ ids: [] }),
    waitForEvent: vi.fn().mockResolvedValue(null), invoke: vi.fn().mockResolvedValue(null),
  };

  const event = {
    name: "draft/created_pending",
    data: { draftId: "draft-cascade", coachId: "coach-1", createdAt: new Date(Date.now() - 1000).toISOString() },
  };
  const result = await draftFollowupCtaHandler({ event, step });
  return { result, step, sleepUntilIds };
}

beforeEach(() => {
  resetInngestQueue();
  mockHoldDraftAtomic.mockClear();
  vi.resetModules();
});

describe("draft-hold-cascade (Phase 4 / DRAFT-008)", () => {
  it("schedules a second sleepUntil for the +48h hold step", async () => {
    const { sleepUntilIds } = await runCascade("pending", "pending");
    expect(sleepUntilIds).toContain("sleep-24h-followup");
    expect(sleepUntilIds).toContain("sleep-48h-cascade");
  });

  it("transitions draft.status to 'held' after the second window expires", async () => {
    const { result } = await runCascade("pending", "pending");
    expect(mockHoldDraftAtomic).toHaveBeenCalledWith("draft-cascade", "hold_cascade");
    expect((result as { cascaded_to_held: boolean }).cascaded_to_held).toBe(true);
  });

  it("does NOT cascade into HOLD when the draft is already approved", async () => {
    const { result } = await runCascade("pending", "approved");
    expect(mockHoldDraftAtomic).not.toHaveBeenCalled();
    expect((result as { cancelled: boolean }).cancelled).toBe(true);
    expect((result as { stage: string }).stage).toBe("48h");
  });
});
