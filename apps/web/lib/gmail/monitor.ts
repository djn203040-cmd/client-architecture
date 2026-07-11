import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getGmailClientForCoach } from "./client";
import { extractHeader, extractBody } from "./thread";
import { isBounceMessage } from "./bounce-detector";
import { LEAD_REPLIED, LEAD_BOUNCED } from "@client/shared/constants/events";
// NO Inngest import, this module has no side effects beyond DB writes

/**
 * Gmail's history.list returns 404 (`notFound`) when startHistoryId is older
 * than Gmail's history retention window (~1 week). Local + dependency-free so
 * this module stays Inngest-free and unit-testable (unlike error-handler.ts,
 * which imports the Inngest client). Once the stored baseline ages out, every
 * push replays the same doomed query, detecting it lets us re-baseline.
 */
function isHistoryNotFoundError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { code?: number | string; status?: string; response?: { status?: number } };
  return err.code === 404 || err.code === "404" || err.status === "NOT_FOUND" || err.response?.status === 404;
}

export interface InngestEvent {
  name: string;
  data: object;
}

/** Pull the bare email out of a "Name <email>" From header, lowercased. */
function senderEmailOf(fromHeader: string): string {
  return (fromHeader.match(/<([^>]+)>/)?.[1] ?? fromHeader).trim().toLowerCase();
}

/**
 * Persist an inbound reply as a `received` email_events row, exactly once. The
 * partial unique index (coach_id, gmail_message_id) WHERE event_type='received'
 * is the idempotency gate: a duplicate insert (23505) means Gmail history
 * replayed a message we already handled, so the caller must NOT re-fire
 * LEAD_REPLIED. The body/snippet are kept in raw_payload so generate-reply.ts
 * has a durable ground truth instead of re-scraping the thread live.
 *
 * Returns isNew=false only for a confirmed duplicate. A non-dedup write error is
 * logged and treated as new (fire anyway), a storage hiccup must never swallow
 * a real reply; generate-reply degrades to fetching the message by id.
 */
async function recordInbound(args: {
  coachId: string;
  leadId: string;
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  body: string;
}): Promise<{ isNew: boolean }> {
  const { error } = await adminClient.from("email_events").insert({
    coach_id: args.coachId,
    lead_id: args.leadId,
    event_type: "received",
    gmail_message_id: args.messageId,
    gmail_thread_id: args.threadId,
    raw_payload: {
      from: args.from,
      subject: args.subject,
      snippet: args.snippet,
      body: args.body,
    },
  });
  if (error) {
    if (error.code === "23505") return { isNew: false }; // already processed
    console.error("[monitor] recordInbound write failed; firing anyway", {
      code: error.code,
      leadId: args.leadId,
    });
  }
  return { isNew: true };
}

/**
 * Sets up Gmail Pub/Sub watch for a coach. Called at Gmail connection + renewed every 6 days.
 * GMAIL-004, HEALTH-005
 */
export async function setupGmailWatch(coachId: string): Promise<void> {
  const gmail = await getGmailClientForCoach(coachId);
  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.GMAIL_PUBSUB_TOPIC_NAME!,
      labelIds: ["INBOX"],
      labelFilterBehavior: "INCLUDE",
    },
  });

  // expiration is milliseconds since epoch (string)
  const expiry = new Date(Number(response.data.expiration));
  await adminClient
    .from("integrations")
    .update({ watch_expiry_at: expiry.toISOString() })
    .eq("coach_id", coachId)
    .eq("provider", "gmail");
}

/**
 * Processes Gmail history since last known historyId for a coach.
 * Returns eventsToFire, caller (Inngest function) fires them via step.sendEvent().
 * GMAIL-008, COMPLY-005, SEQ-004
 *
 * Pure: no Inngest import, no inngest.send() calls, unit-testable.
 */
export async function processHistoryUpdate(
  coachId: string,
  historyId: string
): Promise<{ eventsToFire: InngestEvent[] }> {
  const gmail = await getGmailClientForCoach(coachId);
  const eventsToFire: InngestEvent[] = [];

  // Load last processed historyId from integrations.metadata (Pitfall 8)
  const { data: integration } = await adminClient
    .from("integrations")
    .select("metadata")
    .eq("coach_id", coachId)
    .eq("provider", "gmail")
    .single();

  const meta = integration?.metadata as { last_history_id?: string } | null;
  const startHistoryId = meta?.last_history_id ?? historyId;

  const historyResponse = await gmail.users.history
    .list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
      labelId: "INBOX",
    })
    .catch((e: unknown) => {
      // Stale baseline: Gmail purged history past startHistoryId (404 notFound).
      // Re-throw anything else; null signals the caller to re-baseline below.
      if (isHistoryNotFoundError(e)) return null;
      throw e;
    });

  if (historyResponse === null) {
    // Re-baseline to this push's current historyId so future pushes query from a
    // valid point, and skip this delta (it's unrecoverable, Gmail no longer has
    // it). Without this the 404 strands the monitor: the baseline never advances,
    // so every subsequent push replays the same doomed query.
    await adminClient
      .from("integrations")
      .update({ metadata: { ...(meta ?? {}), last_history_id: historyId } })
      .eq("coach_id", coachId)
      .eq("provider", "gmail");
    return { eventsToFire: [] };
  }

  const historyItems = historyResponse.data.history ?? [];
  const messages = historyItems.flatMap((h) => h.messagesAdded ?? []);

  for (const { message } of messages) {
    if (!message?.id) continue;

    // format:full so we capture the inbound body + threadId once, here, the
    // reply generator reads it back from email_events instead of re-scraping.
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full",
    });

    const headers = msg.data.payload?.headers ?? [];
    const fromAddress = extractHeader(headers, "from");
    const inReplyTo = extractHeader(headers, "in-reply-to");
    const subject = extractHeader(headers, "subject");
    const threadId = msg.data.threadId ?? "";
    const snippet = msg.data.snippet ?? "";
    const body = msg.data.payload ? extractBody(msg.data.payload) : "";

    // COMPLY-005: MAILER-DAEMON detection for hard bounces
    if (isBounceMessage(headers)) {
      eventsToFire.push({
        name: LEAD_BOUNCED,
        data: {
          coachId,
          messageId: message.id,
          subject,
          fromAddress,
        },
      });
      continue;
    }

    const senderEmail = fromAddress ? senderEmailOf(fromAddress) : "";

    // GMAIL-008, D-14: Reply detection via In-Reply-To header
    if (inReplyTo) {
      // Strip angle brackets: "<msg-id@mail.gmail.com>" → "msg-id@mail.gmail.com"
      const cleanedMessageId = inReplyTo.replace(/[<>]/g, "").trim();

      const { data: emailEvent } = await adminClient
        .from("email_events")
        .select("lead_id")
        .eq("coach_id", coachId)
        .eq("gmail_message_id", cleanedMessageId)
        .maybeSingle();

      if (emailEvent?.lead_id) {
        // Guard against false triggers: a reply only counts if it actually came
        // FROM the lead. Our own threaded sends (coach is the sender) and any
        // third-party participant land in the same thread and carry In-Reply-To
        // too, without this they spawn phantom reply drafts answering nothing.
        const { data: lead } = await adminClient
          .from("leads")
          .select("email")
          .eq("id", emailEvent.lead_id)
          .maybeSingle();
        const leadEmail = lead?.email?.toLowerCase() ?? null;
        if (!leadEmail || senderEmail !== leadEmail) continue;

        const { isNew } = await recordInbound({
          coachId,
          leadId: emailEvent.lead_id as string,
          messageId: message.id,
          threadId,
          from: fromAddress,
          subject,
          snippet,
          body,
        });
        if (isNew) {
          eventsToFire.push({
            name: LEAD_REPLIED,
            data: {
              coachId,
              leadId: emailEvent.lead_id,
              messageId: message.id,
              threadId,
              inReplyToMessageId: cleanedMessageId,
            },
          });
        }
        continue;
      }
    }

    // D-18: Fresh email from lead currently in_sequence → fire LEAD_REPLIED, not intake card
    // D-22: Inbound email from known lead NOT in active sequence → surface intake card
    if (fromAddress) {
      if (senderEmail) {
        const { data: lead } = await adminClient
          .from("leads")
          .select("id, status")
          .eq("coach_id", coachId)
          .eq("email", senderEmail)
          .maybeSingle();

        if (lead && lead.status === "in_sequence") {
          // D-18: Fresh email (no In-Reply-To) from in_sequence lead → treat as reply
          const { isNew } = await recordInbound({
            coachId,
            leadId: lead.id,
            messageId: message.id,
            threadId,
            from: fromAddress,
            subject,
            snippet,
            body,
          });
          if (isNew) {
            eventsToFire.push({
              name: LEAD_REPLIED,
              data: { coachId, leadId: lead.id, messageId: message.id, threadId },
            });
          }
          continue;
        }

        // D-22: Surface intake card only if lead exists and is NOT in active sequence
        if (lead && lead.status !== "in_sequence") {
          const { data: existing } = await adminClient
            .from("pending_actions")
            .select("id")
            .eq("coach_id", coachId)
            .eq("lead_id", lead.id)
            .eq("type", "lead_intake")
            .is("dismissed_at", null)
            .maybeSingle();

          if (!existing) {
            await adminClient.from("pending_actions").insert({
              coach_id: coachId,
              lead_id: lead.id,
              type: "lead_intake",
              payload: { messageId: message.id, fromAddress },
            });
          }
        }
      }
    }
  }

  // Pitfall 8: Persist latest historyId so next poll starts from here
  await adminClient
    .from("integrations")
    .update({
      metadata: {
        ...(meta ?? {}),
        last_history_id: historyId,
      },
    })
    .eq("coach_id", coachId)
    .eq("provider", "gmail");

  return { eventsToFire };
}
