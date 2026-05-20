import { admin } from "./createCoach";

export async function createLead(
  coachId: string,
  overrides: Partial<{ name: string; email: string; status: string; do_not_contact: boolean; bounced: boolean }> = {},
) {
  const { data, error } = await admin
    .from("leads")
    .insert({
      coach_id: coachId,
      name: overrides.name ?? "Test Lead",
      email: overrides.email ?? `lead-${crypto.randomUUID()}@sonorous.test`,
      source: "manual",
      status: overrides.status ?? "call_completed",
      do_not_contact: overrides.do_not_contact ?? false,
      bounced: overrides.bounced ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
