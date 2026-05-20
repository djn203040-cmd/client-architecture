import "server-only";

export const MAX_SMS_LENGTH = 160;
const MAX_LEAD_NAME_LENGTH = 30;

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

export type SmsVariant = "initial" | "followup" | "bounce";

export interface SmsBodyArgs {
  variant: SmsVariant;
  leadName?: string;
  leadEmail?: string;
  shortLink?: string;
}

export function buildSmsBody(args: SmsBodyArgs): string {
  const lead = truncate(args.leadName ?? "your lead", MAX_LEAD_NAME_LENGTH);

  if (args.variant === "initial") {
    return `Sonorous: Draft for ${lead} ready. ${args.shortLink ?? ""}`.trim();
  }
  if (args.variant === "followup") {
    return `Sonorous: Reminder, draft for ${lead} still waiting. ${args.shortLink ?? ""}`.trim();
  }
  // bounce
  return `Sonorous: Email to ${args.leadEmail ?? "lead"} bounced. Check integrations.`;
}
