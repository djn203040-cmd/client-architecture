import type { TThreadEmail } from "@/lib/gmail/thread";

// Pure thread-shaping helpers shared by the reply and re-engagement draft
// generators. No server-only / DB imports so they stay unit-testable in a plain
// node environment.

/**
 * From a Gmail thread, return the lead's trailing unanswered message(s) — every
 * message from the lead that arrived after our most recent outbound message. If
 * the lead sent three emails before we replied, all three come back (oldest
 * first) so the draft answers the whole burst, not just the last one. Returns
 * null when nothing from the lead is outstanding.
 */
export function extractUnansweredInbound(
  thread: TThreadEmail[],
  leadEmail: string | null,
): string | null {
  if (!leadEmail) return null;
  const needle = leadEmail.toLowerCase();
  const isFromLead = (m: TThreadEmail) => m.from.toLowerCase().includes(needle);

  // Work oldest-first regardless of how the source was sorted.
  const chrono = [...thread].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Index of our most recent outbound (anything not from the lead).
  let lastOutbound = -1;
  for (let i = chrono.length - 1; i >= 0; i--) {
    if (!isFromLead(chrono[i]!)) {
      lastOutbound = i;
      break;
    }
  }

  const outstanding = chrono
    .slice(lastOutbound + 1)
    .filter(isFromLead)
    .map((m) => (m.body || m.snippet).trim())
    .filter(Boolean);

  return formatInboundMessages(outstanding);
}

/**
 * Format an ordered list of the lead's inbound message bodies into a single
 * <lead_reply> payload. One message passes through verbatim; a burst is labelled
 * "Message i of n" so the model answers all of them together. Shared by the
 * Gmail-thread path and the stored-`received`-rows path so both render identically.
 * Blank entries are dropped; returns null when nothing usable remains.
 */
export function formatInboundMessages(bodies: string[]): string | null {
  const cleaned = bodies.map((b) => (b ?? "").trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  if (cleaned.length === 1) return cleaned[0]!;
  return cleaned
    .map((body, i) => `Message ${i + 1} of ${cleaned.length}:\n${body}`)
    .join("\n\n");
}

/**
 * Formats a Gmail thread into a labelled, chronological conversation so the
 * model sees BOTH sides (our sent messages live in drafts, but the lead's
 * inbound replies are only in Gmail). Best-effort context for re-engagement.
 */
export function formatThreadAsConversation(
  thread: TThreadEmail[],
  leadEmail: string | null,
  leadName: string,
  coachName: string,
): string | null {
  if (thread.length === 0) return null;
  const needle = leadEmail?.toLowerCase() ?? null;
  const chrono = [...thread].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const lines = chrono
    .map((m) => {
      const fromLead = needle ? m.from.toLowerCase().includes(needle) : false;
      const who = fromLead ? leadName : coachName;
      const text = (m.body || m.snippet).trim();
      return text ? `${who}: ${text}` : null;
    })
    .filter(Boolean) as string[];
  return lines.length > 0 ? lines.join("\n\n") : null;
}
