import "server-only";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { exchangeSlackCode, verifyOAuthState } from "@/lib/slack/oauth";
import { getSlackClientForCoach, evictSlackClientCache } from "@/lib/slack/client";
import { seedNotificationPreferences } from "@/lib/notifications/seed-preferences";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?error=oauth_slack_missing_params", APP_URL));
  }
  const verifiedState = verifyOAuthState(state);
  if (!verifiedState) {
    return NextResponse.redirect(new URL("/settings?error=oauth_slack_invalid_state", APP_URL));
  }
  const coachId = verifiedState.coachId;

  // 1) Exchange code for bot token
  let tokens: Awaited<ReturnType<typeof exchangeSlackCode>>;
  try {
    tokens = await exchangeSlackCode(code);
  } catch (err) {
    console.warn("slack oauth exchange failed", {
      coachId,
      reason: err instanceof Error ? err.message : "slack_exchange_failed",
    });
    return NextResponse.redirect(new URL("/settings?error=oauth_slack_exchange", APP_URL));
  }

  // 2) Upsert integrations row in intermediate disconnected state
  await adminClient.from("integrations").upsert(
    {
      coach_id: coachId,
      provider: "slack",
      status: "disconnected",
      external_account_id: tokens.authedUserId,
      metadata: { team_id: tokens.teamId, bot_user_id: tokens.botUserId },
    },
    { onConflict: "coach_id,provider" },
  );

  // 3) Vault write via public SECURITY DEFINER RPC (04-01 public wrapper)
  let vaultId: string | null = null;
  try {
    const { data, error } = await adminClient.rpc("store_slack_token", {
      p_coach_id: coachId,
      p_token: tokens.accessToken,
    });
    if (error || !data) throw error ?? new Error("vault_returned_null");
    vaultId = data as string;
  } catch (err) {
    console.warn("slack vault store failed", {
      coachId,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.redirect(new URL("/settings?error=oauth_vault_failed", APP_URL));
  }

  // 4) Mark integration connected
  await adminClient
    .from("integrations")
    .update({
      vault_secret_id: vaultId,
      status: "connected",
      scopes: ["chat:write", "im:write", "users:read"],
      error_message: null,
      last_checked_at: new Date().toISOString(),
    })
    .eq("coach_id", coachId)
    .eq("provider", "slack");

  // 5) Seed slack notification_preferences (idempotent upsert)
  await seedNotificationPreferences(coachId, "slack");

  // 6) Welcome DM (non-fatal)
  try {
    // Evict any stale cached client before using the fresh token
    evictSlackClientCache(coachId);
    const slack = await getSlackClientForCoach(coachId);
    await slack.chat.postMessage({
      channel: tokens.authedUserId, // DM channel = user_id
      text: "Sonorous is connected. You'll receive draft notifications here.",
    });
  } catch {
    // Welcome DM failure is non-fatal
  }

  return NextResponse.redirect(
    new URL("/settings/notifications?connected=slack", APP_URL),
  );
}
