import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { verifyAcuitySignature, normalizeAcuityPayload } from "@/lib/calendar";
import { verifyUrlTokenIfProvisioned } from "@/lib/calendar/webhook-secrets";
import { processCalendarEvent } from "@/lib/calendar/process-event";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const coachId = url.searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // Signature verification, timing-safe (CAL-004, T-07-01). Acuity signs with
  // an app-level key we can't choose, so the signature alone can't bind
  // coachId; fail closed if the key is unset.
  const apiKey = process.env.ACUITY_API_KEY;
  if (!apiKey) return new Response("Unauthorized", { status: 401 });
  const valid = verifyAcuitySignature(
    rawBody,
    request.headers.get("x-acuity-signature"),
    apiKey
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // Coach binding: the per-coach Vault secret rides in the registered target
  // URL as `?token=` (see registerAcuityWebhook). Required once provisioned;
  // pre-provisioning connections pass on signature alone until reconnected.
  const tokenOk = await verifyUrlTokenIfProvisioned(
    coachId,
    "acuity",
    url.searchParams.get("token"),
  );
  if (!tokenOk) return new Response("Unauthorized", { status: 401 });

  // Verify coach exists (T-07-01)
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const event = normalizeAcuityPayload(JSON.parse(rawBody), coachId);
  if (!event) return new Response("OK", { status: 200 });

  await processCalendarEvent(event);
  return new Response("OK", { status: 200 });
}
