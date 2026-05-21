import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { approveDraftAtomic } from "@/lib/drafts/approve-atomic";
import { runPreSendSafetyCheck } from "@/inngest/functions/sequence-step";

type TimerEvent = {
  name: string;
  data: { draftId: string; coachId: string; scheduledSendAt: string };
};

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sleepUntil(id: string, when: Date | string | number): Promise<void>;
  sendEvent(
    id: string,
    event: { name: string; data: Record<string, unknown> },
  ): Promise<{ ids: string[] }>;
};

/**
 * Extracted handler — exported separately so integration tests can invoke it
 * without spinning up the Inngest dev server.
 */
export async function autonomousModeBTimerHandler({
  event,
  step,
}: {
  event: TimerEvent;
  step: StepTools;
}) {
  const { draftId, coachId, scheduledSendAt } = event.data;

  await step.sleepUntil("sleep-until-send", new Date(scheduledSendAt));

  // Belt-and-suspenders: re-read status after wake — cancelOn handles most cases
  // but doesn't prevent the step from running if it started before the cancel signal.
  const draft = await step.run("verify-still-pending", async () => {
    const { data } = await adminClient
      .from("drafts")
      .select("status, lead_id, sequence_id")
      .eq("id", draftId)
      .single();
    return data;
  });

  if (!draft || draft.status !== "pending") {
    return { cancelled: true, reason: `not_pending:${draft?.status ?? "missing"}` };
  }

  const blocked = await step.run("safety-check", () =>
    runPreSendSafetyCheck(draft.lead_id as string, draft.sequence_id as string),
  );
  if (blocked) return { cancelled: true, reason: blocked };

  const result = await step.run("cas-approve", () =>
    approveDraftAtomic(draftId, "mode_b"),
  );
  if (!result.ok) return { cancelled: true, reason: result.reason };

  await step.sendEvent("send-via-gmail", {
    name: "draft/send_via_gmail",
    data: { draftId, coachId, source: "mode_b" },
  });

  return { sent: true, draftId };
}

// Inngest v4 API: triggers move into the first arg config object (no third arg)
export const autonomousModeBTimer = inngest.createFunction(
  {
    id: "autonomous-mode-b-timer",
    name: "Autonomous Mode B — auto-send at scheduled time",
    triggers: [{ event: "draft/created_mode_b" }],
    cancelOn: [
      {
        event: "draft/approved_manually",
        if: "async.data.draftId == event.data.draftId",
      },
      {
        event: "draft/held_manually",
        if: "async.data.draftId == event.data.draftId",
      },
      {
        event: "draft/cancelled",
        if: "async.data.draftId == event.data.draftId",
      },
    ],
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest handler signature widened for event payload
  autonomousModeBTimerHandler as any,
);
