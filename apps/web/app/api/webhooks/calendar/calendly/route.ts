import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { verifyCalendlySignature, normalizeCalendlyPayload } from "@/lib/calendar";
import { processCalendarEvent } from "@/lib/calendar/process-event";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const coachId = new URL(request.url).searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // Signature verification, timing-safe (CAL-004, T-07-01)
  const valid = verifyCalendlySignature(
    rawBody,
    request.headers.get("calendly-webhook-signature"),
    process.env.CALENDLY_WEBHOOK_SECRET!
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
