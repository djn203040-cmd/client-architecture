import { describe, it, expect } from "vitest";
import { createDraftForCoach, setAutonomousMode } from "@/lib/autonomous-mode";

describe("autonomous-mode (Phase 4 / DRAFT-009)", () => {
  it("creates a draft with status='approved' when coach is in Mode A", () => {
    const result = createDraftForCoach("mode_a", {});
    expect(result.status).toBe("approved");
  });

  it("creates a draft with status='pending' when coach is in Mode B", () => {
    const result = createDraftForCoach("mode_b", {});
    expect(result.status).toBe("pending");
  });

  it("creates a draft with status='pending' when coach is in Manual mode", () => {
    const resultOff = createDraftForCoach("off", {});
    expect(resultOff.status).toBe("pending");

    const resultManual = createDraftForCoach("manual", {});
    expect(resultManual.status).toBe("pending");
  });

  it("requires high-friction phrase confirmation before persisting Mode A", () => {
    // Without phrase → rejected
    expect(setAutonomousMode("mode_a")).toEqual({ ok: false, reason: "phrase_mismatch" });

    // Wrong case → rejected (case-sensitive)
    expect(setAutonomousMode("mode_a", "Send Without Review")).toEqual({
      ok: false,
      reason: "phrase_mismatch",
    });

    // Exact match → accepted
    expect(setAutonomousMode("mode_a", "send without review")).toEqual({ ok: true });

    // Mode B — no phrase needed
    expect(setAutonomousMode("mode_b")).toEqual({ ok: true });

    // Manual — no phrase needed
    expect(setAutonomousMode("manual")).toEqual({ ok: true });
  });
});
