import { admin } from "./createCoach";

export async function cleanupCoach(coachId: string) {
  // ON DELETE CASCADE handles leads/drafts/sequences/integrations/etc.
  await admin.from("coaches").delete().eq("id", coachId);
  await admin.auth.admin.deleteUser(coachId);
}
