import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyFirefliesSignature, verifyZoomSignature } from "@/lib/transcripts/lead-matching";

const FF_SECRET = "fireflies-test-secret";
const ZOOM_SECRET = "zoom-test-secret";

function makeFirefliesSignature(body: string, secret = FF_SECRET) {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

function makeZoomSignature(body: string, timestamp: string, secret = ZOOM_SECRET) {
  const message = `v0:${timestamp}:${body}`;
  return "v0=" + createHmac("sha256", secret).update(message).digest("hex");
}

describe("verifyFirefliesSignature", () => {
  it("returns true for a body signed with the correct secret", () => {
    const body = JSON.stringify({ meetingId: "abc123", eventType: "Transcription completed" });
    expect(verifyFirefliesSignature(body, makeFirefliesSignature(body), FF_SECRET)).toBe(true);
  });

  it("returns false for a tampered body", () => {
    const body = JSON.stringify({ meetingId: "abc123" });
    const sig = makeFirefliesSignature(body);
    expect(verifyFirefliesSignature(JSON.stringify({ meetingId: "tampered" }), sig, FF_SECRET)).toBe(false);
  });

  it("returns false when signature header is null", () => {
    const body = "anything";
    expect(verifyFirefliesSignature(body, null, FF_SECRET)).toBe(false);
  });

  it("returns false when signature header is empty string", () => {
    expect(verifyFirefliesSignature("body", "", FF_SECRET)).toBe(false);
  });

  it("returns false when signed with a different secret", () => {
    const body = "payload";
    const sig = makeFirefliesSignature(body, "wrong-secret");
    expect(verifyFirefliesSignature(body, sig, FF_SECRET)).toBe(false);
  });
});

describe("verifyZoomSignature", () => {
  it("returns true for a correctly constructed v0 signature", () => {
    const body = JSON.stringify({ event: "recording.transcript_completed" });
    const ts = "1716123456";
    expect(verifyZoomSignature(body, makeZoomSignature(body, ts), ts, ZOOM_SECRET)).toBe(true);
  });

  it("returns false when body is altered", () => {
    const body = JSON.stringify({ event: "recording.transcript_completed" });
    const ts = "1716123456";
    const sig = makeZoomSignature(body, ts);
    expect(verifyZoomSignature(JSON.stringify({ event: "tampered" }), sig, ts, ZOOM_SECRET)).toBe(false);
  });

  it("returns false when timestamp is altered", () => {
    const body = "payload";
    const ts = "1716123456";
    const sig = makeZoomSignature(body, ts);
    expect(verifyZoomSignature(body, sig, "9999999999", ZOOM_SECRET)).toBe(false);
  });

  it("returns false when signature is null", () => {
    expect(verifyZoomSignature("body", null, "12345", ZOOM_SECRET)).toBe(false);
  });

  it("returns false when timestamp is null", () => {
    expect(verifyZoomSignature("body", "v0=abc", null, ZOOM_SECRET)).toBe(false);
  });
});
