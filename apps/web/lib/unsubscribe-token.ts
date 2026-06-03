import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

interface UnsubscribePayload {
  leadId: string;
  coachId: string;
  t: number;
}

export function generateUnsubscribeToken(leadId: string, coachId: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET env var not set");

  const payload: UnsubscribePayload = { leadId, coachId, t: Date.now() };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = createHmac("sha256", secret).update(encodedPayload).digest("hex");

  return `${encodedPayload}.${hmac}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, providedHmac] = parts;
  // Length check above doesn't narrow the destructured elements under
  // noUncheckedIndexedAccess — guard explicitly so both are `string`.
  if (!encodedPayload || !providedHmac) return null;

  const expectedHmac = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("hex");

  const a = Buffer.from(providedHmac);
  const b = Buffer.from(expectedHmac);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as UnsubscribePayload;
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(leadId: string, coachId: string): string {
  const token = generateUnsubscribeToken(leadId, coachId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${appUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}
