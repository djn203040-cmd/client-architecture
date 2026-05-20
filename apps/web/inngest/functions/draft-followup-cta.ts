import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { holdDraftAtomic } from "@/lib/drafts/approve-atomic";

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sleepUntil(id: string, when: Date | string | number): Promise<void>;
};

type FollowupEvent = {
  name: string;
  data: { draftId: string; coachId: string; createdAt: string };
};

export async function draftFollowupCtaHandler({
  event,
  step,
}: {
  event: FollowupEvent;
  step: StepTools;
}) {
  const { draftId, coachId, createdAt } = event.data;

  // First sleep — 24h after draft created
  const firstWakeAt = new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000);
  await step.sleepUntil("sleep-24h-followup", firstWakeAt);

  const firstCheck = await step.run("check-status-24h", async () => {
    const { data } = await adminClient
      .from("drafts")
      .select("status, lead_id")
      .eq("id", draftId)
      .maybeSingle();
    return data;
  });

  if (!firstCheck || firstCheck.status !== "pending") {
    return { cancelled: true, stage: "24h", reason: `not_pending:${firstCheck?.status ?? "missing"}` };
  }

  // Increment followup_count — read-then-write is safe; Inngest step handles retries
  await step.run("increment-followup-count", async () => {
    const { data: current } = await adminClient
      .from("drafts")
      .select("followup_count")
      .eq("id", draftId)
      .single();
    const next = ((current?.followup_count as number) ?? 0) + 1;
    await adminClient.from("drafts").update({ followup_count: next }).eq("id", draftId);
  });

  await step.run("fire-followup-notification", async () => {
    const { data: draft } = await adminClient
      .from("drafts")
      .select("body, subject, scheduled_send_at, lead_id")
      .eq("id", draftId)
      .single();
    const { data: lead } = await adminClient
      .from("leads")
      .select("name, email")
      .eq("id", draft?.lead_id ?? "")
      .maybeSingle();

    await inngest.send({
      name: "notification/draft_followup",
      data: {
        coachId,
        eventType: "draft_ready",
        payload: {
          draftId,
          leadName: lead?.name ?? "your lead",
          sendTime: draft?.scheduled_send_at ?? "soon",
          subject: draft?.subject ?? "",
        },
      },
    });
  });

  // Second sleep — another 24h (48h total from creation)
  const secondWakeAt = new Date(firstWakeAt.getTime() + 24 * 60 * 60 * 1000);
  await step.sleepUntil("sleep-48h-cascade", secondWakeAt);

  const secondCheck = await step.run("check-status-48h", async () => {
    const { data } = await adminClient
      .from("drafts")
      .select("status")
      .eq("id", draftId)
      .maybeSingle();
    return data;
  });

  if (!secondCheck || secondCheck.status !== "pending") {
    return { cancelled: true, stage: "48h", reason: `not_pending:${secondCheck?.status ?? "missing"}` };
  }

  // CAS transition to HOLD
  const result = await step.run("cas-hold", () => holdDraftAtomic(draftId, "hold_cascade"));
  return { cascaded_to_held: result.ok, reason: result.reason };
}

export const draftFollowupCta = inngest.createFunction(
  {
    id: "draft-followup-cta",
    name: "Draft follow-up CTA + HOLD cascade",
    triggers: [{ event: "draft/created_pending" }],
    cancelOn: [
      { event: "draft/approved_manually", if: "async.data.draftId == event.data.draftId" },
      { event: "draft/held_manually",     if: "async.data.draftId == event.data.draftId" },
      { event: "draft/cancelled",         if: "async.data.draftId == event.data.draftId" },
    ],
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draftFollowupCtaHandler as any,
);
