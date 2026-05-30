import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { TERMINAL_STATES } from "@client/shared";

export async function runPreSendSafetyCheck(
  leadId: string,
  sequenceId: string | null | undefined
): Promise<string | null> {
  const { data: lead } = await adminClient
    .from("leads")
    .select("status, do_not_contact, bounced")
    .eq("id", leadId)
    .single();

  if (!lead || (TERMINAL_STATES as readonly string[]).includes(lead.status)) {
    return "terminal_lead";
  }
  if (lead.do_not_contact || lead.bounced) {
    return "dnc_flag";
  }

  // The sequence-active guard only applies to sequence-attached drafts.
  // Standalone drafts (sequence_id = null, generated ad-hoc from the lead
  // profile — #41) have no sequence to be inactive; their lead-level hard-block
  // states are already enforced above. Without this guard a null sequenceId
  // queries sequences by id=null, returns no row, and wrongly blocks every
  // standalone approval with "sequence_inactive" (the Slack/review-link paths).
  if (sequenceId) {
    const { data: seq } = await adminClient
      .from("sequences")
      .select("status")
      .eq("id", sequenceId)
      .single();
    if (!seq || seq.status !== "active") {
      return "sequence_inactive";
    }
  }
  return null;
}

export function buildDraftGeneratePayload(params: {
  coachId: string;
  leadId: string;
  sequenceId: string;
  touchpointIndex: number;
  track: "no_show" | "call_completed";
}) {
  return {
    name: "draft/generate" as const,
    data: params,
  };
}
