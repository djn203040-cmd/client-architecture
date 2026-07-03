import "server-only";
import { timingSafeEqual } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import type { CalendarProviderId } from "@/lib/calendar/providers";

/**
 * Token verification for the three "manual" calendar providers that offer NO
 * HMAC webhook signature — Setmore, TidyCal, Microsoft Bookings (#82).
 *
 * These providers can't sign their payloads, so the previous stub verifiers
 * returned `true` and the *only* gate was a `coachId` query param. But coachId
 * is a locator, not a secret: it rides in webhook URLs, logs, and provider
 * dashboards, so anyone who learned it could POST a forged booking and inject a
 * fake lead + kick off real outbound email.
 *
 * The fix reuses the per-coach webhook secret we already generate and store in
 * Vault (see /api/auth/calendar/webhook-info): the coach pastes a URL carrying
 * `?token=<secret>`, and we timing-safe compare that token against the stored
 * secret for (coachId, provider). No matching secret → reject. This is the same
 * trust model as an HMAC signature, just carried in the URL because the provider
 * can't put it in a header.
 */
export async function verifyCalendarWebhookToken(
  coachId: string,
  provider: CalendarProviderId,
  token: string | null,
): Promise<boolean> {
  if (!token) return false;

  const { data: stored, error } = await adminClient
    .schema("private")
    .rpc("get_calendar_webhook_secret", {
      p_coach_id: coachId,
      p_provider: provider,
    });

  // Fail closed: no secret provisioned (coach never opened the webhook panel) or
  // a lookup error means we cannot trust the request.
  if (error || typeof stored !== "string" || stored.length === 0) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
