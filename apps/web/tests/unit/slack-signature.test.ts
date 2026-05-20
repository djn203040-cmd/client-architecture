import { describe, it, beforeAll, expect } from "vitest";
import { createHmac } from "crypto";
import { verifySlackSignature } from "@/lib/slack/signature";

const SIGNING_SECRET = "test-secret-32-chars-padded-here";

beforeAll(() => {
  process.env["SLACK_SIGNING_SECRET"] ??= SIGNING_SECRET;
});

function makeSignature(signingSecret: string, timestamp: string, body: string): string {
  const baseString = `v0:${timestamp}:${body}`;
  const hex = createHmac("sha256", signingSecret).update(baseString).digest("hex");
  return `v0=${hex}`;
}

describe("slack-signature (Phase 4 / Pitfall-2)", () => {
  it("verifies a valid v0 signature with current timestamp", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = "payload=test-body";
    const signature = makeSignature(SIGNING_SECRET, timestamp, body);

    expect(
      verifySlackSignature({
        signingSecret: SIGNING_SECRET,
        timestamp,
        signature,
        rawBody: body,
      }),
    ).toBe(true);
  });

  it("rejects timestamp older than 5 minutes (replay window)", () => {
    const staleTs = String(Math.floor(Date.now() / 1000) - 400); // 400s ago
    const body = "payload=test-body";
    const signature = makeSignature(SIGNING_SECRET, staleTs, body);

    expect(
      verifySlackSignature({
        signingSecret: SIGNING_SECRET,
        timestamp: staleTs,
        signature,
        rawBody: body,
      }),
    ).toBe(false);
  });

  it("rejects modified body (timing-safe mismatch)", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = "payload=original-body";
    const signature = makeSignature(SIGNING_SECRET, timestamp, body);

    expect(
      verifySlackSignature({
        signingSecret: SIGNING_SECRET,
        timestamp,
        signature,
        rawBody: "payload=tampered-body",
      }),
    ).toBe(false);
  });

  it("rejects mismatched signing secret", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = "payload=test-body";
    const signature = makeSignature("wrong-secret", timestamp, body);

    expect(
      verifySlackSignature({
        signingSecret: SIGNING_SECRET,
        timestamp,
        signature,
        rawBody: body,
      }),
    ).toBe(false);
  });
});
