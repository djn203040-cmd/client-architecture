import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import {
  type CalendarProviderId,
  type CalendarProviderConfig,
  buildOAuthRedirectUri,
} from "@/lib/calendar/providers";

// ---------------------------------------------------------------------------
// State signing, CSRF-safe OAuth state param.
// Pattern mirrors apps/web/lib/slack/oauth.ts; 10-minute install window.
// ---------------------------------------------------------------------------

interface OAuthState {
  coachId: string;
  provider: CalendarProviderId;
  returnTo?: string;
  t: number;
}

function stateSecret(): string {
  const s =
    process.env.CALENDAR_OAUTH_STATE_SECRET ??
    process.env.SLACK_OAUTH_STATE_SECRET ??
    process.env.JWT_REVIEW_SECRET ??
    "";
  if (!s) throw new Error("CALENDAR_OAUTH_STATE_SECRET not set");
  return s;
}

export function signOAuthState(payload: Omit<OAuthState, "t">): string {
  const full: OAuthState = { ...payload, t: Date.now() };
  const encoded = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthState | null {
  let secret: string;
  try {
    secret = stateSecret();
  } catch {
    return null;
  }
  const dotIdx = state.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const encoded = state.slice(0, dotIdx);
  const provided = state.slice(dotIdx + 1);
  if (!encoded || !provided) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthState;
    if (Date.now() - parsed.t > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Authorize URL builder, works for any provider in the registry.
// ---------------------------------------------------------------------------

export interface AuthorizeUrlArgs {
  provider: CalendarProviderConfig;
  coachId: string;
  returnTo?: string;
}

export function buildAuthorizeUrl({ provider, coachId, returnTo }: AuthorizeUrlArgs): string {
  if (provider.authType !== "oauth2" || !provider.oauth) {
    throw new Error(`buildAuthorizeUrl: provider ${provider.id} is not oauth2`);
  }
  const clientId = process.env[provider.oauth.clientIdEnv];
  if (!clientId) {
    throw new Error(`OAuth client_id missing for ${provider.id} (${provider.oauth.clientIdEnv})`);
  }
  const url = new URL(provider.oauth.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", buildOAuthRedirectUri(provider.id));
  if (provider.oauth.scopes.length > 0) {
    url.searchParams.set("scope", provider.oauth.scopes.join(" "));
  }
  url.searchParams.set("state", signOAuthState({ coachId, provider: provider.id, returnTo }));
  for (const [k, v] of Object.entries(provider.oauth.extraAuthParams ?? {})) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange, generic OAuth2 authorization_code grant.
// ---------------------------------------------------------------------------

export interface ExchangedTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number; // computed from expires_in + now
  scope?: string;
  token_type?: string;
  raw: unknown;
}

export async function exchangeAuthorizationCode(args: {
  provider: CalendarProviderConfig;
  code: string;
}): Promise<ExchangedTokens> {
  const { provider, code } = args;
  if (provider.authType !== "oauth2" || !provider.oauth) {
    throw new Error(`exchangeAuthorizationCode: provider ${provider.id} is not oauth2`);
  }
  const clientId = process.env[provider.oauth.clientIdEnv];
  const clientSecret = process.env[provider.oauth.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(`OAuth creds missing for ${provider.id}`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: buildOAuthRedirectUri(provider.id),
  });

  const res = await fetch(provider.oauth.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`token_exchange_failed:${res.status}:${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const access_token = String(json.access_token ?? "");
  if (!access_token) {
    throw new Error("token_exchange_no_access_token");
  }
  const expires_in = typeof json.expires_in === "number" ? json.expires_in : undefined;
  return {
    access_token,
    refresh_token: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expires_in,
    expires_at: expires_in ? Math.floor(Date.now() / 1000) + expires_in : undefined,
    scope: typeof json.scope === "string" ? json.scope : undefined,
    token_type: typeof json.token_type === "string" ? json.token_type : undefined,
    raw: json,
  };
}

// ---------------------------------------------------------------------------
// Token refresh, generic OAuth2 refresh_token grant (#64).
// Works for the calendar providers that issue refresh tokens (Calendly, Acuity,
// Square, MS Bookings). Setmore/TidyCal/Cal.com are API-key integrations and
// never reach this path. A rejection from the TOKEN endpoint is the only
// authenticated, unambiguous "this grant is dead" signal calendar integrations
// have, webhook-signature 401s are public-URL noise and must never be used.
// ---------------------------------------------------------------------------

export class OAuthRefreshError extends Error {
  constructor(
    public readonly providerId: CalendarProviderId,
    public readonly status: number,
    // OAuth2 error code from the provider's JSON error body (RFC 6749 §5.2),
    // e.g. "invalid_grant" (grant revoked/expired) vs "invalid_client" (our
    // credentials misconfigured, NOT the coach's fault).
    public readonly oauthErrorCode?: string,
  ) {
    super(
      `token_refresh_failed:${providerId}:${status}${oauthErrorCode ? `:${oauthErrorCode}` : ""}`,
    );
    this.name = "OAuthRefreshError";
  }
}

export async function refreshAccessToken(args: {
  provider: CalendarProviderConfig;
  refreshToken: string;
}): Promise<ExchangedTokens> {
  const { provider, refreshToken } = args;
  if (provider.authType !== "oauth2" || !provider.oauth) {
    throw new Error(`refreshAccessToken: provider ${provider.id} is not oauth2`);
  }
  const clientId = process.env[provider.oauth.clientIdEnv];
  const clientSecret = process.env[provider.oauth.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(`OAuth creds missing for ${provider.id}`);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(provider.oauth.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    // Surface the OAuth error code (never token material) so callers can
    // distinguish a dead grant from transient provider noise.
    let oauthErrorCode: string | undefined;
    try {
      const errJson = (await res.json()) as { error?: unknown };
      if (typeof errJson.error === "string") oauthErrorCode = errJson.error;
    } catch {
      // Non-JSON error body, the HTTP status alone will have to do.
    }
    throw new OAuthRefreshError(provider.id, res.status, oauthErrorCode);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const access_token = String(json.access_token ?? "");
  if (!access_token) {
    throw new OAuthRefreshError(provider.id, res.status, "no_access_token");
  }
  const expires_in = typeof json.expires_in === "number" ? json.expires_in : undefined;
  return {
    access_token,
    // Rotation-safe: Calendly rotates the refresh token on every use; others may
    // omit it from the response. Fall back to the token we just used so a
    // write-back never loses the ability to refresh again.
    refresh_token: typeof json.refresh_token === "string" ? json.refresh_token : refreshToken,
    expires_in,
    expires_at: expires_in ? Math.floor(Date.now() / 1000) + expires_in : undefined,
    scope: typeof json.scope === "string" ? json.scope : undefined,
    token_type: typeof json.token_type === "string" ? json.token_type : undefined,
    raw: json,
  };
}

// ---------------------------------------------------------------------------
// Best-effort token revoke. Providers vary; failures are non-fatal because
// the local-side disconnect must succeed regardless of provider availability.
// ---------------------------------------------------------------------------

export async function revokeAccessToken(args: {
  provider: CalendarProviderConfig;
  accessToken: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const { provider, accessToken } = args;
  if (!provider.oauth?.revokeUrl) return { ok: true, reason: "no_revoke_endpoint" };
  try {
    const body = new URLSearchParams({ token: accessToken });
    const res = await fetch(provider.oauth.revokeUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    return res.ok
      ? { ok: true }
      : { ok: false, reason: `http_${res.status}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
