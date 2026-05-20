import { describe, it, beforeAll, expect } from "vitest";
import {
  generateReviewToken,
  verifyReviewToken,
} from "@/lib/review-token";

// Targets (created by plan 04-03):
//   generateReviewToken, verifyReviewToken from "@/lib/review-token"

beforeAll(() => {
  process.env["JWT_REVIEW_SECRET"] ??= "test-secret";
});

describe("review-token (Phase 4 / NOTIFY-002 + Pitfall-6)", () => {
  it("generates a token with embedded payload", () => {
    const token = generateReviewToken({
      draftId: "draft-1",
      coachId: "coach-1",
      nonce: "nonce-abc",
    });
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]+$/);
    // Decode payload to verify embedded fields
    const dotIndex = token.lastIndexOf(".");
    const encodedPart = token.slice(0, dotIndex);
    const payload = JSON.parse(Buffer.from(encodedPart, "base64url").toString("utf8"));
    expect(payload.draftId).toBe("draft-1");
    expect(payload.coachId).toBe("coach-1");
    expect(payload.nonce).toBe("nonce-abc");
    expect(typeof payload.exp).toBe("number");
    // Expiry should be approximately 7 days from now
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(payload.exp).toBeGreaterThan(Date.now() + sevenDaysMs - 5000);
    expect(payload.exp).toBeLessThan(Date.now() + sevenDaysMs + 5000);
  });

  it("verifies a valid token and returns payload", () => {
    const token = generateReviewToken({
      draftId: "draft-2",
      coachId: "coach-2",
      nonce: "nonce-xyz",
    });
    const payload = verifyReviewToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.draftId).toBe("draft-2");
    expect(payload?.coachId).toBe("coach-2");
    expect(payload?.nonce).toBe("nonce-xyz");
  });

  it("rejects expired token (exp < now)", () => {
    // Generate with ttlMs of -1 (already expired)
    const token = generateReviewToken({
      draftId: "draft-3",
      coachId: "coach-3",
      nonce: "nonce-old",
      ttlMs: -1,
    });
    const payload = verifyReviewToken(token);
    expect(payload).toBeNull();
  });

  it("rejects tampered payload (HMAC mismatch)", () => {
    const token = generateReviewToken({
      draftId: "draft-4",
      coachId: "coach-4",
      nonce: "nonce-tamper",
    });
    // Tamper: replace encoded payload with different payload, keep original sig
    const dotIndex = token.lastIndexOf(".");
    const sig = token.slice(dotIndex + 1);
    const tamperedEncoded = Buffer.from(
      JSON.stringify({
        draftId: "evil-draft",
        coachId: "coach-4",
        nonce: "nonce-tamper",
        exp: Date.now() + 999999,
      }),
    ).toString("base64url");
    const tamperedToken = `${tamperedEncoded}.${sig}`;
    expect(verifyReviewToken(tamperedToken)).toBeNull();
  });

  it("rejects malformed token (missing separator)", () => {
    expect(verifyReviewToken("notavalidtoken")).toBeNull();
    expect(verifyReviewToken("")).toBeNull();
    expect(verifyReviewToken("onlyone")).toBeNull();
  });
});
