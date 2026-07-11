import { adminClient } from "@/lib/supabase/admin";
import type { TInviteCoachInput } from "@client/shared/validators";

export async function inviteCoach({ email, name }: TInviteCoachInput) {
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept`;

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { role: "coach", name },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Invite failed");
  }

  // Create coach profile (RLS bypass via service role, ADMIN-005)
  const { error: insertError } = await adminClient.from("coaches").insert({
    id: data.user.id,
    email,
    name,
    role: "coach",
  });
  if (insertError) {
    // Roll back the auth user, invite without profile is broken
    await adminClient.auth.admin.deleteUser(data.user.id);
    throw new Error(`Failed to create coach profile: ${insertError.message}`);
  }

  return { user_id: data.user.id, email };
}
