import { admin } from "./createCoach";

export async function createDraft(
  coachId: string,
  leadId: string,
  overrides: Partial<{ status: string; body: string; sequenceId: string }> = {},
) {
  const { data, error } = await admin
    .from("drafts")
    .insert({
      coach_id: coachId,
      lead_id: leadId,
      sequence_id: overrides.sequenceId ?? null,
      status: overrides.status ?? "pending",
      body: overrides.body ?? "Hi there, just checking in.",
      subject: "Following up",
      touchpoint_index: 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
