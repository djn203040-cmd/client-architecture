import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { LEAD_BOUNCED } from "@client/shared/constants/events";
import { getGmailClientForCoach } from "@/lib/gmail/client";
import { extractBouncedEmail } from "@/lib/gmail/bounce-detector";
import { extractHeader } from "@/lib/gmail/thread";

export const bounceHandler = inngest.createFunction(
  { id: "bounce-handler" },
  { event: LEAD_BOUNCED },
  async ({ event, step }) => {
    const { coachId, messageId, subject: subjectFromEvent } = event.data as {
      coachId: string;
      messageId: string;
      subject?: string;
      fromAddress?: string;
    };

    const bouncedEmail = await step.run("extract-bounced-email", async () => {
      try {
        const gmail = await getGmailClientForCoach(coachId);
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "metadata",
          metadataHeaders: ["Subject", "From"],
        });

        const headers = msg.data.payload?.headers ?? [];
        const subject = extractHeader(headers, "subject");
        const snippet = msg.data.snippet ?? "";

        return extractBouncedEmail(subject || subjectFromEvent || "", snippet);
      } catch {
        return null;
      }
    });

    if (!bouncedEmail) {
      return { ok: false, reason: "could_not_extract_email" };
    }

    const lead = await step.run("find-lead", async () => {
      const { data } = await adminClient
        .from("leads")
        .select("id, status, email, name")
        .eq("coach_id", coachId)
        .eq("email", bouncedEmail)
        .maybeSingle();
      return data;
    });

    if (!lead) {
      return { ok: false, reason: "lead_not_found", bouncedEmail };
    }

    await step.run("mark-lead-bounced", async () => {
      await adminClient
        .from("leads")
        .update({ bounced: true })
        .eq("id", lead.id);

      await adminClient
        .from("sequences")
        .update({ status: "cancelled" })
        .eq("lead_id", lead.id)
        .eq("coach_id", coachId)
        .in("status", ["active", "paused"]);

      await adminClient.from("lead_events").insert({
        lead_id: lead.id,
        coach_id: coachId,
        event_type: "email_bounced",
        payload: {
          bouncedEmail,
          messageId,
          reason: "hard_bounce",
        },
        triggered_by: "system",
      });
    });

    // Queue notification row — Phase 4 (NOTIFY-001–008) owns multi-channel delivery
    await step.run("queue-bounce-notification", async () => {
      await adminClient.from("notification_log").insert({
        coach_id: coachId,
        event_type: "lead_bounced",
        payload: { leadId: lead.id, email: bouncedEmail, bouncedMessageId: messageId },
        status: "pending",
      });
    });

    return {
      ok: true,
      leadId: lead.id,
      bouncedEmail,
      sequencesCancelled: true,
      notificationQueued: true,
    };
  }
);
