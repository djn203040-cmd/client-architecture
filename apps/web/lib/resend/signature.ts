import "server-only";

/**
 * Verify a Resend webhook signature.
 * Resend uses Svix under the hood. Resend SDK v6.12.3 does not ship
 * resend.webhooks.verify, so we use the svix lib directly.
 * Per 04-RESEARCH.md Don't-Hand-Roll — Resend uses Svix's signing scheme.
 */
export async function verifyResendSignature(args: {
  rawBody: string;
  headers: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  };
  secret: string;
}): Promise<boolean> {
  try {
    const { Webhook } = await import("svix");
    const wh = new Webhook(args.secret);
    wh.verify(args.rawBody, args.headers);
    return true;
  } catch {
    return false;
  }
}
