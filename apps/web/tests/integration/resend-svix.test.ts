import { describe, it, expect } from "vitest";
import { Webhook } from "svix";

// 06-PLAN.md §1.3 — Resend webhook Svix signature verification rejects unsigned payloads.

// Svix secret format: whsec_<base64 of HMAC key>
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const WRONG_SECRET = "whsec_RGlmZmVyZW50U2VjcmV0RGlmZmVyZW50U2VjcmV0";

function makeSignedHeaders(body: string, secret: string) {
  const wh = new Webhook(secret);
  const id = "msg_test_001";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // svix signs `${id}.${timestamp}.${body}`
  const signature = wh.sign(id, new Date(Number(timestamp) * 1000), body);
  return {
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": signature,
  };
}

describe("RESEND-WEBHOOK-SVIX: signature verification", () => {
  const validBody = JSON.stringify({
    type: "email.delivered",
    data: { email_id: "test-email-id" },
  });

  it("accepts a correctly signed payload", () => {
    const headers = makeSignedHeaders(validBody, SECRET);
    const wh = new Webhook(SECRET);
    expect(() => wh.verify(validBody, headers)).not.toThrow();
  });

  it("rejects an unsigned payload (no svix headers)", () => {
    const wh = new Webhook(SECRET);
    expect(() => wh.verify(validBody, {})).toThrow();
  });

  it("rejects a payload signed with a different secret", () => {
    const wrongHeaders = makeSignedHeaders(validBody, WRONG_SECRET);
    const wh = new Webhook(SECRET);
    expect(() => wh.verify(validBody, wrongHeaders)).toThrow();
  });

  it("rejects a tampered body", () => {
    const headers = makeSignedHeaders(validBody, SECRET);
    const tampered = JSON.stringify({ type: "email.bounced", data: { email_id: "X" } });
    const wh = new Webhook(SECRET);
    expect(() => wh.verify(tampered, headers)).toThrow();
  });

  it("rejects an expired timestamp (>5min skew)", () => {
    const wh = new Webhook(SECRET);
    const id = "msg_test_002";
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 60 * 60).toString();
    const signature = wh.sign(id, new Date(Number(oldTimestamp) * 1000), validBody);
    const headers = {
      "svix-id": id,
      "svix-timestamp": oldTimestamp,
      "svix-signature": signature,
    };
    expect(() => wh.verify(validBody, headers)).toThrow();
  });
});
