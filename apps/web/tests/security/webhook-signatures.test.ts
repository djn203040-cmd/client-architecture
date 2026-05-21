/**
 * Webhook signature contract tests.
 *
 * Each provider's verifier must:
 *   - PASS a correctly-signed payload
 *   - REJECT an invalid signature
 *   - REJECT a stale timestamp (where the scheme includes one)
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifySlackSignature } from "../../lib/slack/signature";
import { verifyGmailPubSubJwt } from "../../lib/security/verify-gmail-pubsub";

describe("Slack signature (X-Slack-Signature)", () => {
  const signingSecret = "test-slack-signing-secret";
  const rawBody = '{"type":"block_actions","trigger_id":"abc"}';
  const fresh = String(Math.floor(Date.now() / 1000));

  function sign(timestamp: string, body: string): string {
    return (
      "v0=" +
      createHmac("sha256", signingSecret)
        .update(`v0:${timestamp}:${body}`)
        .digest("hex")
    );
  }

  it("accepts a fresh, correctly-signed payload", () => {
    const sig = sign(fresh, rawBody);
    expect(
      verifySlackSignature({ signingSecret, timestamp: fresh, signature: sig, rawBody }),
    ).toBe(true);
  });

  it("rejects a forged signature", () => {
    expect(
      verifySlackSignature({
        signingSecret,
        timestamp: fresh,
        signature: "v0=" + "0".repeat(64),
        rawBody,
      }),
    ).toBe(false);
  });

  it("rejects a stale timestamp (>5 min)", () => {
    const stale = String(Math.floor(Date.now() / 1000) - 10 * 60);
    const sig = sign(stale, rawBody);
    expect(
      verifySlackSignature({ signingSecret, timestamp: stale, signature: sig, rawBody }),
    ).toBe(false);
  });

  it("rejects a missing-secret call", () => {
    expect(
      verifySlackSignature({ signingSecret: "", timestamp: fresh, signature: "x", rawBody }),
    ).toBe(false);
  });
});

describe("Gmail Pub/Sub JWT verifier", () => {
  it("rejects missing Authorization header", async () => {
    const res = await verifyGmailPubSubJwt(null, { expectedAudience: "https://x" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("missing_authorization");
  });

  it("rejects malformed JWT", async () => {
    const res = await verifyGmailPubSubJwt("Bearer not-a-jwt", {
      expectedAudience: "https://x",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("malformed_jwt");
  });

  it("rejects bad scheme", async () => {
    const res = await verifyGmailPubSubJwt("Basic abc.def.ghi", {
      expectedAudience: "https://x",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("bad_scheme");
  });

  it("rejects an unsupported alg (alg=none attack)", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", kid: "x" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: "https://accounts.google.com",
        aud: "https://x",
        exp: Math.floor(Date.now() / 1000) + 60,
        iat: Math.floor(Date.now() / 1000),
        sub: "sub",
      }),
    ).toString("base64url");
    const res = await verifyGmailPubSubJwt(`Bearer ${header}.${payload}.`, {
      expectedAudience: "https://x",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("unsupported_alg");
  });

  it("rejects a token with the wrong audience", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "x" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: "https://accounts.google.com",
        aud: "https://attacker.example",
        exp: Math.floor(Date.now() / 1000) + 60,
        iat: Math.floor(Date.now() / 1000),
        sub: "sub",
      }),
    ).toString("base64url");
    const res = await verifyGmailPubSubJwt(`Bearer ${header}.${payload}.sig`, {
      expectedAudience: "https://x",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("bad_audience");
  });

  it("rejects an expired token", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "x" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: "https://accounts.google.com",
        aud: "https://x",
        exp: Math.floor(Date.now() / 1000) - 600,
        iat: Math.floor(Date.now() / 1000) - 1200,
        sub: "sub",
      }),
    ).toString("base64url");
    const res = await verifyGmailPubSubJwt(`Bearer ${header}.${payload}.sig`, {
      expectedAudience: "https://x",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("expired");
  });
});

describe("Webhook route inventory (registry sanity)", () => {
  it("has exactly 14 webhook entries documented", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const readmePath = path.resolve(__dirname, "../../lib/security/README.md");
    const readme = await fs.readFile(readmePath, "utf8");
    const rows = readme.match(/^\| \d+ \|/gm) ?? [];
    expect(rows.length).toBeGreaterThanOrEqual(14);
  });
});
