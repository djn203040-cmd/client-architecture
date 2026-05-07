import { describe, it, expect } from "vitest";
import { adminInviteLimiter, leadCreateLimiter } from "@/lib/security/ratelimit";

const skipIf = !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN;

describe.skipIf(skipIf)("INFRA-009: Upstash rate limiters", () => {
  it(
    "adminInviteLimiter blocks 6th request in 60s window",
    async () => {
      if (!adminInviteLimiter) return;
      const key = `test-admin-${Date.now()}`;
      for (let i = 0; i < 5; i++) {
        const r = await adminInviteLimiter.limit(key);
        expect(r.success).toBe(true);
      }
      const blocked = await adminInviteLimiter.limit(key);
      expect(blocked.success).toBe(false);
    },
    30_000
  );

  it(
    "leadCreateLimiter blocks 31st request in 60s window",
    async () => {
      if (!leadCreateLimiter) return;
      const key = `test-lead-${Date.now()}`;
      let lastSuccess = true;
      for (let i = 0; i < 30; i++) {
        const r = await leadCreateLimiter.limit(key);
        lastSuccess = r.success && lastSuccess;
      }
      expect(lastSuccess).toBe(true);
      const blocked = await leadCreateLimiter.limit(key);
      expect(blocked.success).toBe(false);
    },
    60_000
  );
});

describe("INFRA-009: rate limiter exports exist", () => {
  it("module exports adminInviteLimiter and leadCreateLimiter symbols", async () => {
    const mod = await import("@/lib/security/ratelimit");
    expect("adminInviteLimiter" in mod).toBe(true);
    expect("leadCreateLimiter" in mod).toBe(true);
  });
});
