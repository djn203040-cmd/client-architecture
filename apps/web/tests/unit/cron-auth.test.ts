import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertCronAuth } from "../../lib/security/cron-auth";

// #84, cron auth must fail CLOSED on a missing secret and use a timing-safe
// compare. These cover the exact bypass the old inline `!==` check allowed.

function req(auth?: string): Request {
  return new Request("https://x/api/cron/gmail-poll", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("assertCronAuth", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cr3t-value";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("authorizes a correct bearer token (returns null)", () => {
    expect(assertCronAuth(req("Bearer s3cr3t-value"))).toBeNull();
  });

  it("rejects a wrong bearer token with 401", () => {
    const res = assertCronAuth(req("Bearer wrong"));
    expect(res?.status).toBe(401);
  });

  it("rejects a missing Authorization header with 401", () => {
    const res = assertCronAuth(req());
    expect(res?.status).toBe(401);
  });

  it("fails CLOSED with 500 when CRON_SECRET is unset (no bypass)", () => {
    delete process.env.CRON_SECRET;
    // The classic bypass header must NOT pass when the secret is unset.
    expect(assertCronAuth(req("Bearer undefined"))?.status).toBe(500);
    expect(assertCronAuth(req("Bearer "))?.status).toBe(500);
    expect(assertCronAuth(req("Bearer s3cr3t-value"))?.status).toBe(500);
  });

  it("fails CLOSED with 500 when CRON_SECRET is empty string", () => {
    process.env.CRON_SECRET = "";
    expect(assertCronAuth(req("Bearer "))?.status).toBe(500);
  });
});
