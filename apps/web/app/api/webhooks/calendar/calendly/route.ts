import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { verifyCalendlySignature, normalizeCalendlyPayload } from "@/lib/calendar";
import { getStoredCalendarWebhookSecret } from "@/lib/calendar/webhook-secrets";
import { processCalendarEvent } from "@/lib/calendar/process-event";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const coachId = new URL(request.url).searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // Signature verification, timing-safe (CAL-004, T-07-01). The signing key is
  // the per-coach secret registered with Calendly at connect time (Vault), so a
  // valid signature also proves the payload belongs to this coachId, the query
  // param alone is a locator, not a credential. Env secret is a dev/test
  // fallback for coaches with no provisioned secret; fail closed on neither.
  const secret =
    (await getStoredCalendarWebhookSecret(coachId, "calendly")) ??
    process.env.CALENDLY_WEBHOOK_SECRET ??
    null;
  if (!secret) return new Response("Unauthorized", { status: 401 });
  const valid = verifyCalendlySignature(
    rawBody,
    request.headers.get("calendly-webhook-signature"),
    secret
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // Verify coach exists (T-07-01)
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const event = normalizeCalendlyPayload(JSON.parse(rawBody), coachId);
  if (!event) return new Response("OK", { status: 200 });

  await processCalendarEvent(event);
  return new Response("OK", { status: 200 });
}
