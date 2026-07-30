import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { verifySquareSignature, normalizeSquarePayload } from "@/lib/calendar";
import { verifyUrlTokenIfProvisioned } from "@/lib/calendar/webhook-secrets";
import { processCalendarEvent } from "@/lib/calendar/process-event";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const coachId = url.searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // Square HMAC includes full notification URL in hash input (CAL-004, T-07-01).
  // Fail closed if the signature key is unset.
  const signatureKey = process.env.SQUARE_WEBHOOK_SECRET;
  if (!signatureKey) return new Response("Unauthorized", { status: 401 });
  const notificationUrl = url.toString();
  const valid = verifySquareSignature(
    rawBody,
    request.headers.get("x-square-hmacsha256-signature"),
    signatureKey,
    notificationUrl
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // Coach binding: Square's key can't be chosen per coach, so the per-coach
  // Vault secret rides in the pasted webhook URL as `?token=` (and is covered
  // by Square's URL-inclusive HMAC). Required once provisioned;
  // pre-provisioning connections pass on signature alone until reconnected.
  const tokenOk = await verifyUrlTokenIfProvisioned(
    coachId,
    "square",
    url.searchParams.get("token"),
  );
  if (!tokenOk) return new Response("Unauthorized", { status: 401 });

  // Verify coach exists (T-07-01)
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const event = normalizeSquarePayload(JSON.parse(rawBody), coachId);
  if (!event) return new Response("OK", { status: 200 });

  await processCalendarEvent(event);
  return new Response("OK", { status: 200 });
}
