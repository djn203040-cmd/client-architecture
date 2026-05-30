import type { TSequence, TSequenceStatus } from "@client/shared/types";

// Cadence defaults mirror the Inngest sequence functions
// (sequence-no-show.ts / sequence-call-completed.ts). Each number is a
// day-offset from the sequence start at which a touchpoint fires.
const DEFAULT_DELAYS: Record<string, number[]> = {
  no_show: [1, 3, 7, 14, 21],
  call_completed: [1, 4, 10],
};

const TRACK_LABELS: Record<string, string> = {
  no_show: "No-show follow-up",
  call_completed: "Post-call nurture",
};

export type TSequenceConfig = {
  no_show_delays?: number[];
  call_completed_delays?: number[];
} | null;

export type TSequenceStepState = "done" | "next" | "upcoming";

export type TSequenceStep = {
  index: number; // 1-based touchpoint number
  dayOffset: number; // days from sequence start
  scheduledAt: string; // ISO timestamp
  dateLabel: string; // e.g. "May 31"
  state: TSequenceStepState;
};

export type TSequenceView = {
  track: string;
  trackLabel: string;
  status: TSequenceStatus;
  startedAt: string;
  totalSteps: number;
  currentStep: number; // 1-based touchpoint we're waiting on (= total when finished)
  completedSteps: number;
  nextSendAt: string | null;
  nextSendLabel: string | null;
  steps: TSequenceStep[];
};

/** Minimal draft shape needed to reflect real send progress on the stepper. */
export type TSequenceDraft = {
  touchpoint_index: number | null;
  status: string;
  sent_at: string | null;
  scheduled_send_at: string | null;
};

export type TBuildSequenceOptions = {
  now?: Date;
  /** Sequence-linked drafts; when present, a step is "done" only once actually sent. */
  drafts?: TSequenceDraft[];
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Builds a follow-along view of a lead's sequence: each touchpoint with its
 * scheduled date and whether it's done, up next, or upcoming.
 *
 * When sequence-linked drafts are supplied, a step is "done" only once its draft
 * has actually been sent, and its real `scheduled_send_at` is used. Without
 * drafts, it falls back to a purely time-based projection from the sequence
 * start + the coach's cadence.
 */
export function buildSequenceView(
  sequence: Pick<TSequence, "track" | "status" | "created_at">,
  config: TSequenceConfig,
  options: TBuildSequenceOptions = {}
): TSequenceView {
  const now = options.now ?? new Date();
  const drafts = options.drafts;
  const hasDraftData = Array.isArray(drafts);

  const track = sequence.track;
  const configured =
    track === "no_show"
      ? config?.no_show_delays
      : track === "call_completed"
        ? config?.call_completed_delays
        : undefined;
  const delays = configured ?? DEFAULT_DELAYS[track] ?? [];

  const start = new Date(sequence.created_at);
  const finished = sequence.status === "completed";

  // Index real drafts by touchpoint for accurate "sent" + scheduled-time signals.
  const sentByTouchpoint = new Set<number>();
  const scheduledByTouchpoint = new Map<number, string>();
  for (const d of drafts ?? []) {
    if (d.touchpoint_index == null) continue;
    if (d.status === "sent" || d.sent_at) sentByTouchpoint.add(d.touchpoint_index);
    if (d.scheduled_send_at) scheduledByTouchpoint.set(d.touchpoint_index, d.scheduled_send_at);
  }

  // First pass: scheduled time + done/not-done per step.
  const raw = delays.map((dayOffset, i) => {
    const index = i + 1;
    const computed = new Date(start);
    computed.setDate(computed.getDate() + dayOffset);
    const scheduledAt = scheduledByTouchpoint.get(index) ?? computed.toISOString();

    const done = finished
      ? true
      : hasDraftData
        ? sentByTouchpoint.has(index)
        : new Date(scheduledAt) <= now;

    return { index, dayOffset, scheduledAt, done };
  });

  const firstPendingIdx = raw.findIndex((s) => !s.done);
  let completedSteps = 0;
  let nextSendAt: string | null = null;
  let nextSendLabel: string | null = null;

  const steps: TSequenceStep[] = raw.map((s, i) => {
    let state: TSequenceStepState;
    if (s.done) {
      state = "done";
      completedSteps += 1;
    } else if (i === firstPendingIdx) {
      state = "next";
      nextSendAt = s.scheduledAt;
      nextSendLabel = formatDate(new Date(s.scheduledAt));
    } else {
      state = "upcoming";
    }
    return {
      index: s.index,
      dayOffset: s.dayOffset,
      scheduledAt: s.scheduledAt,
      dateLabel: formatDate(new Date(s.scheduledAt)),
      state,
    };
  });

  const currentStep = finished
    ? delays.length
    : Math.min(completedSteps + 1, Math.max(delays.length, 1));

  return {
    track,
    trackLabel: TRACK_LABELS[track] ?? "Intake sequence",
    status: sequence.status,
    startedAt: sequence.created_at,
    totalSteps: delays.length,
    currentStep,
    completedSteps,
    nextSendAt,
    nextSendLabel,
    steps,
  };
}
