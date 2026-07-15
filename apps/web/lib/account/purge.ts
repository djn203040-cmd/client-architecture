import "server-only";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Delete every Vault secret a coach owns — the per-integration OAuth tokens
 * (Gmail / calendar / Slack / Twilio, whatever populates
 * `integrations.vault_secret_id`) plus the voice-corpus secret.
 *
 * MUST be called BEFORE the coaches row is cascade-deleted: once that row is
 * gone the integrations rows cascade away with it, and their `vault_secret_id`
 * references — the only pointers to the live tokens in `vault.secrets` — are
 * lost, orphaning working OAuth refresh tokens for a user who asked to be
 * erased. Best-effort by design: a Vault failure must never abort the deletion.
 */
export async function purgeCoachVaultSecrets(coachId: string): Promise<void> {
  const { data: integrations } = await adminClient
    .from("integrations")
    .select("vault_secret_id")
    .eq("coach_id", coachId);

  const secretIds = (integrations ?? [])
    .map((i) => i.vault_secret_id)
    .filter((id): id is string => Boolean(id));

  await Promise.allSettled([
    ...secretIds.map((secret_id) =>
      adminClient.rpc("delete_vault_secret" as never, { secret_id }),
    ),
    adminClient.rpc("delete_voice_corpus" as never, { p_coach_id: coachId }),
  ]);
}
