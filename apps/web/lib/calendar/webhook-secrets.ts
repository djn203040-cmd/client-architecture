import "server-only";
import { timingSafeEqual } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import type { CalendarProviderId } from "@/lib/calendar/providers";

/**
 * Per-coach webhook secret resolution.
 *
 * The signed calendar providers used to verify against a single env-level
 * secret, which left the `?coachId=` query param unbound: the signature proved
 * the payload came from the provider, not that it belonged to that coach. A
 * malicious tenant could point their own (validly signed) webhook at another
 * coach's receiver URL and inject leads into that coach's account.
 *
 * Binding now comes from the per-coach secret in Vault:
 *  - calendly / cal_com: the secret IS the HMAC signing key registered with
 *    the provider at connect time, so the signature itself binds the coach.
 *  - acuity / square: the provider signs with an app-level key we can't choose,
 *    so the coach-binding secret rides in the registered URL as `?token=`
 *    (same trust model as the signature-less providers, #82).
 */
export async function getStoredCalendarWebhookSecret(
  coachId: string,
  provider: CalendarProviderId,
): Promise<string | null> {
  const { data, error } = await adminClient
    .schema("private")
    .rpc("get_calendar_webhook_secret", {
      p_coach_id: coachId,
      p_provider: provider,
    });
  if (error || typeof data !== "string" || data.length === 0) return null;
  return data;
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Coach-binding check for providers whose signature key is app-level (acuity,
 * square). Requires the URL token to match the Vault secret once one is
 * provisioned. Coaches connected before provisioning existed have no stored
 * secret and pass on signature alone (they must reconnect to gain binding),
 * rejecting them outright would silently drop their real bookings.
 */
export async function verifyUrlTokenIfProvisioned(
  coachId: string,
  provider: CalendarProviderId,
  token: string | null,
): Promise<boolean> {
  const stored = await getStoredCalendarWebhookSecret(coachId, provider);
  if (!stored) return true;
  if (!token) return false;
  return timingSafeEqualStrings(token, stored);
}
