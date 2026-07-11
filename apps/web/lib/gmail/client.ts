import { google } from "googleapis";
import { adminClient } from "@/lib/supabase/admin";
import { createOAuth2Client } from "./auth";
import { isInvalidGrantError, OAuthInvalidGrantError, handleInvalidGrant } from "./error-handler";

/**
 * Recursively wrap the gmail client so ANY API call routes invalid_grant
 * through handleInvalidGrant (mark disconnected + pause sequences + notify).
 *
 * Why recursive (#55): every real Gmail call is nested, 
 * `gmail.users.messages.send(...)`, `gmail.users.history.list(...)`, but the
 * previous Proxy only intercepted direct function properties of the ROOT
 * client. `gmail.users` is a plain object, so it was returned unwrapped and
 * every nested call escaped the invalid_grant handling. When a refresh token
 * was revoked, googleapis' `refreshTokenNoCache` rejected the API call with a
 * raw `Error: invalid_grant` (the `on("tokens")` event only fires on a
 * SUCCESSFUL refresh, so that path never sees the failure), the self-heal
 * never ran, and the integration stayed `status='connected'` with a dead
 * token. Wrapping nested objects lazily closes that gap.
 */
function wrapWithInvalidGrantSelfHeal<T extends object>(
  target: T,
  coachId: string,
  cache: WeakMap<object, unknown> = new WeakMap(),
): T {
  const cached = cache.get(target);
  if (cached) return cached as T;

  const proxy = new Proxy(target, {
    get(t, prop) {
      const value: unknown = Reflect.get(t, prop, t);

      if (typeof value === "function") {
        return (...args: unknown[]) => {
          try {
            const result: unknown = value.apply(t, args);
            if (result && typeof (result as Promise<unknown>).then === "function") {
              return (result as Promise<unknown>).catch(async (e: unknown) => {
                if (isInvalidGrantError(e)) {
                  await handleInvalidGrant(coachId);
                  throw new OAuthInvalidGrantError(coachId);
                }
                throw e;
              });
            }
            return result;
          } catch (e) {
            if (isInvalidGrantError(e)) {
              handleInvalidGrant(coachId).catch(() => undefined);
              throw new OAuthInvalidGrantError(coachId);
            }
            throw e;
          }
        };
      }

      // Nested resource (gmail.users, gmail.users.messages, ...): wrap it too
      // so the leaf method call above is always reached through this handler.
      if (typeof value === "object" && value !== null) {
        return wrapWithInvalidGrantSelfHeal(value, coachId, cache);
      }

      return value;
    },
  });

  cache.set(target, proxy);
  return proxy;
}

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

  // Wrap the gmail client (recursively, see wrapWithInvalidGrantSelfHeal) so
  // any API call, including nested ones, catches invalid_grant and self-heals.
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  return wrapWithInvalidGrantSelfHeal(gmail, coachId);
}
