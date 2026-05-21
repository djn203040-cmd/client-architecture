/**
 * Unit-style headers test.
 *
 * Validates that the middleware helpers + CSP builder emit every required
 * browser security header with the right policy. Hitting a live `next start`
 * is left to the playwright e2e suite — this test asserts the contract.
 */
import { describe, expect, it } from "vitest";
import { buildCsp, generateCspNonce, STATIC_SECURITY_HEADERS } from "../../lib/security/csp";
import { safeRedirectPath } from "../../lib/security/safe-redirect";

describe("security headers contract", () => {
  it("produces a unique random nonce on every call", () => {
    const a = generateCspNonce();
    const b = generateCspNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(20);
  });

  it("CSP includes nonce, frame-ancestors none, no inline scripts", () => {
    const nonce = generateCspNonce();
    const csp = buildCsp({ nonce, isDev: false });
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    // No unsafe-inline for scripts.
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    // No unsafe-eval in production.
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it("CSP allows Supabase realtime + Anthropic + Inngest + Cal.com", () => {
    const csp = buildCsp({ nonce: "abc", isDev: false });
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("wss://*.supabase.co");
    expect(csp).toContain("https://api.anthropic.com");
    expect(csp).toContain("https://*.inngest.com");
    expect(csp).toContain("frame-src https://app.cal.com");
  });

  it("dev CSP loosens with unsafe-eval + localhost ws", () => {
    const csp = buildCsp({ nonce: "abc", isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://localhost:*");
  });

  it("static security headers cover all six required directives", () => {
    expect(STATIC_SECURITY_HEADERS).toMatchObject({
      "Strict-Transport-Security": expect.stringContaining("max-age=63072000"),
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": expect.stringContaining("camera=()"),
    });
    expect(STATIC_SECURITY_HEADERS["Strict-Transport-Security"]).toContain("includeSubDomains");
    expect(STATIC_SECURITY_HEADERS["Strict-Transport-Security"]).toContain("preload");
  });
});

describe("safeRedirectPath", () => {
  it("accepts same-origin paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/leads/abc-123")).toBe("/leads/abc-123");
  });

  it("rejects open-redirect attempts", () => {
    expect(safeRedirectPath("//evil.com/x")).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("data:text/html,<script>")).toBe("/");
    expect(safeRedirectPath(123 as unknown)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });
});
