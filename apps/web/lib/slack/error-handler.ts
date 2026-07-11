import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { evictSlackClientCache } from "@/lib/slack/client";

// Slack Web API error codes that mean the bot token is dead and the coach must
// reconnect, the Slack analogue of Gmail's invalid_grant. Transient codes
// (rate_limited, internal_error, channel_not_found, …) are deliberately excluded
// so a momentary blip never cries wolf and flips a healthy integration to broken.
const REVOKED_CODES = new Set([
  "invalid_auth",
  "account_inactive",
  "token_revoked",
  "token_expired",
  "not_authed",
]);

// The Slack SDK rejects with a WebAPIPlatformError carrying `data.error` (the raw
// Slack code); our own send paths instead throw `Error("slack_post_failed:<code>")`.
// Detect both shapes plus a bare string so callers can pass the error verbatim.
export function isSlackAuthRevokedError(e: unknown): boolean {
  if (typeof e === "string") {
    return [...REVOKED_CODES].some((code) => e.includes(code));
  }
  if (typeof e !== "object" || e === null) return false;
  const err = e as { data?: { error?: string }; message?: string };
  if (typeof err.data?.error === "string" && REVOKED_CODES.has(err.data.error)) return true;
  if (typeof err.message === "string") {
    return [...REVOKED_CODES].some((code) => err.message!.includes(code));
  }
  return false;
}

export async function handleSlackIntegrationBroken(coachId: string): Promise<void> {
  // 1. Flag the integration so the dashboard shows it broken and the next send
  //    short-circuits on the status check instead of hammering the dead token.
  //    Unlike Gmail (a send channel), Slack is only a notification channel, we
  //    do NOT pause sequences here; the coach's email keeps working.
  await adminClient.from("integrations")
    .update({ status: "disconnected", error_message: "Slack token revoked, reconnect required" })
    .eq("coach_id", coachId)
    .eq("provider", "slack");

  // 2. Drop the cached WebClient so a reconnect doesn't keep using the dead token.
  evictSlackClientCache(coachId);

  // 3. Tell the coach their Slack connection broke so they can reconnect. Fires
  //    notification/integration_broken, the same matrix-driven fan-out Gmail
  //    uses (dashboard + email stay enabled, so the notice still lands even
  //    though Slack itself is down). Best-effort: a notification failure must
  //    not mask or re-throw inside the send error path that called us.
  try {
    await inngest.send({
      name: "notification/integration_broken",
      data: {
        coachId,
        eventType: "integration_broken",
        payload: { provider: "Slack" },
      },
    });
  } catch {
    // Swallow, the integration is already marked disconnected; the coach will
    // also see the broken state in the dashboard.
  }
}
