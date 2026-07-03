import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { getCalendarProvider, type CalendarProviderId } from "@/lib/calendar/providers";

// #64 — Calendar analogue of lib/gmail/error-handler.ts (invalid_grant) and
// lib/slack/error-handler.ts (auth_revoked).
//
// A refresh failure only means "the coach must reconnect" when the provider's
// TOKEN endpoint rejects our authenticated request as no-longer-authorized:
// HTTP 401, or the OAuth2 error code `invalid_grant` (RFC 6749 §5.2 — refresh
// token expired/revoked/invalid). Everything else — network errors, 5xx, 429,
// or `invalid_client` (our env misconfigured, not the coach's grant) — must
// NOT flip a healthy integration to broken. Webhook-signature 401s in
// /api/webhooks/calendar/* are deliberately NOT a signal either: that URL is
// public, so garbage POSTs would spam the coach.
export function isCalendarAuthDeadError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { status?: unknown; oauthErrorCode?: unknown; message?: unknown };
  if (err.status === 401) return true;
  if (err.oauthErrorCode === "invalid_grant") return true;
  if (typeof err.message === "string" && err.message.toLowerCase().includes("invalid_grant")) {
    return true;
  }
  return false;
}

export async function handleCalendarIntegrationBroken(
  coachId: string,
  providerId: CalendarProviderId,
): Promise<void> {
  // 1. Dedup guard: only notify on the connected → disconnected TRANSITION.
  //    The health check runs on a cron, so a persistently-broken integration
  //    would otherwise re-notify the coach every run.
  const { data: existing } = await adminClient
    .from("integrations")
    .select("status")
    .eq("coach_id", coachId)
    .eq("provider", providerId)
    .maybeSingle();
  const wasConnected = existing?.status === "connected";

  // 2. Flag the integration so the dashboard shows it broken and the next
  //    health-check run skips it (the poller only selects status=connected).
  //    Unlike Gmail (the send channel), a dead calendar doesn't make sends
  //    unsafe — we do NOT pause sequences here, mirroring Slack.
  await adminClient
    .from("integrations")
    .update({
      status: "disconnected",
      error_message: "Calendar OAuth revoked — reconnect required",
      last_checked_at: new Date().toISOString(),
    })
    .eq("coach_id", coachId)
    .eq("provider", providerId);

  if (!wasConnected) return;

  // 3. Tell the coach their calendar connection broke so they can reconnect.
  //    Fires notification/integration_broken — the same matrix-driven fan-out
  //    Gmail and Slack use (channel rendering shipped with #58). Best-effort:
  //    a notification failure must not re-throw inside the health-check path.
  const label = getCalendarProvider(providerId)?.label ?? providerId;
  try {
    await inngest.send({
      name: "notification/integration_broken",
      data: {
        coachId,
        eventType: "integration_broken",
        payload: { provider: label },
      },
    });
  } catch {
    // Swallow — the integration is already marked disconnected; the coach will
    // also see the broken state in the dashboard.
  }
}
