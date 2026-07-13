import { describe, it, expect } from "vitest";
import {
  encryptTranscript,
  decryptTranscript,
  isEncryptedTranscript,
} from "@/lib/crypto/transcript-cipher";

// TRANSCRIPT_ENCRYPTION_KEY is provided by .env.test.

describe("transcript-cipher", () => {
  it("round-trips content", () => {
    const plain = "Coach: How are you?\nLead: Struggling with consistency.";
    const enc = encryptTranscript(plain);
    expect(enc).not.toContain("Struggling");
    expect(isEncryptedTranscript(enc)).toBe(true);
    expect(decryptTranscript(enc)).toBe(plain);
  });

  it("produces a fresh IV each call (ciphertexts differ)", () => {
    const plain = "same input";
    expect(encryptTranscript(plain)).not.toBe(encryptTranscript(plain));
  });

  it("passes through legacy plaintext unchanged", () => {
    const legacy = "an old row stored before encryption existed";
    expect(isEncryptedTranscript(legacy)).toBe(false);
    expect(decryptTranscript(legacy)).toBe(legacy);
  });

  it("returns null for null/undefined", () => {
    expect(decryptTranscript(null)).toBeNull();
    expect(decryptTranscript(undefined)).toBeNull();
  });

  it("handles empty string and unicode", () => {
    expect(decryptTranscript(encryptTranscript(""))).toBe("");
    const u = "Møde med Søren 🌱 — næste skridt";
    expect(decryptTranscript(encryptTranscript(u))).toBe(u);
  });

  it("detects tampering via the GCM auth tag", () => {
    const enc = encryptTranscript("sensitive");
    const parts = enc.replace("enc:v1:", "").split(":");
    // Flip a byte in the ciphertext segment.
    const ct = Buffer.from(parts[2]!, "base64");
    ct[0]! ^= 0xff;
    const tampered = `enc:v1:${parts[0]}:${parts[1]}:${ct.toString("base64")}`;
    expect(() => decryptTranscript(tampered)).toThrow();
  });
});
