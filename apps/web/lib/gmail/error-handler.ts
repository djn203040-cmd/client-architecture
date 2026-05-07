import { adminClient } from "@/lib/supabase/admin";

export class OAuthInvalidGrantError extends Error {
  constructor(public readonly coachId: string) {
    super(`Gmail OAuth invalid_grant for coach ${coachId} — token revoked or expired`);
    this.name = "OAuthInvalidGrantError";
  }
}

export function isInvalidGrantError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { message?: string; response?: { data?: { error?: string } }; code?: string };
  if (err.code === "invalid_grant") return true;
  if (err.response?.data?.error === "invalid_grant") return true;
  if (typeof err.message === "string" && err.message.toLowerCase().includes("invalid_grant")) return true;
  return false;
}

export async function handleInvalidGrant(coachId: string): Promise<void> {
  // 1. Mark integration disconnected
  await adminClient.from("integrations")
    .update({ status: "disconnected", error_message: "OAuth revoked — reconnect required" })
    .eq("coach_id", coachId)
    .eq("provider", "gmail");

  // 2. Pause active sequences for this coach
  await adminClient.from("sequences")
    .update({ status: "paused" })
    .eq("coach_id", coachId)
    .eq("status", "active");

  // 3. Log notification (Phase 4 sends actual email/Slack/WhatsApp)
  await adminClient.from("notification_log").insert({
    coach_id: coachId,
    channel: "email",
    event_type: "oauth_disconnected",
    status: "pending",
  });
}
