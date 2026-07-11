import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import {
  LEAD_CALL_BOOKED,
  LEAD_NO_SHOW,
} from "@client/shared/constants/events";
import type { TCalendarEvent } from "@client/shared";
import { upsertLeadFromBooking } from "./upsert-lead";
import { recordCallOutcomeAtomic } from "@/lib/call-outcomes/record-atomic";

// Calendar rescheduled/cancelled fan-out events consumed by the wave-2 monitor.
const CALENDAR_RESCHEDULED = "calendar/rescheduled";
const CALENDAR_CANCELLED = "calendar/cancelled";

/**
 * The single path all 7 calendar webhook handlers call (D-11).
 *
 * Inserts the calendar_events row (existing dedup on
 * provider+external_event_id+event_type), then branches on event.eventType.
 * Because a booking always resolves to a lead now, LEAD_CALL_BOOKED always
 * fires, closing the standing no-lead gap (D-12).
 *
 * Server-only: uses the service-role admin client; coach_id always comes from
 * the verified webhook coachId.
 */
export async function processCalendarEvent(event: TCalendarEvent): Promise<void> {
  const coachId = event.coachId;

  // Dedup: one booking uid fires booking_created then later no_show, so the key
  // includes event_type (migration 20260530000002). Early-return on a repeat.
  const { data: existing } = await adminClient
    .from("calendar_events")
    .select("id")
    .eq("provider", event.provider)
    .eq("external_event_id", event.externalEventId)
    .eq("event_type", event.eventType)
    .maybeSingle();
  if (existing) return;

  switch (event.eventType) {
    case "booking_created": {
      const leadId = await upsertLeadFromBooking(event);

      // Insert the calendar_events row now that we have the lead.
      const { data: calEvent } = await adminClient
        .from("calendar_events")
        .insert({
          coach_id: coachId,
          provider: event.provider,
          external_event_id: event.externalEventId,
          lead_id: leadId,
          event_type: event.eventType,
          payload: event.rawPayload,
        })
        .select("id")
        .single();

      // Timeline event.
      await adminClient.from("lead_events").insert({
        coach_id: coachId,
        lead_id: leadId,
        event_type: "call_booked",
        payload: {
          provider: event.provider,
          external_event_id: event.externalEventId,
          scheduled_at: event.eventStartAt,
        },
        triggered_by: event.provider,
      });

      // Open the outcome row (dedup-safe).
      await adminClient
        .from("call_outcomes")
        .upsert(
          {
            coach_id: coachId,
            lead_id: leadId,
            calendar_event_id: calEvent?.id ?? null,
            provider: event.provider,
            external_event_id: event.externalEventId,
            scheduled_at: event.eventStartAt,
            ends_at: event.eventEndAt,
            status: "scheduled",
          },
          { onConflict: "coach_id,external_event_id", ignoreDuplicates: true },
        );

      // Resolve the (now guaranteed) callOutcomeId to pass downstream.
      const { data: outcomeRow } = await adminClient
        .from("call_outcomes")
        .select("id")
        .eq("coach_id", coachId)
        .eq("external_event_id", event.externalEventId)
        .maybeSingle();

      await inngest.send({
        id: `${event.provider}-${event.externalEventId}`,
        name: LEAD_CALL_BOOKED,
        data: {
          coachId,
          leadId,
          provider: event.provider,
          externalEventId: event.externalEventId,
          eventStartAt: event.eventStartAt,
          eventEndAt: event.eventEndAt,
          callOutcomeId: outcomeRow?.id ?? null,
        },
      });
      return;
    }

    case "no_show": {
      // Record the calendar_events row for the audit trail.
      const { data: lead } = await adminClient
        .from("call_outcomes")
        .select("id, lead_id, status")
        .eq("coach_id", coachId)
        .eq("external_event_id", event.externalEventId)
        .maybeSingle();

      await adminClient.from("calendar_events").insert({
        coach_id: coachId,
        provider: event.provider,
        external_event_id: event.externalEventId,
        lead_id: lead?.lead_id ?? null,
        event_type: event.eventType,
        payload: event.rawPayload,
      });

      if (!lead) return;

      // Provider is authoritative (D-03). The atomic RPC only resolves from
      // 'awaiting_outcome'; if the monitor has not yet flipped the row to
      // awaiting_outcome (still 'scheduled'), pre-arm it so the CAS succeeds.
      if (lead.status === "scheduled") {
        await adminClient
          .from("call_outcomes")
          .update({ status: "awaiting_outcome", prompted_at: new Date().toISOString() })
          .eq("id", lead.id)
          .eq("status", "scheduled");
      }

      const result = await recordCallOutcomeAtomic(lead.id, "no_show", "provider");
      if (result.ok) {
        await inngest.send({
          id: `${event.provider}-${event.externalEventId}-no_show`,
          name: LEAD_NO_SHOW,
          data: {
            coachId,
            leadId: lead.lead_id,
            provider: event.provider,
            externalEventId: event.externalEventId,
            callOutcomeId: lead.id,
          },
        });
      }
      return;
    }

    case "rescheduled": {
      await adminClient.from("calendar_events").insert({
        coach_id: coachId,
        provider: event.provider,
        external_event_id: event.externalEventId,
        lead_id: null,
        event_type: event.eventType,
        payload: event.rawPayload,
      });

      const { data: outcome } = await adminClient
        .from("call_outcomes")
        .select("id, lead_id")
        .eq("coach_id", coachId)
        .eq("external_event_id", event.externalEventId)
        .maybeSingle();
      if (!outcome) return;

      await adminClient
        .from("call_outcomes")
        .update({
          scheduled_at: event.eventStartAt,
          ends_at: event.eventEndAt,
          status: "scheduled",
          prompted_at: null,
        })
        .eq("id", outcome.id);

      // Re-arm the monitor deterministically: cancel the stale run, then arm a
      // fresh one against the new window. The re-emit id carries the new start
      // time so it is not deduped against the original LEAD_CALL_BOOKED.
      await inngest.send({
        name: CALENDAR_RESCHEDULED,
        data: { callOutcomeId: outcome.id },
      });
      await inngest.send({
        id: `${event.provider}-${event.externalEventId}-resched-${event.eventStartAt}`,
        name: LEAD_CALL_BOOKED,
        data: {
          coachId,
          leadId: outcome.lead_id,
          provider: event.provider,
          externalEventId: event.externalEventId,
          eventStartAt: event.eventStartAt,
          eventEndAt: event.eventEndAt,
          callOutcomeId: outcome.id,
        },
      });
      return;
    }

    case "cancelled": {
      await adminClient.from("calendar_events").insert({
        coach_id: coachId,
        provider: event.provider,
        external_event_id: event.externalEventId,
        lead_id: null,
        event_type: event.eventType,
        payload: event.rawPayload,
      });

      const { data: outcome } = await adminClient
        .from("call_outcomes")
        .select("id")
        .eq("coach_id", coachId)
        .eq("external_event_id", event.externalEventId)
        .maybeSingle();
      if (!outcome) return;

      await adminClient
        .from("call_outcomes")
        .update({ status: "cancelled" })
        .eq("id", outcome.id);

      await inngest.send({
        name: CALENDAR_CANCELLED,
        data: { callOutcomeId: outcome.id },
      });
      return;
    }
  }
}
