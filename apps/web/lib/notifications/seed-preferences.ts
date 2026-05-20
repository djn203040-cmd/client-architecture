import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { TNotificationEventType } from "@client/shared";
import type { Database } from "@client/database";

type DbChannel = Database["public"]["Enums"]["notification_channel"];

const DEFAULT_MATRIX: Array<{
  event_type: TNotificationEventType;
  channel: DbChannel;
  enabled: boolean;
}> = [
  { event_type: "draft_ready",        channel: "dashboard", enabled: true },
  { event_type: "draft_ready",        channel: "email",     enabled: true },
  { event_type: "draft_ready",        channel: "slack",     enabled: true },
  { event_type: "draft_ready",        channel: "whatsapp",  enabled: true },
  { event_type: "draft_ready",        channel: "sms",       enabled: true },
  { event_type: "lead_replied",       channel: "dashboard", enabled: true },
  { event_type: "lead_replied",       channel: "email",     enabled: true },
  { event_type: "lead_replied",       channel: "slack",     enabled: true },
  { event_type: "lead_replied",       channel: "whatsapp",  enabled: true },
  { event_type: "lead_replied",       channel: "sms",       enabled: false },
  { event_type: "integration_broken", channel: "dashboard", enabled: true },
  { event_type: "integration_broken", channel: "email",     enabled: true },
  { event_type: "integration_broken", channel: "slack",     enabled: true },
  { event_type: "integration_broken", channel: "whatsapp",  enabled: false },
  { event_type: "integration_broken", channel: "sms",       enabled: false },
  { event_type: "hard_bounce",        channel: "dashboard", enabled: true },
  { event_type: "hard_bounce",        channel: "email",     enabled: true },
  { event_type: "hard_bounce",        channel: "slack",     enabled: true },
  { event_type: "hard_bounce",        channel: "whatsapp",  enabled: false },
  { event_type: "hard_bounce",        channel: "sms",       enabled: true },
];

export async function seedNotificationPreferences(
  coachId: string,
  channel: DbChannel,
): Promise<{ inserted: number }> {
  const rows = DEFAULT_MATRIX
    .filter((row) => row.channel === channel)
    .map((row) => ({ coach_id: coachId, ...row }));

  const { data, error } = await adminClient
    .from("notification_preferences")
    .upsert(rows, { onConflict: "coach_id,event_type,channel", ignoreDuplicates: true })
    .select("event_type");

  if (error) throw error;
  return { inserted: data?.length ?? 0 };
}
