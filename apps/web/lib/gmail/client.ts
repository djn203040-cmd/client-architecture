import { google } from "googleapis";
import { adminClient } from "@/lib/supabase/admin";
import { createOAuth2Client } from "./auth";
import { isInvalidGrantError, OAuthInvalidGrantError, handleInvalidGrant } from "./error-handler";

export async function getGmailClientForCoach(coachId: string) {
  const { data: tokens, error } = await adminClient.schema("private").rpc("get_gmail_tokens", { p_coach_id: coachId });
  if (error || !tokens) throw new Error(`No Gmail tokens for coach ${coachId}`);

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Auto-refresh: googleapis fires this when access token expires
  oauth2Client.on("tokens", async (newTokens) => {
    try {
      await adminClient.schema("private").rpc("store_gmail_tokens", {
        p_coach_id: coachId,
        p_tokens: { ...tokens, ...newTokens },
      });
    } catch (e) {
      if (isInvalidGrantError(e)) {
        await handleInvalidGrant(coachId);
        throw new OAuthInvalidGrantError(coachId);
      }
      throw e;
    }
  });

  // Wrap the gmail client so any direct API call also catches invalid_grant
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  return new Proxy(gmail, {
    get(target, prop) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (target as any)[prop];
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = (value as any).apply(target, args);
          if (r && typeof (r as Promise<unknown>).then === "function") {
            return (r as Promise<unknown>).catch(async (e) => {
              if (isInvalidGrantError(e)) {
                await handleInvalidGrant(coachId);
                throw new OAuthInvalidGrantError(coachId);
              }
              throw e;
            });
          }
          return r;
        } catch (e) {
          if (isInvalidGrantError(e)) {
            handleInvalidGrant(coachId).catch(() => undefined);
            throw new OAuthInvalidGrantError(coachId);
          }
          throw e;
        }
      };
    },
  });
}
