import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";

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

  // 3. Tell the coach their Gmail connection broke so they can reconnect.
  // This fires notification/integration_broken — the same matrix-driven fan-out
  // every other notification uses (the dispatcher already registers this event,
  // and email/slack/sms each render an integration_broken branch). Previously
  // this only wrote a perpetually-"pending" notification_log row that nothing
  // sent, so the integration_broken toggle was dead. Best-effort: a notification
  // failure must not mask or re-throw inside the OAuth error path.
  try {
    await inngest.send({
      name: "notification/integration_broken",
      data: {
        coachId,
        eventType: "integration_broken",
        payload: { provider: "Gmail" },
      },
    });
  } catch {
    // Swallow — the integration is already marked disconnected and sequences
    // paused; the coach will also see the broken state in the dashboard.
  }
}
