import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export function verifySlackSignature(args: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
}): boolean {
  if (!args.signingSecret || !args.timestamp || !args.signature) return false;
  const tsNum = Number(args.timestamp);
  if (!Number.isFinite(tsNum)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > 300) return false; // 5-min replay window

  const baseString = `v0:${args.timestamp}:${args.rawBody}`;
  const computed = "v0=" + createHmac("sha256", args.signingSecret).update(baseString).digest("hex");
  const a = Buffer.from(computed);
  const b = Buffer.from(args.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
