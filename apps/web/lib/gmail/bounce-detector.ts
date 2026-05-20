import "server-only";
import type { gmail_v1 } from "googleapis";

/**
 * Returns true if the message's From header indicates a bounce (MAILER-DAEMON or postmaster).
 * COMPLY-005, RESEARCH.md Pitfall 2.
 */
export function isBounceMessage(
  headers: gmail_v1.Schema$MessagePartHeader[]
): boolean {
  const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
  return (
    from.toLowerCase().includes("mailer-daemon") ||
    from.toLowerCase().includes("postmaster@")
  );
}

/**
 * Attempts to extract the bounced email address from the subject line or snippet.
 * Patterns: "Delivery to <email> failed", "Your message to <email>"
 * Returns null if unable to parse.
 */
export function extractBouncedEmail(subject: string, snippet: string): string | null {
  const bracketMatch = subject.match(/<([^>@\s]+@[^>@\s]+)>/);
  if (bracketMatch?.[1]) return bracketMatch[1];

  const toMatch = snippet.match(/to\s+([^\s,<>]+@[^\s,<>]+)/i);
  if (toMatch?.[1]) return toMatch[1];

  return null;
}
