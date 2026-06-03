import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getCalendarProvider } from "@/lib/calendar/providers";
import { verifyOAuthState, exchangeAuthorizationCode } from "@/lib/oauth/shared";
import { registerCalendarWebhook } from "@/lib/calendar/webhooks";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params;
  const config = getCalendarProvider(providerId);
  if (!config || config.authType !== "oauth2") {
    return NextResponse.redirect(new URL("/settings?error=calendar_unknown_provider", APP_URL));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthErr = searchParams.get("error");

  if (oauthErr) {
    return NextResponse.redirect(
      new URL(`/settings?error=calendar_oauth_${encodeURIComponent(oauthErr)}&provider=${config.id}`, APP_URL),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL(`/settings?error=calendar_missing_params&provider=${config.id}`, APP_URL));
  }

  // 1. Verify CSRF-safe state
  const verified = verifyOAuthState(state);
  if (!verified || verified.provider !== config.id) {
    return NextResponse.redirect(new URL(`/settings?error=calendar_state_invalid&provider=${config.id}`, APP_URL));
  }
  const coachId = verified.coachId;

  // 2. Exchange code for tokens
  let tokens;
  try {
    tokens = await exchangeAuthorizationCode({ provider: config, code });
  } catch {
    return NextResponse.redirect(new URL(`/settings?error=calendar_oauth_exchange_failed&provider=${config.id}`, APP_URL));
  }

  // 3. Ensure integrations row exists (intermediate disconnected status)
  await adminClient.from("integrations").upsert(
    {
      coach_id: coachId,
      provider: config.id,
      status: "disconnected",
    },
    { onConflict: "coach_id,provider" },
  );

  // 4. Store tokens in Vault FIRST. If Vault fails, do NOT mark connected.
  let vaultId: string;
  try {
    const { data, error } = await adminClient.schema("private").rpc("store_calendar_tokens", {
      p_coach_id: coachId,
      p_provider: config.id,
      p_tokens: tokens.raw as object,
    });
    if (error || !data) throw new Error(error?.message ?? "vault store returned null");
    vaultId = data as string;
  } catch (err) {
    // eslint-disable-next-line no-console -- reason: server-side error log; vault store failure in a route handler, not client code
    console.error("[calendar-callback] vault store failed:", err);
    return NextResponse.redirect(new URL(`/settings?error=calendar_vault_failed&provider=${config.id}`, APP_URL));
  }

  // 5. Mark integration connected + set as active calendar
  await adminClient
    .from("integrations")
    .update({
      vault_secret_id: vaultId,
      status: "connected",
      scopes: tokens.scope ? tokens.scope.split(/\s+/) : config.oauth?.scopes ?? [],
      error_message: null,
      last_checked_at: new Date().toISOString(),
    })
    .eq("coach_id", coachId)
    .eq("provider", config.id);

  await adminClient
    .from("coaches")
    .update({ active_calendar_provider: config.id })
    .eq("id", coachId);

  // 6. If auto webhook mode, register webhook with the provider. Non-fatal on failure
  //    (coach can still receive events if they paste the URL manually as fallback).
  if (config.webhook.mode === "auto") {
    try {
      await registerCalendarWebhook({ coachId, provider: config, accessToken: tokens.access_token });
    } catch (err) {
      // eslint-disable-next-line no-console -- reason: server-side error log; non-fatal webhook registration failure in a route handler
      console.error(`[calendar-callback] webhook registration failed for ${config.id}:`, err);
      // Leave integration connected; webhook registration can be retried from /settings.
    }
  }

  // 7. Return to the wizard if still onboarding, otherwise back to settings
  const { data: coach } = await adminClient
    .from("coaches")
    .select("onboarding_completed_at")
    .eq("id", coachId)
    .maybeSingle();
  const dest = coach?.onboarding_completed_at
    ? `/settings?connected=calendar&provider=${config.id}`
    : "/onboarding/calendar";
  return NextResponse.redirect(new URL(dest, APP_URL));
}
