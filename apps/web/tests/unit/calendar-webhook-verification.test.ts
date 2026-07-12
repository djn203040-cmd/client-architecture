import { describe, it } from "vitest";
// Will import verifiers from: apps/web/lib/calendar/index.ts
// Testing: CAL-004, HMAC timing-safe verification for all 7 providers

describe("calendar webhook signature verification", () => {
  describe("Calendly, sha256= prefix, HMAC of raw body", () => {
    it.todo("accepts valid signature from calendly-webhook-signature header");
    it.todo("rejects missing header");
    it.todo("rejects wrong secret");
    it.todo("rejects tampered body");
  });

  describe("Cal.com, x-cal-signature-256, HMAC of JSON-stringified payload", () => {
    it.todo("accepts valid signature");
    it.todo("rejects invalid signature");
  });

  describe("Acuity, x-acuity-signature, base64(HMAC-SHA256(body, apiKey))", () => {
    it.todo("accepts valid signature");
    it.todo("rejects invalid signature");
  });

  describe("Square, x-square-hmacsha256-signature, HMAC of (url + body)", () => {
    it.todo("accepts valid signature including notification URL in hash input");
    it.todo("rejects signature computed without notification URL");
  });
});
