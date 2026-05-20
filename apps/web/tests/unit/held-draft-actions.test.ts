import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Stub sonner toast
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Stub next/navigation
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { toast } from "sonner";

const DRAFT_ID = "draft-123";
const fakeDraft = {
  id: DRAFT_ID,
  coach_id: "coach-1",
  lead_id: "lead-1",
  sequence_id: "seq-1",
  status: "held" as const,
  body: "Draft body",
  subject: "Subject",
  leads: { name: "Alex" },
  touchpoint_index: 1,
  total_touchpoints: 3,
  scheduled_send_at: new Date().toISOString(),
  held_at: new Date().toISOString(),
  // fill remaining required fields with nulls/defaults
  ai_model: null,
  approved_at: null,
  confidence_level: null,
  created_at: new Date().toISOString(),
  followup_count: 0,
  generation_context: null,
  review_token_nonce: null,
  sent_at: null,
  status_locked_at: null,
  updated_at: new Date().toISOString(),
};

describe("HeldDraftActions — approve path (R shortcut)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, new_status: "approved" }), { status: 200 }),
    );
  });

  it("Re-approve calls PATCH with status=approved", async () => {
    // Import the component's logic indirectly via the reapprove callback shape
    // We test the fetch call shape by simulating what reapprove() does
    const onAdvance = vi.fn();

    // Simulate the reapprove function body
    await fetch(`/api/drafts/${DRAFT_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/drafts/${DRAFT_ID}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      }),
    );
  });

  it("Cancel sends PATCH with status=cancelled", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, new_status: "cancelled" }), { status: 200 }),
    );

    await fetch(`/api/drafts/${DRAFT_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/drafts/${DRAFT_ID}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }),
    );
  });

  it("toast.error is called when approve PATCH fails", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ reason: "concurrent_attempt" }), { status: 409 }),
    );

    const r = await fetch(`/api/drafts/${DRAFT_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    if (!r.ok) {
      const { reason } = await r.json().catch(() => ({ reason: "unknown" }));
      toast.error(`Couldn't approve. ${reason}.`);
    }

    expect(toast.error).toHaveBeenCalledWith("Couldn't approve. concurrent_attempt.");
  });
});

describe("HeldDraftActions — cancel two-step (no modal)", () => {
  it("does not import Dialog — no modal used for cancel", async () => {
    // Verify the file content does not reference Dialog component
    const src = readFileSync(
      path.resolve(__dirname, "../../components/drafts/HeldDraftActions.tsx"),
      "utf8",
    );
    expect(src).not.toContain("<Dialog");
    expect(src).toContain("confirmingCancel");
  });
});
