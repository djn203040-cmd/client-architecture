import "server-only";

/**
 * Verify a Google Cloud Pub/Sub push JWT against Google's published JWKS.
 *
 * Google signs each push request with a JWT in `Authorization: Bearer <jwt>`.
 * The claims we care about:
 *   - iss === "https://accounts.google.com" (or "accounts.google.com")
 *   - aud === expected audience (configured on the subscription, typically the
 *     full URL of this endpoint or a custom audience string)
 *   - email === the service account configured for the subscription
 *   - exp not expired
 *
 * Reference: https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
 */

const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const ALLOWED_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

interface JwkKey {
  kid: string;
  n: string;
  e: string;
  alg: string;
  kty: string;
}

let jwksCache: { keys: JwkKey[]; expiresAt: number } | null = null;

async function loadJwks(): Promise<JwkKey[]> {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;
  const res = await fetch(GOOGLE_JWKS_URI, { cache: "no-store" });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const data = (await res.json()) as { keys: JwkKey[] };
  jwksCache = { keys: data.keys, expiresAt: now + 60 * 60 * 1000 };
  return data.keys;
}

function b64urlToBuf(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importRsaPublicKey(jwk: JwkKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

export interface GmailPubSubClaims {
  iss: string;
  aud: string;
  email?: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  sub: string;
}

export async function verifyGmailPubSubJwt(
  authHeader: string | null | undefined,
  opts: { expectedAudience: string; expectedEmail?: string },
): Promise<{ ok: true; claims: GmailPubSubClaims } | { ok: false; reason: string }> {
  if (!authHeader) return { ok: false, reason: "missing_authorization" };
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return { ok: false, reason: "bad_scheme" };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed_jwt" };

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  let header: { alg: string; kid: string; typ?: string };
  let payload: GmailPubSubClaims;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBuf(headerB64)));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBuf(payloadB64)));
  } catch {
    return { ok: false, reason: "bad_encoding" };
  }

  if (header.alg !== "RS256") return { ok: false, reason: "unsupported_alg" };
  if (!ALLOWED_ISSUERS.has(payload.iss)) return { ok: false, reason: "bad_issuer" };
  if (payload.aud !== opts.expectedAudience) return { ok: false, reason: "bad_audience" };
  if (opts.expectedEmail && payload.email !== opts.expectedEmail) {
    return { ok: false, reason: "bad_email" };
  }
  if (payload.email_verified === false) return { ok: false, reason: "email_not_verified" };
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now - 30) {
    return { ok: false, reason: "expired" };
  }

  const keys = await loadJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, reason: "unknown_kid" };

  const pub = await importRsaPublicKey(jwk);
  const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = b64urlToBuf(sigB64);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pub, sig, signed);
  if (!valid) return { ok: false, reason: "bad_signature" };

  return { ok: true, claims: payload };
}
