import "server-only";
import { WebClient } from "@slack/web-api";
import { adminClient } from "@/lib/supabase/admin";

const cache = new Map<string, WebClient>();

export async function getSlackClientForCoach(coachId: string): Promise<WebClient> {
  const cached = cache.get(coachId);
  if (cached) return cached;

  const { data: integration } = await adminClient
    .from("integrations")
    .select("vault_secret_id")
    .eq("coach_id", coachId)
    .eq("provider", "slack")
    .eq("status", "connected")
    .maybeSingle();
  if (!integration?.vault_secret_id) {
    throw new Error("slack_not_connected");
  }

  const { data: secret } = await adminClient
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", integration.vault_secret_id)
    .single();
  if (!secret?.decrypted_secret) throw new Error("slack_token_missing");

  const client = new WebClient(secret.decrypted_secret as string);
  cache.set(coachId, client);
  return client;
}

export function evictSlackClientCache(coachId: string): void {
  cache.delete(coachId);
}
