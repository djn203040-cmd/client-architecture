import { describe, it, expect } from "vitest";
import { buildDraftOutcome } from "@/lib/autonomous-mode";

const DRAFT_ID = "draft-uuid-1";
const COACH_ID = "coach-uuid-1";
const LEAD_NAME = "Jane Doe";
const NOW = "2026-05-20T12:00:00.000Z";

describe("buildDraftOutcome (04-08 draft dispatch branching)", () => {
  describe("mode_a — auto-approve, send immediately", () => {
    it("returns status=approved", () => {
      const { status } = buildDraftOutcome("mode_a", DRAFT_ID, COACH_ID, LEAD_NAME, "high", NOW);
      expect(status).toBe("approved");
    });

    it("fires draft/send_via_gmail with source=mode_a", () => {
      const { events } = buildDraftOutcome("mode_a", DRAFT_ID, COACH_ID, LEAD_NAME, "high", NOW);
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("draft/send_via_gmail");
      expect(events[0].data).toMatchObject({ draftId: DRAFT_ID, coachId: COACH_ID, source: "mode_a" });
    });
  });

  describe("mode_b — pending with 24h auto-send timer", () => {
    it("returns status=pending", () => {
      const { status } = buildDraftOutcome("mode_b", DRAFT_ID, COACH_ID, LEAD_NAME, "high", NOW);
      expect(status).toBe("pending");
    });

    it("fires draft/created_mode_b with scheduledSendAt 24h after now", () => {
      const { events } = buildDraftOutcome("mode_b", DRAFT_ID, COACH_ID, LEAD_NAME, "high", NOW);
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("draft/created_mode_b");

      const { scheduledSendAt } = events[0].data as { scheduledSendAt: string };
      const delta = new Date(scheduledSendAt).getTime() - new Date(NOW).getTime();
      expect(delta).toBe(24 * 60 * 60 * 1000);
    });

    it("includes draftId and coachId in mode_b event", () => {
      const { events } = buildDraftOutcome("mode_b", DRAFT_ID, COACH_ID, LEAD_NAME, "low", NOW);
      expect(events[0].data).toMatchObject({ draftId: DRAFT_ID, coachId: COACH_ID });
    });
  });

  describe("off / null / unknown — manual review flow", () => {
    const modes = ["off", null, undefined, "manual"] as const;

    it.each(modes)("returns status=pending for mode=%s", (mode) => {
      const { status } = buildDraftOutcome(mode, DRAFT_ID, COACH_ID, LEAD_NAME, "high", NOW);
      expect(status).toBe("pending");
    });

    it.each(modes)("fires both draft/created_pending and notification/draft_ready for mode=%s", (mode) => {
      const { events } = buildDraftOutcome(mode, DRAFT_ID, COACH_ID, LEAD_NAME, "high", NOW);
      expect(events).toHaveLength(2);
      const names = events.map((e) => e.name);
      expect(names).toContain("draft/created_pending");
      expect(names).toContain("notification/draft_ready");
    });

    it("draft/created_pending carries createdAt=now", () => {
      const { events } = buildDraftOutcome("off", DRAFT_ID, COACH_ID, LEAD_NAME, "high", NOW);
      const pending = events.find((e) => e.name === "draft/created_pending")!;
      expect(pending.data).toMatchObject({ draftId: DRAFT_ID, coachId: COACH_ID, createdAt: NOW });
    });

    it("notification/draft_ready carries eventType, draftId, leadName, confidenceLevel", () => {
      const { events } = buildDraftOutcome("off", DRAFT_ID, COACH_ID, LEAD_NAME, "low", NOW);
      const notif = events.find((e) => e.name === "notification/draft_ready")!;
      expect(notif.data).toMatchObject({
        coachId: COACH_ID,
        eventType: "draft_ready",
        payload: { draftId: DRAFT_ID, leadName: LEAD_NAME, confidenceLevel: "low" },
      });
    });
  });
});
