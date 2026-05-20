import "server-only";
import { randomUUID } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import type { TNotificationEvent, TChannelResult } from "@client/shared";

export async function sendDashboard(event: TNotificationEvent): Promise<TChannelResult> {
  const externalId = randomUUID();
  try {
    const { error } = await adminClient.from("notification_log").insert({
      coach_id: event.coachId,
      event_type: event.eventType,
      draft_id: event.payload.draftId ?? null,
      channel: "dashboard",
      external_id: externalId,
      status: "sent",
    });
    if (error) throw error;
    return { channel: "dashboard", status: "sent", external_id: externalId, error_message: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send_failed";
    return { channel: "dashboard", status: "failed", external_id: null, error_message: msg };
  }
}
