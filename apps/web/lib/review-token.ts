import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export interface ReviewTokenPayload {
  draftId: string;
  coachId: string;
  nonce: string; // matches drafts.review_token_nonce on issue
  exp: number; // unix ms
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function generateReviewToken(args: {
  draftId: string;
  coachId: string;
  nonce: string;
  ttlMs?: number;
}): string {
  const secret = process.env.JWT_REVIEW_SECRET;
  if (!secret) throw new Error("JWT_REVIEW_SECRET env var not set");
  const payload: ReviewTokenPayload = {
    draftId: args.draftId,
    coachId: args.coachId,
    nonce: args.nonce,
    exp: Date.now() + (args.ttlMs ?? SEVEN_DAYS_MS),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyReviewToken(token: string): ReviewTokenPayload | null {
  const secret = process.env.JWT_REVIEW_SECRET;
  if (!secret) return null;
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const encoded = token.slice(0, dotIndex);
  const provided = token.slice(dotIndex + 1);
  if (!encoded || !provided) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as ReviewTokenPayload;
    if (Date.now() > payload.exp) return null;
    if (!payload.draftId || !payload.coachId || !payload.nonce) return null;
    return payload;
  } catch {
    return null;
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.sonorous.com";

export function buildReviewUrl(token: string): string {
  return `${APP_URL}/review/${encodeURIComponent(token)}`;
}

export function buildShortReviewUrl(token: string): string {
  return `${APP_URL}/r/${encodeURIComponent(token)}`;
}
