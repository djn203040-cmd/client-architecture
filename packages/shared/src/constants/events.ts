export const LEAD_NO_SHOW = "lead/no_show";
export const LEAD_CALL_BOOKED = "lead/call_booked";
export const LEAD_CALL_COMPLETED = "lead/call_completed";
export const LEAD_REPLIED = "lead/replied";
export const LEAD_BOUNCED = "lead/bounced";
export const LEAD_UNSUBSCRIBED = "lead/unsubscribed";
export const LEAD_MANUALLY_ENROLLED = "lead/manually_enrolled";
export const DRAFT_READY = "draft/ready";
export const DRAFT_APPROVED = "draft/approved";
export const DRAFT_HELD = "draft/held";
export const DRAFT_REGENERATE = "draft/regenerate";
// Fired when a sequence touchpoint draft is generated; carries the fixed cadence
// send time. The sequence-scheduled-send function sleeps until that time, then
// sends per the coach's autonomous mode — decoupled from when the coach approves.
export const DRAFT_SCHEDULED_SEND = "draft/scheduled_send";
export const INTEGRATION_DISCONNECTED = "integration/disconnected";
export const GMAIL_WATCH_RENEW = "gmail/watch_renew";
