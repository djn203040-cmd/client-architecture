import type { Database } from "@client/database";

export type TNotificationEventType =
  | "draft_ready"
  | "lead_replied"
  | "integration_broken"
  | "hard_bounce"
  | "call_outcome_pending";

export type TNotificationPreferenceRow =
  Database["public"]["Tables"]["notification_preferences"]["Row"];

export interface TNotificationEvent {
  coachId: string;
  eventType: TNotificationEventType;
  payload: {
    draftId?: string;
    /** Call Outcomes (D-16): the awaiting call_outcomes row this prompt is for. */
    callOutcomeId?: string;
    /** Human-readable scheduled call time for the call_outcome_pending prompt. */
    callTime?: string;
    leadId?: string;
    leadName?: string;
    leadEmail?: string;
    sendTime?: string;
    body?: string;
    subject?: string;
    confidenceLevel?: "high" | "low";
    /** Human-readable integration name for integration_broken (e.g. "Gmail"). */
    provider?: string;
  };
}

export interface TChannelResult {
  channel: Database["public"]["Enums"]["notification_channel"];
  status: "sent" | "failed" | "skipped";
  external_id: string | null;
  error_message: string | null;
}

export interface TApproveAtomicResult {
  ok: boolean;
  reason: string;
  new_status: Database["public"]["Enums"]["draft_status"] | null;
}
