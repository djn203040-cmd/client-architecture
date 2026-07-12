import "server-only";
import { adminClient } from "@/lib/supabase/admin";

interface INotificationLogRow {
  coach_id: string;
  channel: string;
  status: string;
  event_type?: string;
  draft_id?: string | null;
  external_id?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Insert a notification_log row, surfacing insert failures instead of dropping
 * them. supabase-js returns { error } rather than throwing, and the channel
 * adapters historically ignored it, which is how a missing event_type column
 * silently swallowed every slack/sms/whatsapp/dashboard log row in prod for
 * weeks (#77). Best-effort by design (a lost log row must never fail the send
 * that produced it), but never silent. IDs only in the log line, no PII.
 */
export async function writeNotificationLog(row: INotificationLogRow): Promise<void> {
  const { error } = await adminClient.from("notification_log").insert(row);
  if (error) {
    console.error("[notification_log] insert failed", {
      channel: row.channel,
      event_type: row.event_type ?? null,
      status: row.status,
      reason: error.message,
    });
  }
}
