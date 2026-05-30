import "server-only";
import { WebClient } from "@slack/web-api";
import { adminClient } from "@/lib/supabase/admin";

const cache = new Map<string, WebClient>();

export async function getSlackClientForCoach(coachId: string): Promise<WebClient> {
  const cached = cache.get(coachId);
  if (cached) return cached;

  // Read the bot token via the SECURITY DEFINER RPC. A direct
  // schema("vault").from("decrypted_secrets") query fails with PGRST106 — the
  // vault schema is not exposed to PostgREST (only public, graphql_public,
  // private are). Mirrors the gmail token-read pattern (private.get_gmail_tokens).
  const { data: token, error } = await adminClient
    .schema("private")
    .rpc("get_slack_token", { p_coach_id: coachId });
  if (error || !token) throw new Error("slack_token_missing");

  const client = new WebClient(token as string);
  cache.set(coachId, client);
  return client;
}

export function evictSlackClientCache(coachId: string): void {
  cache.delete(coachId);
}
