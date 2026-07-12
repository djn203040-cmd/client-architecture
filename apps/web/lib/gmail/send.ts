import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getGmailClientForCoach } from "./client";
import { extractHeader } from "./thread";
import { injectTrackingPixel } from "@/lib/email/template";

// Draft statuses from which a send may proceed. A draft reaches the send path
// only after approve_draft_atomic flips it to 'approved' (or 'edited').
const SENDABLE_STATUSES = ["approved", "edited"] as const;

// ----------------------------------------------------------------------------
// Pure helpers, MIME assembly. No IO, unit-testable.
// ----------------------------------------------------------------------------

/** Escape the five HTML-significant characters for safe interpolation. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain-text draft body -> minimal HTML (escaped, newlines -> <br>). */
export function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br>\n");
}

/**
 * Normalize a reply subject to a single "Re: " prefix, collapsing any existing
 * "Re:" chain ("Re: Re: Hi" -> "Re: Hi").
 */
export function ensureReSubject(subject: string): string {
  const stripped = subject.replace(/^(\s*re\s*:\s*)+/i, "").trim();
  return `Re: ${stripped}`;
}

/** RFC 2047 encode a header value only when it contains non-ASCII characters. */
function encodeHeaderWord(value: string): string {
  // eslint-disable-next-line no-control-regex -- reason: detecting non-ASCII for RFC2047 encoding
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Base64-encode UTF-8 content, wrapped at 76 chars per RFC 2045. */
function base64Part(content: string): string {
  return (
    Buffer.from(content, "utf8")
      .toString("base64")
      .match(/.{1,76}/g) ?? []
  ).join("\r\n");
}

export interface BuildRawEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  inReplyTo?: string | null;
  /** Fixed boundary for deterministic tests; defaults to a random token. */
  boundary?: string;
}

/**
 * Assemble a base64url-encoded RFC 822 message ready for the Gmail
 * `messages.send` `raw` field. multipart/alternative (text + html). We omit
 * From / Date / Message-ID so Gmail stamps the authenticated coach's identity
 * and assigns the canonical Message-ID (which we read back after send).
 */
export function buildRawEmail(params: BuildRawEmailParams): string {
  const { toEmail, toName, subject, textBody, htmlBody, inReplyTo } = params;
  const boundary =
    params.boundary ?? `=_caw_${Math.random().toString(36).slice(2)}`;

  const toHeader = toName
    ? `${encodeHeaderWord(toName)} <${toEmail}>`
    : toEmail;

  // No List-Unsubscribe header: these are 1:1 relationship emails sent as the
  // coach, not bulk mail. The header is a strong Gmail "bulk sender" signal that
  // pushes delivery to the Promotions tab, which breaks the "feels personal"
  // premise. Opt-out is handled via reply / dashboard DNC instead. (#41 / §2.6)
  const headers = [
    `To: ${toHeader}`,
    `Subject: ${encodeHeaderWord(subject)}`,
  ];
  if (inReplyTo) {
    const ref = inReplyTo.startsWith("<") ? inReplyTo : `<${inReplyTo}>`;
    headers.push(`In-Reply-To: ${ref}`, `References: ${ref}`);
  }
  headers.push(
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  );

  const mime = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Part(textBody),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Part(htmlBody),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return Buffer.from(mime, "utf8").toString("base64url");
}

// ----------------------------------------------------------------------------
// Orchestration, split into load / deliver / record so the Inngest function
// can wrap each in a memoized step (deliver must never re-run on retry).
// ----------------------------------------------------------------------------

export type SendSkip =
  | "draft_not_found"
  | "already_sent"
  | "not_sendable"
  | "no_lead_email";

export interface SendContext {
  draftId: string;
  coachId: string;
  leadId: string;
  toEmail: string;
  toName: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  threadId: string | null;
  inReplyTo: string | null;
  touchpointIndex: number | null;
  /** Fixed cadence send time for sequence touchpoints; null for ad-hoc drafts. */
  scheduledSendAt: string | null;
}

export interface LoadResult {
  skip?: SendSkip;
  ctx?: SendContext;
}

/**
 * Load + validate everything needed to send, resolving the subject and
 * threading target. Returns `{ skip }` when the draft is missing, already
 * sent, in a non-sendable state, or the lead has no email.
 */
export async function loadSendContext(
  draftId: string,
  coachId: string,
): Promise<LoadResult> {
  const { data: draft } = await adminClient
    .from("drafts")
    .select("id, coach_id, lead_id, status, body, subject, touchpoint_index, scheduled_send_at")
    .eq("id", draftId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (!draft) return { skip: "draft_not_found" };
  if (draft.status === "sent") return { skip: "already_sent" };
  if (!(SENDABLE_STATUSES as readonly string[]).includes(draft.status)) {
    return { skip: "not_sendable" };
  }

  const { data: lead } = await adminClient
    .from("leads")
    .select("id, name, email")
    .eq("id", draft.lead_id)
    .maybeSingle();

  if (!lead?.email) return { skip: "no_lead_email" };

  // Threading: reply into the most recent existing Gmail conversation with this
  // lead (sequence touchpoints and post-reply follow-ups all belong in-thread).
  const { data: prior } = await adminClient
    .from("email_events")
    .select("gmail_message_id, gmail_thread_id, raw_payload")
    .eq("coach_id", coachId)
    .eq("lead_id", draft.lead_id)
    .not("gmail_thread_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorSubject =
    (prior?.raw_payload as { subject?: string } | null)?.subject ?? null;

  let subject: string;
  let threadId: string | null = null;
  let inReplyTo: string | null = null;

  if (prior?.gmail_thread_id) {
    threadId = prior.gmail_thread_id;
    inReplyTo = prior.gmail_message_id ?? null;
    // Keep the thread's subject line stable; only add Re: once.
    subject = ensureReSubject(priorSubject || draft.subject || "Following up");
  } else {
    // Fresh conversation, the AI-generated subject is the source of truth.
    subject = draft.subject || "Following up";
  }

  // No unsubscribe footer (see buildRawEmail), keep the email indistinguishable
  // from a personal one. Open-tracking pixel is retained.
  const textBody = draft.body;
  const rawHtml = `<!DOCTYPE html><html><body><div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">${textToHtml(
    draft.body,
  )}</div></body></html>`;
  const htmlBody = injectTrackingPixel(rawHtml, draft.id);

  return {
    ctx: {
      draftId: draft.id,
      coachId,
      leadId: draft.lead_id,
      toEmail: lead.email,
      toName: lead.name ?? "",
      subject,
      textBody,
      htmlBody,
      threadId,
      inReplyTo,
      touchpointIndex: draft.touchpoint_index ?? null,
      scheduledSendAt: draft.scheduled_send_at ?? null,
    },
  };
}

export interface Delivery {
  gmailMessageId: string;
  gmailThreadId: string;
}

/**
 * Send the assembled message as the coach and read back the canonical RFC 822
 * Message-ID (the value inbound replies carry in In-Reply-To, which the Gmail
 * monitor matches on to correlate replies). MUST run inside a memoized Inngest
 * step so an Inngest retry never re-sends.
 */
export async function deliverDraft(ctx: SendContext): Promise<Delivery> {
  const gmail = await getGmailClientForCoach(ctx.coachId);

  const raw = buildRawEmail({
    toEmail: ctx.toEmail,
    toName: ctx.toName,
    subject: ctx.subject,
    textBody: ctx.textBody,
    htmlBody: ctx.htmlBody,
    inReplyTo: ctx.inReplyTo,
  });

  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: ctx.threadId ? { raw, threadId: ctx.threadId } : { raw },
  });

  const gmailId = sent.data.id ?? "";
  const gmailThreadId = sent.data.threadId ?? ctx.threadId ?? "";

  // Read back the RFC 822 Message-ID Gmail assigned, this is what reply
  // detection correlates against, so store the authoritative value.
  let rfcMessageId = "";
  if (gmailId) {
    const meta = await gmail.users.messages.get({
      userId: "me",
      id: gmailId,
      format: "metadata",
      metadataHeaders: ["Message-ID"],
    });
    rfcMessageId = extractHeader(meta.data.payload?.headers ?? [], "message-id")
      .replace(/[<>]/g, "")
      .trim();
  }

  return { gmailMessageId: rfcMessageId, gmailThreadId };
}

/**
 * Persist the send: record the `email_events` row (reply/open correlation key),
 * flip the draft to `sent`, and log the `email_sent` lead event.
 */
export async function recordDelivery(
  ctx: SendContext,
  delivery: Delivery,
  source: string,
): Promise<void> {
  await adminClient.from("email_events").insert({
    coach_id: ctx.coachId,
    lead_id: ctx.leadId,
    draft_id: ctx.draftId,
    event_type: "sent",
    gmail_message_id: delivery.gmailMessageId || null,
    gmail_thread_id: delivery.gmailThreadId || null,
    raw_payload: {
      subject: ctx.subject,
      source,
      touchpoint_index: ctx.touchpointIndex,
    },
  });

  await adminClient
    .from("drafts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", ctx.draftId);

  await adminClient.from("lead_events").insert({
    coach_id: ctx.coachId,
    lead_id: ctx.leadId,
    event_type: "email_sent",
    payload: { draft_id: ctx.draftId, subject: ctx.subject, source },
    triggered_by: "system",
  });
}
