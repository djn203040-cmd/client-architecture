import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { generateReplyDraft } from "@/lib/drafts/generate-reply";
import { LEAD_REPLIED } from "@client/shared/constants/events";

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sendEvent(id: string, event: { name: string; data: unknown }): Promise<unknown>;
};

type ReplyEvent = {
  name: string;
  data: {
    coachId: string;
    leadId: string;
    messageId: string;
    inReplyToMessageId?: string;
  };
};

export async function replyHandlerFn({
  event,
  step,
}: {
  event: ReplyEvent;
  step: StepTools;
}) {
  const { coachId, leadId, messageId } = event.data;

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

  // D-16 step 4: Generate the AI reply draft (AI-008).
  // There is NO Inngest consumer for a "draft/generate" event — every other
  // generation path calls a function synchronously inside a step (see
  // generateTouchpointDraft). Do the same here so a reply actually produces a
  // draft instead of firing a dead event. The AI engine applies the 'replied'
  // state framing (D-14). step.run is memoized/idempotent on retry.
  const generated = await step.run("generate-reply-draft", () =>
    generateReplyDraft({ coachId, leadId }),
  );

  // D-16 step 5: Notify the coach a reply landed and a draft is waiting.
  // notification-dispatcher fans out to the coach's enabled channels for the
  // lead_replied event (reads the per-coach notification matrix). Skip when the
  // draft auto-approved (mode_a) — there is nothing to review.
  if (generated.ok && generated.status === "pending") {
    await step.sendEvent("notify-lead-replied", {
      name: "notification/lead_replied",
      data: {
        coachId,
        eventType: "lead_replied",
        payload: {
          draftId: generated.draftId,
          leadName: generated.leadName,
          confidenceLevel: generated.confidenceLevel,
        },
      },
    });
  }

  return {
    ok: true,
    leadId,
    sequencePaused: true,
    draftGenerated: generated.ok,
    draftId: generated.ok ? generated.draftId : null,
    notified: generated.ok && generated.status === "pending",
  };
}

export const replyHandler = inngest.createFunction(
  { id: "reply-handler", triggers: [{ event: LEAD_REPLIED }] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest event payload is structurally typed at runtime; no static schema
  replyHandlerFn as any,
);
