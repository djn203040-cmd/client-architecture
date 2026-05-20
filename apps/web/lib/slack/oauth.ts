import "server-only";
import { WebClient } from "@slack/web-api";
import { createHmac, timingSafeEqual } from "crypto";

export const REQUIRED_SLACK_SCOPES = ["chat:write", "im:write", "users:read"] as const;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.sonorous.com";

export function buildSlackInstallUrl(coachId: string): string {
  const state = signOAuthState({ coachId, t: Date.now() });
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID ?? "");
  url.searchParams.set("scope", REQUIRED_SLACK_SCOPES.join(","));
  url.searchParams.set("redirect_uri", `${APP_URL}/api/auth/slack/callback`);
  url.searchParams.set("state", state);
  return url.toString();
}

interface OAuthState {
  coachId: string;
  t: number;
}

export function signOAuthState(payload: OAuthState): string {
  const secret = process.env.SLACK_OAUTH_STATE_SECRET ?? process.env.JWT_REVIEW_SECRET ?? "";
  if (!secret) throw new Error("SLACK_OAUTH_STATE_SECRET (or JWT_REVIEW_SECRET fallback) not set");
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthState | null {
  const secret = process.env.SLACK_OAUTH_STATE_SECRET ?? process.env.JWT_REVIEW_SECRET ?? "";
  if (!secret) return null;
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
    if (Date.now() - parsed.t > 10 * 60 * 1000) return null; // 10-minute install window
    return parsed;
  } catch {
    return null;
  }
}

export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  botUserId: string;
  teamId: string;
  authedUserId: string;
}> {
  const client = new WebClient();
  const res = await client.oauth.v2.access({
    client_id: process.env.SLACK_CLIENT_ID!,
    client_secret: process.env.SLACK_CLIENT_SECRET!,
    code,
    redirect_uri: `${APP_URL}/api/auth/slack/callback`,
  });
  if (!res.ok || !res.access_token || !res.bot_user_id || !res.team?.id || !res.authed_user?.id) {
    throw new Error(`slack_oauth_failed:${res.error ?? "unknown"}`);
  }
  return {
    accessToken: res.access_token,
    botUserId: res.bot_user_id,
    teamId: res.team.id,
    authedUserId: res.authed_user.id,
  };
}
