import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { LEAD_REPLIED } from "@client/shared/constants/events";

export const replyHandler = inngest.createFunction(
  { id: "reply-handler", triggers: [{ event: LEAD_REPLIED }] },
  async ({ event, step }) => {
    const { coachId, leadId, messageId, inReplyToMessageId } = event.data as {
      coachId: string;
      leadId: string;
      messageId: string;
      inReplyToMessageId?: string;
    };

    // D-16 step 1: Update lead state to replied + log event
    await step.run("update-lead-status", async () => {
      const { data: lead } = await adminClient
        .from("leads")
        .select("status")
        .eq("id", leadId)
        .single();

      await adminClient
        .from("leads")
        .update({ status: "replied" })
        .eq("id", leadId)
        .eq("coach_id", coachId);

      await adminClient.from("lead_events").insert({
        lead_id: leadId,
        coach_id: coachId,
        event_type: "state_changed",
        payload: {
          from: lead?.status ?? "unknown",
          to: "replied",
          trigger: "lead_reply",
          messageId,
        },
        triggered_by: "system",
      });
    });

    // D-16 step 2: Pause active sequence for this lead (SEQ-009)
    await step.run("pause-sequence", async () => {
      await adminClient
        .from("sequences")
        .update({ status: "paused" })
        .eq("lead_id", leadId)
        .eq("coach_id", coachId)
        .eq("status", "active");
    });

    // D-16 step 3: Cancel pending drafts (clear the queue for this lead)
    await step.run("cancel-pending-drafts", async () => {
      await adminClient
        .from("drafts")
        .update({ status: "cancelled" })
        .eq("lead_id", leadId)
        .eq("coach_id", coachId)
        .eq("status", "pending");
    });

    // D-16 step 4: Fire AI reply draft generation (AI-008)
    // step.sendEvent is memoized and idempotent on retry — do NOT use inngest.send()
    // track: "replied" → Phase 2 AI engine applies the 'replied' state framing (D-14)
    await step.sendEvent("fire-reply-draft", {
      name: "draft/generate",
      data: {
        coachId,
        leadId,
        track: "replied",
        messageId,
        inReplyToMessageId,
      },
    });

    return {
      ok: true,
      leadId,
      sequencePaused: true,
      draftGenerationFired: true,
    };
  }
);
