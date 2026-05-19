import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { verifyCalendlySignature, normalizeCalendlyPayload } from "@/lib/calendar";
import { LEAD_NO_SHOW, LEAD_CALL_BOOKED } from "@client/shared/constants/events";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const coachId = new URL(request.url).searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // Signature verification — timing-safe (CAL-004, T-03-01)
  const valid = verifyCalendlySignature(
    rawBody,
    request.headers.get("calendly-webhook-signature"),
    process.env.CALENDLY_WEBHOOK_SECRET!
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // Verify coach exists (T-03-05)
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const event = normalizeCalendlyPayload(JSON.parse(rawBody), coachId);
  if (!event) return new Response("OK", { status: 200 });

  // Deduplicate — UNIQUE(provider, external_event_id) (SEQ-014, CAL-005)
  const { data: existing } = await adminClient
    .from("calendar_events")
    .select("id")
    .eq("provider", event.provider)
    .eq("external_event_id", event.externalEventId)
    .maybeSingle();
  if (existing) return new Response("OK", { status: 200 });

  let leadId: string | null = null;
  if (event.leadEmail) {
    const { data: lead } = await adminClient
      .from("leads")
      .select("id")
      .eq("coach_id", coachId)
      .eq("email", event.leadEmail)
      .maybeSingle();
    leadId = lead?.id ?? null;
  }

  await adminClient.from("calendar_events").insert({
    coach_id: coachId,
    provider: event.provider,
    external_event_id: event.externalEventId,
    lead_id: leadId,
    event_type: event.eventType,
    payload: event.rawPayload,
  });

  const inngestEventName =
    event.eventType === "no_show" ? LEAD_NO_SHOW :
    event.eventType === "booking_created" ? LEAD_CALL_BOOKED :
    null;

  if (inngestEventName && leadId) {
    await inngest.send({
      id: `${event.provider}-${event.externalEventId}`,
      name: inngestEventName,
      data: {
        coachId,
        leadId,
        provider: event.provider,
        externalEventId: event.externalEventId,
        eventStartAt: event.eventStartAt,
        eventEndAt: event.eventEndAt,
      },
    });
  }

  return new Response("OK", { status: 200 });
}
