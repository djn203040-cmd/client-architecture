// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildSequenceView, type TSequenceDraft } from "@/lib/sequences/progress";

const START = "2026-05-01T12:00:00.000Z";

describe("buildSequenceView (time-based fallback)", () => {
  it("uses the no_show default cadence (5 touchpoints)", () => {
    const view = buildSequenceView(
      { track: "no_show", status: "active", created_at: START },
      null,
      { now: new Date("2026-05-01T13:00:00.000Z") } // same day, before any send
    );
    expect(view.totalSteps).toBe(5);
    expect(view.steps.map((s) => s.dayOffset)).toEqual([1, 3, 7, 14, 21]);
    expect(view.steps.every((s) => s.state === "next" || s.state === "upcoming")).toBe(true);
  });

  it("uses the call_completed default cadence (3 touchpoints)", () => {
    const view = buildSequenceView(
      { track: "call_completed", status: "active", created_at: START },
      null,
      { now: new Date(START) }
    );
    expect(view.steps.map((s) => s.dayOffset)).toEqual([1, 4, 10]);
  });

  it("respects coach custom cadence over defaults", () => {
    const view = buildSequenceView(
      { track: "no_show", status: "active", created_at: START },
      { no_show_delays: [2, 5], call_completed_delays: [1] },
      { now: new Date(START) }
    );
    expect(view.steps.map((s) => s.dayOffset)).toEqual([2, 5]);
  });

  it("marks past touchpoints done, the first future one as next", () => {
    // 8 days in: day 1 + 3 + 7 are past, day 14 is next, day 21 upcoming
    const view = buildSequenceView(
      { track: "no_show", status: "active", created_at: START },
      null,
      { now: new Date("2026-05-09T12:00:00.000Z") }
    );
    expect(view.steps.map((s) => s.state)).toEqual([
      "done",
      "done",
      "done",
      "next",
      "upcoming",
    ]);
    expect(view.completedSteps).toBe(3);
    expect(view.currentStep).toBe(4);
    expect(view.nextSendAt).toBe("2026-05-15T12:00:00.000Z");
  });

  it("treats a completed sequence as all-done with no next send", () => {
    const view = buildSequenceView(
      { track: "no_show", status: "completed", created_at: START },
      null,
      { now: new Date("2026-05-02T12:00:00.000Z") } // early, but status overrides
    );
    expect(view.steps.every((s) => s.state === "done")).toBe(true);
    expect(view.currentStep).toBe(5);
    expect(view.nextSendAt).toBeNull();
  });
});

describe("buildSequenceView (real draft data)", () => {
  it("marks a step done only when its draft is actually sent, not just past-due", () => {
    // 8 days in: by time, steps 1-3 are past. But only TP1 + TP2 actually sent;
    // TP3 is still pending (e.g. manual mode, unapproved) → it becomes "next".
    const drafts: TSequenceDraft[] = [
      { touchpoint_index: 1, status: "sent", sent_at: "2026-05-02T12:00:00.000Z", scheduled_send_at: "2026-05-02T12:00:00.000Z" },
      { touchpoint_index: 2, status: "sent", sent_at: "2026-05-04T12:00:00.000Z", scheduled_send_at: "2026-05-04T12:00:00.000Z" },
      { touchpoint_index: 3, status: "pending", sent_at: null, scheduled_send_at: "2026-05-08T12:00:00.000Z" },
    ];
    const view = buildSequenceView(
      { track: "no_show", status: "active", created_at: START },
      null,
      { now: new Date("2026-05-09T12:00:00.000Z"), drafts }
    );
    expect(view.steps.map((s) => s.state)).toEqual([
      "done",
      "done",
      "next", // past-due but NOT sent → still the awaiting step
      "upcoming",
      "upcoming",
    ]);
    expect(view.completedSteps).toBe(2);
    expect(view.currentStep).toBe(3);
  });

  it("prefers the draft's real scheduled_send_at over the computed date", () => {
    const drafts: TSequenceDraft[] = [
      { touchpoint_index: 1, status: "pending", sent_at: null, scheduled_send_at: "2026-05-02T09:30:00.000Z" },
    ];
    const view = buildSequenceView(
      { track: "no_show", status: "active", created_at: START },
      { no_show_delays: [1], call_completed_delays: [1] },
      { now: new Date(START), drafts }
    );
    expect(view.steps[0]!.scheduledAt).toBe("2026-05-02T09:30:00.000Z");
    expect(view.steps[0]!.state).toBe("next");
  });

  it("labels the current step by its draft status (awaiting vs approved)", () => {
    const base = { track: "no_show", status: "active", created_at: START } as const;
    const cfg = { no_show_delays: [1, 3], call_completed_delays: [1] };

    const awaiting = buildSequenceView(base, cfg, {
      now: new Date(START),
      drafts: [
        { touchpoint_index: 1, status: "pending", sent_at: null, scheduled_send_at: "2026-05-31T12:00:00.000Z" },
      ],
    });
    expect(awaiting.steps[0]!.state).toBe("next");
    expect(awaiting.steps[0]!.tone).toBe("awaiting");
    expect(awaiting.steps[0]!.detail).toBe("Awaiting your approval");

    const approved = buildSequenceView(base, cfg, {
      now: new Date(START),
      drafts: [
        { touchpoint_index: 1, status: "approved", sent_at: null, scheduled_send_at: "2026-05-31T12:00:00.000Z" },
      ],
    });
    expect(approved.steps[0]!.tone).toBe("approved");
    expect(approved.steps[0]!.detail).toBe("Approved · sends May 31");
  });

  it("marks a sent step's detail as Sent and held/error tones correctly", () => {
    const view = buildSequenceView(
      { track: "no_show", status: "active", created_at: START },
      { no_show_delays: [1, 3], call_completed_delays: [1] },
      {
        now: new Date("2026-06-02T12:00:00.000Z"),
        drafts: [
          { touchpoint_index: 1, status: "sent", sent_at: "2026-05-31T12:00:00.000Z", scheduled_send_at: "2026-05-31T12:00:00.000Z" },
          { touchpoint_index: 2, status: "held", sent_at: null, scheduled_send_at: "2026-06-02T12:00:00.000Z" },
        ],
      }
    );
    expect(view.steps[0]!.tone).toBe("sent");
    expect(view.steps[0]!.detail).toMatch(/^Sent /);
    expect(view.steps[1]!.state).toBe("next");
    expect(view.steps[1]!.tone).toBe("hold");
    expect(view.steps[1]!.detail).toBe("On hold");
  });

  it("with an empty drafts array, nothing is done yet (first step is next)", () => {
    const view = buildSequenceView(
      { track: "no_show", status: "active", created_at: START },
      null,
      { now: new Date("2026-05-30T12:00:00.000Z"), drafts: [] }
    );
    // Even though every cadence date is in the past, no draft has sent.
    expect(view.completedSteps).toBe(0);
    expect(view.steps[0]!.state).toBe("next");
    expect(view.steps.slice(1).every((s) => s.state === "upcoming")).toBe(true);
  });
});
