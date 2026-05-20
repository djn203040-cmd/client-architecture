import "server-only";
import twilio from "twilio";

export function verifyTwilioSignature(args: {
  authToken: string;
  signature: string;
  fullUrl: string;
  params: Record<string, string>;
}): boolean {
  if (!args.authToken || !args.signature) return false;
  return twilio.validateRequest(args.authToken, args.signature, args.fullUrl, args.params);
}
