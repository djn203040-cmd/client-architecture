import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { google } from "googleapis";

// ---------------------------------------------------------------------------
// CSRF-safe OAuth state. Mirrors lib/oauth/shared.ts and lib/slack/oauth.ts:
// the state carries the coachId + a timestamp, HMAC-signed so only our
// authorize route (which runs authenticated) can mint a valid state for a
// given coach. Without this, the unauthenticated callback would trust a raw
// `state=coachId` and let an attacker bind their own Gmail tokens to a
// victim's coach_id (integration hijack). 10-minute install window.
// ---------------------------------------------------------------------------

interface GmailOAuthState {
  coachId: string;
  t: number;
}

function gmailStateSecret(): string {
  const s =
    process.env.GMAIL_OAUTH_STATE_SECRET ??
    process.env.SLACK_OAUTH_STATE_SECRET ??
    process.env.JWT_REVIEW_SECRET ??
    "";
  if (!s) throw new Error("GMAIL_OAUTH_STATE_SECRET (or JWT_REVIEW_SECRET fallback) not set");
  return s;
}

export function signGmailOAuthState(coachId: string): string {
  const payload: GmailOAuthState = { coachId, t: Date.now() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", gmailStateSecret()).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyGmailOAuthState(state: string): GmailOAuthState | null {
  let secret: string;
  try {
    secret = gmailStateSecret();
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
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as GmailOAuthState;
    if (!parsed.coachId || Date.now() - parsed.t > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const REQUIRED_GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
] as const;

export const ALL_GMAIL_SCOPES = [
  ...REQUIRED_GMAIL_SCOPES,
  "https://www.googleapis.com/auth/gmail.modify",
] as const;

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );
}

export function buildAuthorizeUrl(coachId: string): string {
  return createOAuth2Client().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...ALL_GMAIL_SCOPES],
    state: signGmailOAuthState(coachId),
  });
}
