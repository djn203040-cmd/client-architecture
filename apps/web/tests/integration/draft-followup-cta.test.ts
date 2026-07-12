import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetInngestQueue } from "@/tests/utils/inngest-runner";

const mockInngestSend = vi.fn().mockResolvedValue({ ids: ["test-id"] });
vi.mock("@/inngest/client", () => ({
  inngest: { send: mockInngestSend, createFunction: vi.fn() },
}));

const mockHoldDraftAtomic = vi.fn().mockResolvedValue({ ok: true, reason: "held", new_status: "held" });
vi.mock("@/lib/drafts/approve-atomic", () => ({
  holdDraftAtomic: mockHoldDraftAtomic,
}));

// Draft status returns, controlled per-test via mockFrom
let draftStatusSequence: Array<string | null> = [];
let draftStatusCallCount = 0;

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: mockAdminFrom, rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

function setupDraftMock(statusSequence: Array<string | null>) {
  draftStatusSequence = statusSequence;
  draftStatusCallCount = 0;
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "drafts") {
      return {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          const idx = Math.min(draftStatusCallCount, draftStatusSequence.length - 1);
          draftStatusCallCount++;
          const status = draftStatusSequence[idx];
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
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Alice", email: "alice@test.com" }, error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

async function runFollowupCta(firstStatus: string | null = "pending", secondStatus: string | null = "pending") {
  setupDraftMock([firstStatus, secondStatus]);
  const { draftFollowupCtaHandler } = await import("@/inngest/functions/draft-followup-cta");

  const sleepUntilIds: string[] = [];
  const step = {
    run: vi.fn(async (_id: string, fn: () => unknown) => fn()),
    sleepUntil: vi.fn(async (id: string) => { sleepUntilIds.push(id); }),
    sleep: vi.fn(), sendEvent: vi.fn().mockResolvedValue({ ids: [] }),
    waitForEvent: vi.fn().mockResolvedValue(null), invoke: vi.fn().mockResolvedValue(null),
  };

  const event = { name: "draft/created_pending", data: { draftId: "draft-abc", coachId: "coach-xyz", createdAt: new Date(Date.now() - 1000).toISOString() } };
  // The vi.fn() step mock infers a non-generic `run`; cast to the handler's
  // param type to bridge the generic gap (the mock is structurally complete).
  const result = await draftFollowupCtaHandler(
    { event, step } as Parameters<typeof draftFollowupCtaHandler>[0],
  );
  return { result, step, sleepUntilIds };
}

beforeEach(() => {
  resetInngestQueue();
  mockInngestSend.mockClear();
  mockHoldDraftAtomic.mockClear();
  vi.resetModules();
});

describe("draft-followup-cta (Phase 4 / DRAFT-007)", () => {
  it("schedules step.sleepUntil for +24h when no approval action taken", async () => {
    const { sleepUntilIds } = await runFollowupCta("pending", "pending");
    expect(sleepUntilIds).toContain("sleep-24h-followup");
  });

  it("increments followup_count on the draft when the CTA fires", async () => {
    const { step } = await runFollowupCta("pending", "pending");
    expect(step.run).toHaveBeenCalledWith("increment-followup-count", expect.any(Function));
    expect(step.run).toHaveBeenCalledWith("fire-followup-notification", expect.any(Function));
  });

  it("does NOT send a follow-up CTA if the draft was already approved", async () => {
    const { result, step } = await runFollowupCta("approved", "approved");
    expect((result as { cancelled: boolean }).cancelled).toBe(true);
    expect((result as { stage: string }).stage).toBe("24h");
    expect(step.run).not.toHaveBeenCalledWith("increment-followup-count", expect.any(Function));
  });
});
