import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { verifyCalComSignature, normalizeCalComPayload } from "@/lib/calendar";
import { getStoredCalendarWebhookSecret } from "@/lib/calendar/webhook-secrets";
import { processCalendarEvent } from "@/lib/calendar/process-event";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const coachId = new URL(request.url).searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // Signature verification, timing-safe (CAL-004, T-07-01). The signing key is
  // the per-coach secret registered with Cal.com at connect time (Vault), so a
  // valid signature also proves the payload belongs to this coachId. Env secret
  // is the fallback for connections that predate per-coach registration; fail
  // closed on neither.
  const secret =
    (await getStoredCalendarWebhookSecret(coachId, "cal_com")) ??
    process.env.CAL_COM_WEBHOOK_SECRET ??
    process.env.CALCOM_WEBHOOK_SECRET ??
    null;
  if (!secret) return new Response("Unauthorized", { status: 401 });
  const valid = verifyCalComSignature(
    rawBody,
    request.headers.get("x-cal-signature-256"),
    secret
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // Verify coach exists (T-07-01)
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const event = normalizeCalComPayload(JSON.parse(rawBody), coachId);
  if (!event) return new Response("OK", { status: 200 });

  await processCalendarEvent(event);
  return new Response("OK", { status: 200 });
}
