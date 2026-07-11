/**
 * Rate-limit policy contract.
 *
 * In unit-mode (no Redis env), `enforce(null, key)` short-circuits to allow.
 * In CI we run a second integration job with Upstash credentials provisioned, 
 * see .github/workflows/security.yml. The asserts below cover the contract +
 * the registry that the deployment audits against.
 */
import { describe, expect, it } from "vitest";
import {
  RATE_LIMIT_REGISTRY,
  enforce,
  ipFromRequest,
} from "../../lib/security/ratelimit";

describe("rate-limit registry", () => {
  it("covers every route group required by 06-02 §3.8", () => {
    const required = [
      "auth",
      "draftsGenerate",
      "webhook",
      "reviewToken",
      "unsubscribe",
      "health",
    ] as const;
    for (const k of required) {
      expect(RATE_LIMIT_REGISTRY[k]).toBeTruthy();
      expect(RATE_LIMIT_REGISTRY[k]?.policy).toMatch(/\d+\s*\/\s*\d+/);
    }
  });

  it("includes GDPR + admin-invite + lead-create policies", () => {
    expect(RATE_LIMIT_REGISTRY.gdprExport.policy).toContain("1 / 1h");
    expect(RATE_LIMIT_REGISTRY.adminInvite).toBeTruthy();
    expect(RATE_LIMIT_REGISTRY.leadCreate).toBeTruthy();
  });
});

describe("enforce()", () => {
  it("short-circuits to allow when no limiter is configured", async () => {
    const res = await enforce(null, "any-key");
    expect(res.success).toBe(true);
  });
});

describe("ipFromRequest()", () => {
  it("uses x-forwarded-for first hop", () => {
    const req = new Request("https://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(ipFromRequest(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip then to 'unknown'", () => {
    const a = new Request("https://x", { headers: { "x-real-ip": "9.9.9.9" } });
    const b = new Request("https://x");
    expect(ipFromRequest(a)).toBe("9.9.9.9");
    expect(ipFromRequest(b)).toBe("unknown");
  });
});
