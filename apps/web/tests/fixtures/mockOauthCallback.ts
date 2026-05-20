import { admin } from "./createCoach";

export async function mockOauthCallback(
  provider: "gmail" | "slack" | "twilio",
  coachId: string,
) {
  const { error } = await admin.from("integrations").upsert(
    {
      coach_id: coachId,
      provider,
      status: "connected",
      vault_secret_id: crypto.randomUUID(),
    },
    { onConflict: "coach_id,provider" },
  );
  if (error) throw error;
}
