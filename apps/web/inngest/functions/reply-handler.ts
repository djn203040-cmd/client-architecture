import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { generateReplyDraft } from "@/lib/drafts/generate-reply";
import { LEAD_REPLIED } from "@client/shared/constants/events";
import { isSendBlocked } from "@client/shared";
import type { TLeadStatus } from "@client/shared/types";

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
    threadId?: string;
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
  const { coachId, leadId, messageId, threadId } = event.data;

  // D-16 step 1: Update lead state to replied + log event.
  //
  // Guard against demoting a lead OUT of a terminal state. Without this, a
  // "thanks!" from a CONVERTED client would overwrite status → 'replied', which
  // (a) loses the converted flag and (b) makes them re-engagement-eligible
  // (checkReengageEligible gates on status === 'replied'), so the nurture loop
  // would nudge a paying client and eventually mark them 'lost'. A SEND-BLOCKED
  // lead (unsubscribed/DNC/bounced/lost) must not re-enter automation at all.
  const gate = await step.run("update-lead-status", async () => {
    const { data: lead } = await adminClient
      .from("leads")
      .select("status, do_not_contact")
      .eq("id", leadId)
      .single();

    const status = (lead?.status ?? "unknown") as TLeadStatus;
    const sendBlocked = isSendBlocked(status, lead?.do_not_contact ?? false);
    const isConverted = status === "converted";

    // Only demote to 'replied' from a non-terminal state. Converted stays
    // converted (still sendable per D-01, but never re-engaged); send-blocked
    // leads keep their blocking state.
    if (!sendBlocked && !isConverted) {
      await adminClient
        .from("leads")
        .update({ status: "replied" })
        .eq("id", leadId)
        .eq("coach_id", coachId);

      await adminClient.from("lead_events").insert({
        lead_id: leadId,
        coach_id: coachId,
        event_type: "state_changed",
        payload: { from: status, to: "replied", trigger: "lead_reply", messageId },
        triggered_by: "system",
      });
    }

    return { sendBlocked, isConverted };
  });

  // A send-blocked lead (unsubscribed/DNC/bounced/lost) gets no outbound
  // automation: no reply draft, no auto-send, no coach nudge to reply. The
  // inbound is already recorded (email_events) and visible in the thread.
  if (gate.sendBlocked) {
    return { ok: true, leadId, skipped: "send_blocked", draftGenerated: false };
  }

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
  // There is NO Inngest consumer for a "draft/generate" event, every other
  // generation path calls a function synchronously inside a step (see
  // generateTouchpointDraft). Do the same here so a reply actually produces a
  // draft instead of firing a dead event. The AI engine applies the 'replied'
  // state framing (D-14). step.run is memoized/idempotent on retry.
  const generated = await step.run("generate-reply-draft", () =>
    generateReplyDraft({ coachId, leadId, messageId, threadId }),
  );

  // D-16 step 5: Route the draft per the coach's autonomous mode. A reply draft
  // is standalone (no scheduled-send timer of its own), so the routing that the
  // sequence path gets from sequence-scheduled-send has to happen here instead:
  //   mode_a  → auto-approved at generation; actually SEND it now. (Previously
  //             this fired nothing, so an auto-approved reply silently never sent.)
  //   mode_b  → pending; arm the 24h auto-send timer so it doesn't sit forever.
  //   off     → pending; notify the coach a reply landed and a draft is waiting.
  // The lead_replied notification fans out on the coach's enabled channels
  // (notification-dispatcher reads the per-coach matrix). It's skipped for mode_a
  // because there is nothing to review.
  let sent = false;
  let notified = false;
  if (generated.ok && generated.status === "approved") {
    await step.sendEvent("send-reply-mode-a", {
      name: "draft/send_via_gmail",
      data: { draftId: generated.draftId, coachId, source: "mode_a" },
    });
    sent = true;
  } else if (generated.ok) {
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
    notified = true;

    if (generated.autonomousMode === "mode_b") {
      const scheduledSendAt = await step.run("compute-mode-b-send-at", () =>
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      );
      await step.sendEvent("arm-reply-mode-b", {
        name: "draft/created_mode_b",
        data: { draftId: generated.draftId, coachId, scheduledSendAt },
      });
    }
  }

  return {
    ok: true,
    leadId,
    sequencePaused: true,
    draftGenerated: generated.ok,
    draftId: generated.ok ? generated.draftId : null,
    sent,
    notified,
  };
}

export const replyHandler = inngest.createFunction(
  {
    id: "reply-handler",
    // Coalesce a burst of replies (lead fires several emails before we answer)
    // into a single run per lead. The run then pulls the whole Gmail thread, so
    // the one draft it produces answers every outstanding message, instead of
    // generating (and cancelling) a fresh draft per inbound email.
    debounce: { key: "event.data.leadId", period: "2m" },
    triggers: [{ event: LEAD_REPLIED }],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest event payload is structurally typed at runtime; no static schema
  replyHandlerFn as any,
);
