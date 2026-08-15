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

export type TInviteStatus = "pending" | "accepted";

// A coach has accepted once they've either confirmed the email or signed in.
export async function getInviteStatus(userId: string): Promise<TInviteStatus | null> {
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  const u = data.user;
  return u.email_confirmed_at || u.last_sign_in_at ? "accepted" : "pending";
}

// Re-issue the invite email for a coach whose original link expired.
// Supabase re-sends (and rotates the token) for an existing unconfirmed user;
// for a confirmed user it errors, which we surface as a clear message.
export async function resendCoachInvite(coachId: string) {
  const { data: coach } = await adminClient
    .from("coaches")
    .select("id, email, name")
    .eq("id", coachId)
    .maybeSingle();
  if (!coach) throw new Error("Coach not found");

  const status = await getInviteStatus(coach.id);
  if (status === "accepted") {
    throw new Error("This coach has already accepted their invite — ask them to sign in instead.");
  }

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept`;
  const { error } = await adminClient.auth.admin.inviteUserByEmail(coach.email, {
    redirectTo,
    data: { role: "coach", name: coach.name },
  });
  if (error) throw new Error(error.message);

  return { user_id: coach.id, email: coach.email };
}
