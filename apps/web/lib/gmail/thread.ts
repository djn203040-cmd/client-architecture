import "server-only";
import { getGmailClientForCoach } from "./client";
import type { gmail_v1 } from "googleapis";

export type TThreadEmail = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
};

export function decodeBody(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

export function extractBody(payload: gmail_v1.Schema$MessagePart): string {
  if (payload.body?.data) {
    return decodeBody(payload.body.data);
  }
  const parts = payload.parts ?? [];
  const textPart = parts.find((p) => p.mimeType === "text/plain");
  const htmlPart = parts.find((p) => p.mimeType === "text/html");
  const part = textPart ?? htmlPart;
  if (part?.body?.data) return decodeBody(part.body.data);
  return "";
}

export function extractHeader(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string
): string {
  const lower = name.toLowerCase();
  return headers.find((h) => h.name?.toLowerCase() === lower)?.value ?? "";
}

/**
 * Fetch a single Gmail message by its internal id (the id Gmail history hands us
 * for an inbound reply). Used as the authoritative ground truth for a reply
 * draft, we answer THIS message, not a guess scraped from the send-thread.
 * Returns null on any failure so callers can degrade gracefully.
 */
export async function fetchMessageById(
  coachId: string,
  messageId: string
): Promise<TThreadEmail | null> {
  try {
    const gmail = await getGmailClientForCoach(coachId);
    const { data: msg } = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });
    const headers = msg.payload?.headers ?? [];
    return {
      id: msg.id ?? messageId,
      from: extractHeader(headers, "from"),
      subject: extractHeader(headers, "subject"),
      date: msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : "",
      snippet: msg.snippet ?? "",
      body: msg.payload ? extractBody(msg.payload) : "",
    };
  } catch {
    return null;
  }
}

export async function fetchLeadThread(
  coachId: string,
  threadId: string
): Promise<TThreadEmail[]> {
  const gmail = await getGmailClientForCoach(coachId);
  const response = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });
  const messages = response.data.messages ?? [];
  return messages
    .map((msg) => {
      const headers = msg.payload?.headers ?? [];
      return {
        id: msg.id ?? "",
        from: extractHeader(headers, "from"),
        subject: extractHeader(headers, "subject"),
        date: msg.internalDate
          ? new Date(Number(msg.internalDate)).toISOString()
          : "",
        snippet: msg.snippet ?? "",
        body: msg.payload ? extractBody(msg.payload) : "",
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
