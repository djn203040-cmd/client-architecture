import type { TSequence, TSequenceStatus } from "@client/shared/types";
import {
  formatDateInTZ,
  formatSendWhenInTZ,
  type DateLocale,
} from "@/lib/format/datetime";

// Cadence defaults mirror the Inngest sequence functions
// (sequence-no-show.ts / sequence-call-completed.ts). Each number is a
// day-offset from the sequence start at which a touchpoint fires.
const DEFAULT_DELAYS: Record<string, number[]> = {
  no_show: [1, 3, 7, 14, 21],
  call_completed: [1, 4, 10],
};

/**
 * All human-facing text the sequence view produces. The UI passes a localized
 * slice (from the i18n dictionary) so the "Forløb" panel reads in the coach's
 * language; when omitted, DEFAULT_SEQUENCE_LABELS (English) is used, which keeps
 * this lib usable in tests and non-UI callers without a dictionary.
 */
export type TSequenceLabels = {
  tracks: { no_show: string; call_completed: string; fallback: string };
  halted: { cancelled: string; held: string; paused: string };
  detail: {
    sent: (date: string) => string;
    overdueShouldHaveSent: (date: string) => string;
    approvedSends: (when: string) => string;
    sendWindowPassed: (date: string) => string;
    awaitingApproval: (when: string) => string;
    preparing: string;
    onHold: string;
    genError: string;
    overdueWasDue: (date: string) => string;
    sends: (when: string) => string;
    wontSend: string;
    paused: string;
    sendsDate: (date: string) => string;
  };
};

export const DEFAULT_SEQUENCE_LABELS: TSequenceLabels = {
  tracks: {
    no_show: "No-show follow-up",
    call_completed: "Post-call nurture",
    fallback: "Intake sequence",
  },
  halted: {
    cancelled: "Sequence stopped",
    held: "On hold",
    paused: "Paused, lead replied",
  },
  detail: {
    sent: (date) => `Sent ${date}`,
    overdueShouldHaveSent: (date) => `Overdue · should have sent ${date}`,
    approvedSends: (when) => `Approved · sends ${when}`,
    sendWindowPassed: (date) => `Send window passed ${date} · wasn't approved in time`,
    awaitingApproval: (when) => `Awaiting your approval · sends ${when}`,
    preparing: "Preparing draft…",
    onHold: "On hold",
    genError: "Couldn't generate, needs a retry",
    overdueWasDue: (date) => `Overdue · was due ${date}`,
    sends: (when) => `Sends ${when}`,
    wontSend: "Won't send",
    paused: "Paused",
    sendsDate: (date) => `Sends ${date}`,
  },
};

export type TSequenceConfig = {
  no_show_delays?: number[];
  call_completed_delays?: number[];
} | null;

export type TSequenceStepState = "done" | "next" | "upcoming";

// Drives the per-step label + accent colour in the stepper.
export type TSequenceStepTone =
  | "sent" // delivered
  | "done" // past (time-based, no draft data)
  | "approved" // coach approved; waiting for the scheduled send
  | "awaiting" // draft ready, waiting for the coach to approve
  | "preparing" // draft is generating
  | "hold" // coach put it on hold
  | "error" // generation failed
  | "overdue" // send time passed but it never went out
  | "paused" // sequence halted (lead replied / cancelled / on hold), no send pending
  | "scheduled"; // not generated yet / future

export type TSequenceStep = {
  index: number; // 1-based touchpoint number
  dayOffset: number; // days from sequence start
  scheduledAt: string; // ISO timestamp
  dateLabel: string; // e.g. "May 31"
  state: TSequenceStepState;
  draftStatus: string | null; // the matched draft's status, if any
  tone: TSequenceStepTone;
  detail: string; // human label, e.g. "Approved · sends May 31"
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
  /**
   * Coach's IANA timezone (e.g. "Europe/Copenhagen"). All send times in the
   * view render in this zone so the coach reads their own wall clock, not UTC.
   * Falls back to the launch default when absent.
   */
  timeZone?: string | null;
  /** Localized text for every label the view emits. Defaults to English. */
  labels?: TSequenceLabels;
  /** Date/time locale for scheduled sends. Defaults to en-US. */
  locale?: DateLocale;
};

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
  const tz = options.timeZone;
  const labels = options.labels ?? DEFAULT_SEQUENCE_LABELS;
  const locale = options.locale ?? "en-US";
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
  // The sequence is stopped: a reply paused it, the coach cancelled it, or it's
  // on hold. No touchpoint is pending, so don't project a "next send", that was
  // the bug where a paused (lead-replied) sequence still read "Sends tomorrow".
  const halted =
    sequence.status === "paused" ||
    sequence.status === "cancelled" ||
    sequence.status === "held";
  const haltedDetail =
    sequence.status === "cancelled"
      ? labels.halted.cancelled
      : sequence.status === "held"
        ? labels.halted.held
        : labels.halted.paused;

  // Index real drafts by touchpoint. When a touchpoint has more than one draft
  // (e.g. regenerated), keep the most-advanced by status rank.
  const STATUS_RANK: Record<string, number> = {
    sent: 6,
    approved: 5,
    edited: 5,
    pending: 4,
    generating: 3,
    held: 2,
    error: 1,
    cancelled: 0,
  };
  const sentByTouchpoint = new Set<number>();
  const scheduledByTouchpoint = new Map<number, string>();
  const statusByTouchpoint = new Map<number, string>();
  for (const d of drafts ?? []) {
    if (d.touchpoint_index == null) continue;
    if (d.status === "sent" || d.sent_at) sentByTouchpoint.add(d.touchpoint_index);
    if (d.scheduled_send_at) scheduledByTouchpoint.set(d.touchpoint_index, d.scheduled_send_at);
    const prev = statusByTouchpoint.get(d.touchpoint_index);
    if (!prev || (STATUS_RANK[d.status] ?? -1) > (STATUS_RANK[prev] ?? -1)) {
      statusByTouchpoint.set(d.touchpoint_index, d.status);
    }
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
    const scheduledDate = new Date(s.scheduledAt);
    const dateLabel = formatDateInTZ(scheduledDate, tz, locale);
    const sendWhen = formatSendWhenInTZ(scheduledDate, now, tz, locale);
    const draftStatus = statusByTouchpoint.get(s.index) ?? null;
    const isSent = sentByTouchpoint.has(s.index);

    let state: TSequenceStepState;
    let tone: TSequenceStepTone;
    let detail: string;

    if (s.done) {
      state = "done";
      completedSteps += 1;
      if (isSent) {
        tone = "sent";
        detail = labels.detail.sent(dateLabel);
      } else {
        tone = "done";
        detail = dateLabel;
      }
    } else if (i === firstPendingIdx && halted) {
      // Sequence is stopped at this step, show why, and don't advertise a send.
      state = "next";
      tone = "paused";
      detail = haltedDetail;
    } else if (i === firstPendingIdx) {
      state = "next";
      nextSendAt = s.scheduledAt;
      nextSendLabel = sendWhen;
      // The send time has come and gone but nothing was delivered. With draft
      // data this means the scheduled send never fired (e.g. a dropped timer), 
      // surface it instead of pretending it's still "sends <past time>".
      const overdue = hasDraftData && new Date(s.scheduledAt).getTime() < now.getTime();
      switch (draftStatus) {
        case "approved":
        case "edited":
          if (overdue) {
            tone = "overdue";
            detail = labels.detail.overdueShouldHaveSent(dateLabel);
          } else {
            tone = "approved";
            // Approval is decoupled from send: make it explicit that the message
            // is locked in and will go out at its fixed cadence time.
            detail = labels.detail.approvedSends(sendWhen);
          }
          break;
        case "pending":
          if (overdue) {
            tone = "overdue";
            detail = labels.detail.sendWindowPassed(dateLabel);
          } else {
            tone = "awaiting";
            detail = labels.detail.awaitingApproval(sendWhen);
          }
          break;
        case "generating":
          tone = "preparing";
          detail = labels.detail.preparing;
          break;
        case "held":
          tone = "hold";
          detail = labels.detail.onHold;
          break;
        case "error":
          tone = "error";
          detail = labels.detail.genError;
          break;
        default:
          if (overdue) {
            tone = "overdue";
            detail = labels.detail.overdueWasDue(dateLabel);
          } else {
            tone = "scheduled";
            detail = labels.detail.sends(sendWhen);
          }
      }
    } else {
      state = "upcoming";
      if (halted) {
        // Downstream steps won't fire while the sequence is stopped, don't
        // imply a future send date that isn't coming.
        tone = "paused";
        detail = sequence.status === "cancelled" ? labels.detail.wontSend : labels.detail.paused;
      } else {
        tone = "scheduled";
        detail = labels.detail.sendsDate(dateLabel);
      }
    }

    return {
      index: s.index,
      dayOffset: s.dayOffset,
      scheduledAt: s.scheduledAt,
      dateLabel,
      state,
      draftStatus,
      tone,
      detail,
    };
  });

  const currentStep = finished
    ? delays.length
    : Math.min(completedSteps + 1, Math.max(delays.length, 1));

  const trackLabel =
    track === "no_show"
      ? labels.tracks.no_show
      : track === "call_completed"
        ? labels.tracks.call_completed
        : labels.tracks.fallback;

  return {
    track,
    trackLabel,
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
