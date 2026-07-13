import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Application-level envelope encryption for `transcripts.content`.
 *
 * WHY: call transcripts are the most sensitive free-text this product stores
 * (potentially special-category personal data about a coaching client). Supabase
 * already encrypts the database and its backups at rest, but that key is managed
 * by the platform. This adds a second, app-held key so that a database-only
 * compromise — a leaked backup, an exposed read replica, or a SQL-injection
 * primitive that returns rows — yields ciphertext, not readable transcripts.
 *
 * It deliberately does NOT protect against a full app-server / service-role
 * compromise, since the decryption key lives in the app environment. Identifiers
 * (leads.name/email/phone) are intentionally left unencrypted because email is
 * used for inbound-reply matching and dedup; they stay protected by RLS + the
 * platform's at-rest encryption.
 *
 * FORMAT: `enc:v1:<base64(iv)>:<base64(authTag)>:<base64(ciphertext)>`.
 * AES-256-GCM with a random 96-bit IV per record; the GCM auth tag makes
 * tampering detectable. The version segment allows a future key rotation / algo
 * change without ambiguity.
 *
 * KEY: `TRANSCRIPT_ENCRYPTION_KEY`, a base64-encoded 32-byte key. Generate with
 *   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 * and set it in Vercel (and .env.local for dev). Rotating it requires re-writing
 * existing rows through a new version tag.
 */

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.TRANSCRIPT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TRANSCRIPT_ENCRYPTION_KEY is not set — required to encrypt/decrypt transcript content",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TRANSCRIPT_ENCRYPTION_KEY must decode to exactly 32 bytes (base64)");
  }
  return key;
}

/** True if the stored value is in the encrypted envelope format. */
export function isEncryptedTranscript(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Encrypt plaintext transcript content for storage. */
export function encryptTranscript(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv, tag, ciphertext].map((b) => b.toString("base64")).join(":")
  );
}

/**
 * Decrypt stored transcript content. Legacy rows written before encryption was
 * introduced are plaintext and are returned unchanged, so read paths work during
 * and after the backfill. Returns null for null/undefined input.
 */
export function decryptTranscript(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext passthrough
  const parts = stored.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted transcript envelope");
  }
  const [ivB64, tagB64, ctB64] = parts as [string, string, string];
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
