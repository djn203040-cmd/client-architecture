import "server-only";
import { timingSafeEqual } from "crypto";

/**
 * Shared authentication for Vercel Cron routes (#84).
 *
 * Two failure modes this closes over the old inline `!==` check:
 *
 *  1. **Empty-secret bypass.** The previous pattern was
 *     `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``. If CRON_SECRET is
 *     ever unset/empty (config drift, a new environment), that template literal
 *     becomes the literal `"Bearer undefined"` / `"Bearer "`, and anyone sending
 *     that exact header passes. Misconfiguration must fail *closed*, not open, 
 *     so a falsy secret always rejects, regardless of the incoming header.
 *
 *  2. **Non-timing-safe compare.** `!==` short-circuits on the first differing
 *     byte, leaking a timing side-channel. We compare with `timingSafeEqual`
 *     over equal-length buffers, matching the HMAC verifiers elsewhere in the
 *     codebase (lib/calendar, lib/slack/signature).
 *
 * Returns a `Response` to short-circuit the route (caller does
 * `const denied = assertCronAuth(request); if (denied) return denied;`), or
 * `null` when the request is authorized.
 */
export function assertCronAuth(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;

  // Fail closed on misconfiguration, never let a missing secret open the route.
  if (!secret) {
    console.error("[cron-auth] CRON_SECRET is not set, rejecting all cron requests");
    return new Response("Server misconfigured", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return new Response("Unauthorized", { status: 401 });
  if (!timingSafeEqual(a, b)) return new Response("Unauthorized", { status: 401 });

  return null;
}
