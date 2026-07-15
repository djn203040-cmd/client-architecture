import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createOAuth2Client, verifyGmailOAuthState } from "@/lib/gmail/auth";
import { validateGmailScopes, parseScopeString } from "@/lib/gmail/scope-validation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

/**
 * Error redirect that lands where the coach actually is. A coach still in
 * onboarding can't reach /settings (the dashboard gate bounces them back into
 * the wizard and drops the query string), so errors for them must go to
 * /onboarding/gmail, where StepGmail renders a friendly recovery state.
 * Falls back to /settings when we can't identify the coach.
 */
async function redirectWithError(errorCode: string, coachId?: string) {
  let dest = "/settings";
  if (coachId) {
    const { data: coach } = await adminClient
      .from("coaches")
      .select("onboarding_completed_at")
      .eq("id", coachId)
      .maybeSingle();
    if (!coach?.onboarding_completed_at) dest = "/onboarding/gmail";
  }
  return NextResponse.redirect(new URL(`${dest}?error=${encodeURIComponent(errorCode)}`, APP_URL));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const scopeStr = searchParams.get("scope");

  if (error) {
    // Google round-trips our state even on denial, so we can usually still
    // route the coach back to wherever they came from.
    const deniedState = state ? verifyGmailOAuthState(state) : null;
    return redirectWithError(`oauth_${error}`, deniedState?.coachId);
  }
  if (!code || !state) {
    return redirectWithError("oauth_missing_params");
  }

  // Verify the HMAC-signed state before trusting the coach_id it carries.
  // A raw/forged state would let an attacker bind their own Gmail tokens to a
  // victim's coach_id; only our authenticated authorize route can mint a valid
  // signed state (expired/tampered states fail closed here).
  const verified = verifyGmailOAuthState(state);
  if (!verified) {
    return redirectWithError("oauth_invalid_state");
  }
  const coachId = verified.coachId;

  // 1. Exchange code for tokens
  let tokens: import("googleapis").Auth.Credentials;
  try {
    const oauth2Client = createOAuth2Client();
    const r = await oauth2Client.getToken(code);
    tokens = r.tokens;
  } catch {
    return redirectWithError("oauth_exchange_failed", coachId);
  }

  // GMAIL-002: refresh_token missing, likely missing prompt=consent or already-consented session.
  // Refuse: without refresh_token, sequences will die in 1h. Ask the coach to revoke + retry.
  if (!tokens.refresh_token) {
    return redirectWithError("oauth_no_refresh_token", coachId);
  }

  // 2. HEALTH-007: validate granted scopes BEFORE marking connected
  const granted = parseScopeString(scopeStr);
  const check = validateGmailScopes(granted);
  if (!check.ok) {
    return redirectWithError("insufficient_scopes", coachId);
  }

  // 3. GMAIL-003 + Pitfall 2: Persist to Vault FIRST. If Vault fails, do NOT touch integrations.
  let vaultId: string;
  try {
    // Ensure integrations row exists so the function's UPDATE inside store_gmail_tokens can target it
    await adminClient.from("integrations").upsert(
      {
        coach_id: coachId,
        provider: "gmail",
        status: "disconnected", // intermediate; flipped to 'connected' after vault succeeds
      },
      { onConflict: "coach_id,provider" },
    );

    const { data, error: vaultErr } = await adminClient.schema("private").rpc("store_gmail_tokens", {
      p_coach_id: coachId,
      p_tokens: tokens,
    });
    if (vaultErr || !data) throw new Error(vaultErr?.message ?? "vault store returned null");
    vaultId = data;
  } catch (err) {
    // eslint-disable-next-line no-console -- reason: server-side error log; vault store failure in a route handler, not client code
    console.error("[gmail-callback] vault store failed:", err);
    return redirectWithError("oauth_vault_failed", coachId);
  }

  // 4. Update integrations row to connected (vault_secret_id already set by store fn; we re-confirm + set scopes)
  await adminClient.from("integrations").update({
    vault_secret_id: vaultId,
    status: "connected",
    scopes: granted,
    error_message: null,
    last_checked_at: new Date().toISOString(),
  }).eq("coach_id", coachId).eq("provider", "gmail");

  // 5. Return the coach to where they came from. A coach still in onboarding
  // goes back to the wizard's Gmail step (which polls for the connected status
  // and unlocks Continue); a fully-onboarded coach goes to settings.
  const { data: coach } = await adminClient
    .from("coaches")
    .select("onboarding_completed_at")
    .eq("id", coachId)
    .maybeSingle();
  const dest = coach?.onboarding_completed_at
    ? "/settings?connected=gmail"
    : "/onboarding/gmail";
  return NextResponse.redirect(new URL(dest, APP_URL));
}
