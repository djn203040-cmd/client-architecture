import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getGmailClientForCoach } from "./client";
import { extractHeader } from "./thread";
import { isBounceMessage } from "./bounce-detector";
import { LEAD_REPLIED, LEAD_BOUNCED } from "@client/shared/constants/events";
// NO Inngest import — this module has no side effects beyond DB writes

export interface InngestEvent {
  name: string;
  data: object;
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
 * Returns eventsToFire — caller (Inngest function) fires them via step.sendEvent().
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

  const historyResponse = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
    labelId: "INBOX",
  });

  const historyItems = historyResponse.data.history ?? [];
  const messages = historyItems.flatMap((h) => h.messagesAdded ?? []);

  for (const { message } of messages) {
    if (!message?.id) continue;

    const msg = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
      metadataHeaders: ["From", "In-Reply-To", "Message-ID", "Subject"],
    });

    const headers = msg.data.payload?.headers ?? [];
    const fromAddress = extractHeader(headers, "from");
    const inReplyTo = extractHeader(headers, "in-reply-to");
    const subject = extractHeader(headers, "subject");

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
        eventsToFire.push({
          name: LEAD_REPLIED,
          data: {
            coachId,
            leadId: emailEvent.lead_id,
            messageId: message.id,
            inReplyToMessageId: cleanedMessageId,
          },
        });
        continue;
      }
    }

    // D-18: Fresh email from lead currently in_sequence → fire LEAD_REPLIED, not intake card
    // D-22: Inbound email from known lead NOT in active sequence → surface intake card
    if (fromAddress) {
      const senderEmail = fromAddress.match(/<([^>]+)>/)?.[1] ?? fromAddress.trim();
      if (senderEmail) {
        const { data: lead } = await adminClient
          .from("leads")
          .select("id, status")
          .eq("coach_id", coachId)
          .eq("email", senderEmail)
          .maybeSingle();

        if (lead && lead.status === "in_sequence") {
          // D-18: Fresh email (no In-Reply-To) from in_sequence lead → treat as reply
          eventsToFire.push({
            name: LEAD_REPLIED,
            data: { coachId, leadId: lead.id, messageId: message.id },
          });
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
