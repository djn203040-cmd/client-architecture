import { adminClient } from "@/lib/supabase/admin";
import { getCalendarProvider, type CalendarProviderId } from "@/lib/calendar/providers";
import { refreshAccessToken } from "@/lib/oauth/shared";
import { isCalendarAuthDeadError, handleCalendarIntegrationBroken } from "./error-handler";

// #64 — proactive calendar OAuth health check.
//
// Calendar integrations are webhook-inbound: after connect-time webhook
// registration nothing makes an authenticated outbound call, so a revoked
// grant was invisible until bookings silently stopped arriving. Refreshing
// the token against the provider's token endpoint is the one authenticated,
// unambiguous probe we have — and it keeps a live access token in Vault as a
// side effect.

// OAuth2 calendar providers whose token endpoint supports
// grant_type=refresh_token. Setmore, TidyCal and Cal.com are API-key
// integrations (different failure mode — out of scope for #64). Acuity is
// OAuth2 but issues non-expiring tokens without a refresh_token; the
// vault-shape guard below skips those rows naturally if no refresh_token
// was ever issued.
export const REFRESHABLE_CALENDAR_PROVIDERS = [
  "calendly",
  "acuity",
  "square",
  "ms_bookings",
] as const satisfies readonly CalendarProviderId[];

// Refresh anything expiring inside this window — or with unknown expiry.
// The check runs daily, so 72h guarantees at least one authenticated probe
// before a token actually lapses, with slack for a missed run.
const REFRESH_WINDOW_SECONDS = 72 * 60 * 60;

export type TCalendarHealthResult = "fresh" | "refreshed" | "skipped" | "broken" | "error";

// Providers disagree on how they report expiry: MS Bookings gives relative
// `expires_in` only, Calendly adds an absolute `created_at` (epoch seconds),
// Square returns an ISO-8601 `expires_at` string, and our own write-back
// stores epoch-seconds `expires_at`. Returns epoch seconds, or null when the
// blob carries no usable expiry (→ caller refreshes every run, which is the
// safe default: the probe IS the health check).
export function computeExpiresAt(tokens: Record<string, unknown>): number | null {
  const ea = tokens["expires_at"];
  if (typeof ea === "number" && Number.isFinite(ea)) return ea;
  if (typeof ea === "string") {
    const parsed = Date.parse(ea);
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  const expiresIn = tokens["expires_in"];
  const createdAt = tokens["created_at"];
  if (typeof expiresIn === "number" && typeof createdAt === "number") {
    return createdAt + expiresIn;
  }
  return null;
}

export async function checkCalendarIntegration(
  coachId: string,
  providerId: CalendarProviderId,
): Promise<TCalendarHealthResult> {
  const config = getCalendarProvider(providerId);
  if (!config || config.authType !== "oauth2" || !config.oauth) return "skipped";

  // Vault read — same RPC the connect flow writes through (store_calendar_tokens
  // in 20260525000001_calendar_active_provider.sql).
  const { data } = await adminClient.schema("private").rpc("get_calendar_tokens", {
    p_coach_id: coachId,
    p_provider: providerId,
  });
  const tokens = (data ?? null) as Record<string, unknown> | null;
  if (!tokens) return "skipped"; // nothing in Vault — the connect flow owns this state

  const refreshToken = typeof tokens["refresh_token"] === "string" ? tokens["refresh_token"] : "";
  if (!refreshToken) return "skipped"; // e.g. Acuity non-expiring token: nothing to probe

  const expiresAt = computeExpiresAt(tokens);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (expiresAt !== null && expiresAt - nowSeconds > REFRESH_WINDOW_SECONDS) return "fresh";

  let refreshed;
  try {
    refreshed = await refreshAccessToken({ provider: config, refreshToken });
  } catch (e) {
    if (isCalendarAuthDeadError(e)) {
      // Authenticated invalid_grant/401 from the provider's token endpoint —
      // the grant is dead. Mark disconnected + notify (dedup lives in the
      // handler: it only emits on the connected → disconnected transition).
      await handleCalendarIntegrationBroken(coachId, providerId);
      return "broken";
    }
    // Transient (network, 5xx, 429, provider hiccup): leave the integration
    // connected — flipping status on ambiguous noise is exactly what #64
    // forbids. Stamp last_checked_at so the dashboard shows the probe ran.
    await adminClient
      .from("integrations")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("coach_id", coachId)
      .eq("provider", providerId);
    return "error";
  }

  // Write-back: merge over the stored blob so provider-specific fields
  // (owner/organization URIs, merchant ids, …) survive, and never lose the
  // refresh token when the provider rotates or omits it.
  const merged: Record<string, unknown> = {
    ...tokens,
    ...(refreshed.raw as Record<string, unknown>),
    refresh_token: refreshed.refresh_token ?? refreshToken,
  };
  // Stamp an absolute expiry for the next run — but never clobber a
  // provider-supplied ISO `expires_at` (Square) with our computed epoch value.
  if (typeof merged["expires_at"] !== "string" && refreshed.expires_at) {
    merged["expires_at"] = refreshed.expires_at;
  }

  await adminClient.schema("private").rpc("store_calendar_tokens", {
    p_coach_id: coachId,
    p_provider: providerId,
    p_tokens: merged as object,
  });

  await adminClient
    .from("integrations")
    .update({ last_checked_at: new Date().toISOString(), error_message: null })
    .eq("coach_id", coachId)
    .eq("provider", providerId);

  return "refreshed";
}
