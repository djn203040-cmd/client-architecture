import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { verifyCalComSignature, normalizeCalComPayload } from "@/lib/calendar";
import { LEAD_NO_SHOW, LEAD_CALL_BOOKED } from "@client/shared/constants/events";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const coachId = new URL(request.url).searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // Signature verification — timing-safe (CAL-004, T-03-01)
  const valid = verifyCalComSignature(
    rawBody,
    request.headers.get("x-cal-signature-256"),
    process.env.CAL_COM_WEBHOOK_SECRET!
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // Verify coach exists (T-03-05)
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const event = normalizeCalComPayload(JSON.parse(rawBody), coachId);
  if (!event) return new Response("OK", { status: 200 });

  // Deduplicate — UNIQUE(provider, external_event_id, event_type) (SEQ-014, CAL-005).
  // event_type is part of the key: one booking uid produces both 'booking_created'
  // and (later) 'no_show', and both must be recorded.
  const { data: existing } = await adminClient
    .from("calendar_events")
    .select("id")
    .eq("provider", event.provider)
    .eq("external_event_id", event.externalEventId)
    .eq("event_type", event.eventType)
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
      id: `${event.provider}-${event.externalEventId}-${event.eventType}`,
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
