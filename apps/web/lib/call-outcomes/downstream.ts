import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import {
  LEAD_NO_SHOW,
  LEAD_CALL_COMPLETED,
  LEAD_CONVERTED,
} from "@client/shared/constants/events";
import type { TCallOutcomeValue } from "@client/shared";

export interface FireCallOutcomeDownstreamArgs {
  outcome: TCallOutcomeValue;
  coachId: string;
  leadId: string;
  callOutcomeId: string;
}

/**
 * Drive the correct downstream track once an outcome is recorded (D-15). Called
 * by the API PATCH handler and the Slack interactivity branch (07-03) AFTER a
 * successful atomic record. Each branch is idempotent so a double-call (e.g. a
 * late provider no_show after a manual decision) no-ops.
 *
 * - no_show    -> LEAD_NO_SHOW (sequence-no-show.ts, unchanged).
 * - completed  -> LEAD_CALL_COMPLETED (simplified follow-up track).
 * - converted  -> cancel active sequences, set status='converted', write the
 *                 call_converted timeline event, emit LEAD_CONVERTED.
 *
 * CONVERTED is live-not-nurtured (D-01): see packages/shared/src/lib/state-machine.ts
 * — converted is ABSENT from SEND_BLOCK_STATES (reply-driven / approved drafts to
 * a converted client still send) and present only in NURTURE_BLOCK_STATES
 * (auto-enrollment / re-engagement skip it). Never set do_not_contact here.
 */
export async function fireCallOutcomeDownstream({
  outcome,
  coachId,
  leadId,
}: FireCallOutcomeDownstreamArgs): Promise<void> {
  if (outcome === "no_show") {
    await inngest.send({ name: LEAD_NO_SHOW, data: { coachId, leadId } });
    return;
  }

  if (outcome === "completed") {
    await inngest.send({ name: LEAD_CALL_COMPLETED, data: { coachId, leadId } });
    return;
  }

  // converted — idempotent inline (D-15, Claude's discretion allows inline).
  // (a) Cancel any active intake / follow-up / no-show sequences for the lead.
  await adminClient
    .from("sequences")
    .update({ status: "cancelled" })
    .eq("coach_id", coachId)
    .eq("lead_id", leadId)
    .eq("status", "active");

  // (b) Mark the lead converted — but NEVER regress a lost / do_not_contact lead,
  // and NEVER set do_not_contact / touch contactability (D-01). The guard makes
  // a double-call a no-op once the lead is already converted/terminal.
  await adminClient
    .from("leads")
    .update({ status: "converted" })
    .eq("id", leadId)
    .not("status", "in", "(converted,lost,do_not_contact)");

  // (c) Timeline event — call_converted (added to lead_event_type in 07-01).
  await adminClient.from("lead_events").insert({
    coach_id: coachId,
    lead_id: leadId,
    event_type: "call_converted",
    payload: { reason: "call_outcome_converted" },
    triggered_by: "coach",
  });

  // (d) Broadcast for any cancelOn consumers that should retire on conversion.
  await inngest.send({ name: LEAD_CONVERTED, data: { coachId, leadId } });
}
