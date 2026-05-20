import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { TNotificationChannel, TNotificationEventType } from "@client/shared";

export interface EnabledChannelSet {
  dashboard: boolean;
  email: boolean;
  slack: boolean;
  whatsapp: boolean;
  sms: boolean;
}

// D-15: SMS is unconditional for hard bounce regardless of coach pref
export const CHANNELS_FOR_HARD_BOUNCE_UNCONDITIONAL: TNotificationChannel[] = ["sms"];

// D-13: Dashboard is always ON
const ALWAYS_ON: TNotificationChannel[] = ["dashboard"];

function channelConnected(channel: TNotificationChannel, connected: Set<string>): boolean {
  if (channel === "dashboard" || channel === "email") return true;
  if (channel === "slack") return connected.has("slack");
  if (channel === "whatsapp" || channel === "sms") return connected.has("twilio");
  return false;
}

export async function computeEnabledChannels(
  coachId: string,
  eventType: TNotificationEventType,
): Promise<EnabledChannelSet> {
  const [prefsResult, integrationsResult] = await Promise.all([
    adminClient
      .from("notification_preferences")
      .select("channel, enabled")
      .eq("coach_id", coachId)
      .eq("event_type", eventType),
    adminClient
      .from("integrations")
      .select("provider, status")
      .eq("coach_id", coachId)
      .eq("status", "connected"),
  ]);

  const prefs = prefsResult.data ?? [];
  const connected = new Set((integrationsResult.data ?? []).map((i) => i.provider as string));

  const prefMap = new Map<TNotificationChannel, boolean>();
  for (const row of prefs) prefMap.set(row.channel as TNotificationChannel, !!row.enabled);

  const isEnabled = (channel: TNotificationChannel): boolean => {
    if (ALWAYS_ON.includes(channel)) return true;
    if (eventType === "hard_bounce" && CHANNELS_FOR_HARD_BOUNCE_UNCONDITIONAL.includes(channel)) {
      return channelConnected(channel, connected);
    }
    const pref = prefMap.get(channel);
    if (pref === undefined) return false;
    return pref && channelConnected(channel, connected);
  };

  return {
    dashboard: isEnabled("dashboard"),
    email: isEnabled("email"),
    slack: isEnabled("slack"),
    whatsapp: isEnabled("whatsapp"),
    sms: isEnabled("sms"),
  };
}
