import { admin } from "./createCoach";

export async function createSequence(
  coachId: string,
  leadId: string,
  overrides: Partial<{ track: string; status: string }> = {},
) {
  const { data, error } = await admin
    .from("sequences")
    .insert({
      coach_id: coachId,
      lead_id: leadId,
      module: 1,
      track: overrides.track ?? "no_show",
      status: overrides.status ?? "active",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
