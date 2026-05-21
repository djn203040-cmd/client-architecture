import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate-limit policy registry.
 *
 * Targets from 06-02 §3.8:
 *   /api/auth/*                : 10 / 1m / IP
 *   /api/drafts/generate       : 20 / 1h / coach
 *   /api/webhooks/*            : 100 / 1m / source IP
 *   /api/review/[token]        :  5 / 5m / token
 *   /api/unsubscribe           : 10 / 1m / IP
 *   /api/health                : 30 / 1m / IP
 *
 * Plus existing limiters: admin invite, lead create.
 *
 * When Upstash credentials are absent (tests, local dev without Redis), every
 * limiter is `null` and call sites short-circuit to allow — never to deny — so
 * the dev loop is uninterrupted. Production must have Redis configured (CI
 * env-check guards this).
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

function make(name: string, limit: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `rl:${name}`,
  });
}

// ---- Existing limiters (kept for backwards compatibility) ----
export const adminInviteLimiter = make("admin-invite", 5, "60 s");
export const leadCreateLimiter = make("lead-create", 30, "60 s");

// ---- 06-02 §3.8 coverage ----
export const authLimiter = make("auth", 10, "60 s");
export const draftsGenerateLimiter = make("drafts-generate", 20, "1 h");
export const webhookLimiter = make("webhook", 100, "60 s");
export const reviewTokenLimiter = make("review-token", 5, "5 m");
export const unsubscribeLimiter = make("unsubscribe", 10, "60 s");
export const healthLimiter = make("health", 30, "60 s");

// GDPR — 1 export per hour per coach (large response, prevents abuse)
export const gdprExportLimiter = make("gdpr-export", 1, "1 h");

export const RATE_LIMIT_REGISTRY = {
  auth: { target: "/api/auth/*", policy: "10 / 60s / IP" },
  draftsGenerate: { target: "/api/drafts/generate", policy: "20 / 1h / coach" },
  webhook: { target: "/api/webhooks/*", policy: "100 / 60s / source IP" },
  reviewToken: { target: "/api/review/[token]", policy: "5 / 5m / token" },
  unsubscribe: { target: "/api/unsubscribe", policy: "10 / 60s / IP" },
  health: { target: "/api/health", policy: "30 / 60s / IP" },
  adminInvite: { target: "/api/admin/coaches (invite)", policy: "5 / 60s / admin" },
  leadCreate: { target: "/api/leads", policy: "30 / 60s / coach" },
  gdprExport: { target: "/api/account/export", policy: "1 / 1h / coach" },
} as const;

/**
 * Helper: pick an identifier suitable for IP-keyed limits. Honors common
 * proxy headers Vercel sets, falls back to "unknown" so a misconfigured edge
 * still rate-limits collectively rather than crashing.
 */
export function ipFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Convenience: call a limiter with a key. Returns `{ success: true }` when
 * Redis isn't configured (dev/test mode). Production must wire Redis.
 */
export async function enforce(
  limiter: Ratelimit | null,
  key: string,
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  if (!limiter) return { success: true };
  return limiter.limit(key);
}
