import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { TERMINAL_STATES } from "@client/shared";

export async function runPreSendSafetyCheck(
  leadId: string,
  sequenceId: string
): Promise<string | null> {
  const { data: lead } = await adminClient
    .from("leads")
    .select("status, do_not_contact, bounced")
    .eq("id", leadId)
    .single();

  const { data: seq } = await adminClient
    .from("sequences")
    .select("status")
    .eq("id", sequenceId)
    .single();

  if (!lead || (TERMINAL_STATES as readonly string[]).includes(lead.status)) {
    return "terminal_lead";
  }
  if (lead.do_not_contact || lead.bounced) {
    return "dnc_flag";
  }
  if (!seq || seq.status !== "active") {
    return "sequence_inactive";
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
