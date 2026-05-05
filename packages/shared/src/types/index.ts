// Re-exported from @client/database/types after `supabase gen types`
// Phase 1 Plan 02 generates the live types. Until then these are placeholders
// for downstream task type imports.
export type TLeadStatus =
  | "identified" | "call_booked" | "no_show" | "call_completed"
  | "in_sequence" | "replied" | "converted" | "closed"
  | "unsubscribed" | "do_not_contact" | "bounced";

export type TLeadSource =
  | "calendly" | "cal_com" | "acuity" | "setmore" | "square"
  | "ms_bookings" | "tidycal" | "manual" | "gmail_detected"
  | "instagram_detected" | "referral";

export type TDraftStatus =
  | "pending" | "approved" | "edited" | "sent" | "held" | "cancelled";

export type TIntegrationProvider =
  | "gmail" | "calendly" | "cal_com" | "acuity" | "setmore"
  | "square" | "ms_bookings" | "tidycal" | "slack" | "twilio"
  | "instagram";
