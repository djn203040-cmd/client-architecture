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

  if (outstanding.length === 0) return null;
  if (outstanding.length === 1) return outstanding[0]!;
  return outstanding
    .map((body, i) => `Message ${i + 1} of ${outstanding.length}:\n${body}`)
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
