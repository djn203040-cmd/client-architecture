// Pure text-cleaning helpers for the sent-emails voice import. Kept free of
// server-only imports so they stay unit-testable.

export const MIN_BODY_CHARS = 60;
export const MAX_BODY_CHARS = 4_000;

// Everything from the first quoted-reply / forwarded-header marker onward is
// someone else's writing, not the coach's voice.
const QUOTE_MARKERS: RegExp[] = [
  /^On .{5,200} wrote:\s*$/m, // Gmail EN reply header
  /^Den .{5,200} skrev .*:\s*$/m, // Gmail DA reply header
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^-{2,}\s*Forwarded message\s*-{2,}/im,
  /^_{10,}\s*$/m, // Outlook divider
  /^From:\s.+$/m, // forwarded header block
  /^Fra:\s.+$/m,
];

export function cleanSentBody(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");

  let cut = text.length;
  for (const marker of QUOTE_MARKERS) {
    const match = marker.exec(text);
    if (match && match.index < cut) cut = match.index;
  }
  text = text.slice(0, cut);

  // Drop quoted lines and collapse the whitespace they leave behind.
  text = text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n");
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

/** Calendar invites, auto-replies, and newsletter-ish sends teach the model
 * nothing about how the coach actually writes. */
export function looksAutomated(subject: string, body: string): boolean {
  const s = subject.toLowerCase();
  if (
    /^(invitation|accepted|declined|tentative|updated invitation|canceled event|cancelled event)[: ]/.test(s) ||
    /(out of office|automatic reply|autosvar|auto-reply)/.test(s)
  ) {
    return true;
  }
  if (/unsubscribe|afmeld dig|view in browser/i.test(body)) return true;
  return false;
}
