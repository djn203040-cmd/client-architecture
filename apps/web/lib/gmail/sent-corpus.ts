import "server-only";
import { getGmailClientForCoach } from "./client";
import { extractBody, extractHeader } from "./thread";
import {
  cleanSentBody,
  looksAutomated,
  MIN_BODY_CHARS,
  MAX_BODY_CHARS,
} from "./sent-corpus-clean";

// Bounded well under the 120 KB/channel cap of /api/voice/analyze so the
// import can never produce a corpus the analyzer rejects.
const MAX_MESSAGES = 120;
const MAX_TOTAL_CHARS = 100_000;
const MAX_IDS_TO_SCAN = 400;
const FETCH_CONCURRENCY = 8;

/**
 * Build a voice-model corpus from the coach's SENT mailbox: list recent sent
 * messages, strip quoted replies/signatures/automated mail, and join what's
 * left into the same paste-format the corpus importer produces by hand.
 * Read-only against Gmail (messages.list + messages.get).
 */
export async function buildSentCorpus(
  coachId: string,
): Promise<{ text: string; messageCount: number }> {
  const gmail = await getGmailClientForCoach(coachId);

  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < MAX_IDS_TO_SCAN) {
    const res = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["SENT"],
      maxResults: 100,
      pageToken,
    });
    ids.push(...(res.data.messages ?? []).flatMap((m) => (m.id ? [m.id] : [])));
    pageToken = res.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  const blocks: string[] = [];
  let totalChars = 0;

  for (let i = 0; i < ids.length; i += FETCH_CONCURRENCY) {
    if (blocks.length >= MAX_MESSAGES || totalChars >= MAX_TOTAL_CHARS) break;
    const batch = ids.slice(i, i + FETCH_CONCURRENCY);
    const messages = await Promise.all(
      batch.map(async (id) => {
        try {
          const { data } = await gmail.users.messages.get({
            userId: "me",
            id,
            format: "full",
          });
          return data;
        } catch {
          return null; // one unreadable message never sinks the import
        }
      }),
    );

    for (const msg of messages) {
      if (!msg?.payload) continue;
      const headers = msg.payload.headers ?? [];
      const subject = extractHeader(headers, "subject");
      const body = cleanSentBody(extractBody(msg.payload));
      if (body.length < MIN_BODY_CHARS) continue;
      if (looksAutomated(subject, body)) continue;

      const clipped = body.slice(0, MAX_BODY_CHARS);
      blocks.push(clipped);
      totalChars += clipped.length;
      if (blocks.length >= MAX_MESSAGES || totalChars >= MAX_TOTAL_CHARS) break;
    }
  }

  return { text: blocks.join("\n\n---\n\n"), messageCount: blocks.length };
}
