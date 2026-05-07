import { google } from "googleapis";

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
    state: coachId,
  });
}
