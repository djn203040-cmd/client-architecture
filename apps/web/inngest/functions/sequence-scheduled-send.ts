import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { approveDraftAtomic } from "@/lib/drafts/approve-atomic";
import { runPreSendSafetyCheck } from "@/inngest/functions/sequence-step";
import {
  DRAFT_SCHEDULED_SEND,
  LEAD_REPLIED,
  LEAD_CALL_BOOKED,
  LEAD_UNSUBSCRIBED,
} from "@client/shared/constants/events";

export type SendDecision =
  | { action: "send" }
  | { action: "auto_approve_send" }
  | { action: "skip"; reason: string };

/**
 * Pure decision: at the scheduled send time, what do we do with this draft?
 *   approved / edited  → send (coach signed off; the cadence time has now arrived)
 *   pending + mode_a/b  → auto-approve and send (autonomous)
 *   pending + manual    → skip; leave it in the queue for review (never auto-sends)
 *   anything else       → skip (held / cancelled / sent / still generating)
 */
export function decideScheduledSend(
  status: string | null,
  mode: string | null | undefined,
): SendDecision {
  if (!status) return { action: "skip", reason: "draft_missing" };
  if (status === "approved" || status === "edited") return { action: "send" };
  if (status === "pending") {
    if (mode === "mode_a" || mode === "mode_b") return { action: "auto_approve_send" };
    return { action: "skip", reason: "awaiting_manual_approval" };
  }
  return { action: "skip", reason: `status:${status}` };
}

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sleepUntil(id: string, when: Date | string | number): Promise<void>;
  sendEvent(
    id: string,
    event: { name: string; data: Record<string, unknown> },
  ): Promise<{ ids: string[] }>;
};

type ScheduledSendEvent = {
  name: string;
  data: {
    draftId: string;
    coachId: string;
    leadId: string;
    sequenceId: string;
    scheduledSendAt: string;
  };
};

/**
 * Extracted handler — exported so integration tests can drive it without the
 * Inngest dev server.
 */
export async function sequenceScheduledSendHandler({
  event,
  step,
}: {
  event: ScheduledSendEvent;
  step: StepTools;
}) {
  const { draftId, coachId, leadId, sequenceId, scheduledSendAt } = event.data;

  // Hold until the fixed cadence time — independent of when the coach approved.
  await step.sleepUntil("sleep-until-send", new Date(scheduledSendAt));

  const blocked = await step.run("safety-check", () =>
    runPreSendSafetyCheck(leadId, sequenceId),
  );
  if (blocked) return { skipped: blocked };

  const ctx = await step.run("load-status-and-mode", async () => {
    const { data: draft } = await adminClient
      .from("drafts")
      .select("status")
      .eq("id", draftId)
      .maybeSingle();
    const { data: coach } = await adminClient
      .from("coaches")
      .select("autonomous_mode")
      .eq("id", coachId)
      .maybeSingle();
    return {
      status: (draft?.status as string | null) ?? null,
      mode: (coach?.autonomous_mode as string | null) ?? "off",
    };
  });

  const decision = decideScheduledSend(ctx.status, ctx.mode);
  if (decision.action === "skip") return { sent: false, skipped: decision.reason };

  if (decision.action === "auto_approve_send") {
    const result = await step.run("auto-approve", () =>
      approveDraftAtomic(draftId, "mode_b"),
    );
    if (!result.ok) return { sent: false, skipped: `approve_failed:${result.reason}` };
  }

  await step.sendEvent("send-via-gmail", {
    name: "draft/send_via_gmail",
    data: { draftId, coachId, source: "sequence_scheduled" },
  });

  return { sent: true, draftId };
}

export const sequenceScheduledSend = inngest.createFunction(
  {
    id: "sequence-scheduled-send",
    name: "Send a sequence touchpoint at its fixed scheduled time",
    triggers: [{ event: DRAFT_SCHEDULED_SEND }],
    cancelOn: [
      // Coach pulled the draft from the queue.
      { event: "draft/cancelled", if: "async.data.draftId == event.data.draftId" },
      { event: "draft/held_manually", if: "async.data.draftId == event.data.draftId" },
      // Lead changed course — abandon any pending scheduled touchpoints.
      { event: LEAD_REPLIED, if: "async.data.leadId == event.data.leadId" },
      { event: LEAD_CALL_BOOKED, if: "async.data.leadId == event.data.leadId" },
      { event: LEAD_UNSUBSCRIBED, if: "async.data.leadId == event.data.leadId" },
    ],
    retries: 3,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest handler signature widened for event payload
  sequenceScheduledSendHandler as any,
);
