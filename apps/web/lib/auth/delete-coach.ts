import { adminClient } from "@/lib/supabase/admin";

// Hard-deletes a coach. Order matters:
//   1. purge Vault secrets (no FK, would otherwise be orphaned)
//   2. delete the auth user -> cascades public.coaches -> leads, drafts,
//      integrations, sequences, ai_usage, feedback, ... (all ON DELETE CASCADE)
// Refuses to delete an admin so Daniel can't lock himself out from the UI.
export async function deleteCoach(coachId: string) {
  const { data: coach } = await adminClient
    .from("coaches")
    .select("id, email, role")
    .eq("id", coachId)
    .maybeSingle();
  if (!coach) throw new Error("Coach not found");
  if (coach.role === "admin") throw new Error("Admin accounts can't be deleted from here.");

  // private.purge_coach_secrets ships in migration 20260815130000. If it isn't
  // applied yet the delete still proceeds; the encrypted secrets are inert
  // without the user but we flag it so the operator knows to run the migration.
  let secrets_purged = true;
  const { error: purgeError } = await adminClient
    .schema("private")
    .rpc("purge_coach_secrets", { p_coach_id: coachId });
  if (purgeError) {
    if (purgeError.code === "PGRST202" || purgeError.code === "42883") {
      secrets_purged = false;
    } else {
      throw new Error(`Failed to purge secrets: ${purgeError.message}`);
    }
  }

  const { error } = await adminClient.auth.admin.deleteUser(coachId);
  if (error) throw new Error(error.message);

  return { user_id: coachId, email: coach.email, secrets_purged };
}
