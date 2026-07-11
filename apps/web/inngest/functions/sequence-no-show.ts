import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import {
  LEAD_NO_SHOW,
  LEAD_REPLIED,
  LEAD_CALL_BOOKED,
  LEAD_UNSUBSCRIBED,
  DRAFT_SCHEDULED_SEND,
} from "@client/shared/constants/events";
import { runPreSendSafetyCheck } from "./sequence-step";
import { generateTouchpointDraft } from "@/lib/sequences/generate-touchpoint";

// A touchpoint's draft is generated this far ahead of its fixed send time, giving
// the coach a review window. The send still fires at the cadence time regardless
// of when (or whether) they approve.
const GENERATE_LEAD_MS = 24 * 60 * 60 * 1000;

// Grace period after the final send time before auto-closing the lead, so the
// last touchpoint's scheduled-send timer settles before we terminal-ize the lead.
const SEND_SETTLE_MS = 15 * 60 * 1000;

export const sequenceNoShow = inngest.createFunction(
  {
    id: "sequence-no-show",
    concurrency: {
      limit: 3,
      key: "event.data.coachId",
    },
    cancelOn: [
      {
        event: LEAD_REPLIED,
        if: "async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId",
      },
      {
        event: LEAD_CALL_BOOKED,
        if: "async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId",
      },
      {
        event: LEAD_UNSUBSCRIBED,
        if: "async.data.leadId == event.data.leadId",
      },
    ],
    triggers: [{ event: LEAD_NO_SHOW }],
  },
  async ({ event, step, runId }) => {
    const { coachId, leadId } = event.data as { coachId: string; leadId: string };

    const sequenceId = await step.run("create-sequence", async () => {
      await adminClient
        .from("sequences")
        .update({ status: "cancelled" })
        .eq("coach_id", coachId)
        .eq("lead_id", leadId)
        .eq("status", "active");

      const { data } = await adminClient
        .from("sequences")
        .insert({
          coach_id: coachId,
          lead_id: leadId,
          track: "no_show",
          module: 1,
          status: "active",
          inngest_run_id: runId,
        })
        .select("id")
        .single();
      return data!.id as string;
    });

    await step.run("set-lead-in-sequence", async () => {
      await adminClient.from("leads").update({ status: "in_sequence" }).eq("id", leadId);
      await adminClient.from("lead_events").insert({
        lead_id: leadId,
        coach_id: coachId,
        event_type: "state_changed",
        payload: { to: "in_sequence", track: "no_show" },
        triggered_by: "system",
      });
    });

    const delays: number[] = await step.run("load-cadence", async () => {
      const { data } = await adminClient
        .from("coaches")
        .select("sequence_config")
        .eq("id", coachId)
        .single();
      const config = data?.sequence_config as { no_show_delays?: number[] } | null;
      return config?.no_show_delays ?? [1, 3, 7, 14, 21];
    });

    const sequenceStart = new Date();
    const totalTouchpoints = delays.length;

    for (let i = 0; i < delays.length; i++) {
      const dayOffset = delays[i]!;
      const sendAt = new Date(sequenceStart);
      sendAt.setDate(sendAt.getDate() + dayOffset);
      const scheduledSendAt = sendAt.toISOString();
      // Wake up ~24h before the send time to generate the draft for review.
      const generateAt = new Date(sendAt.getTime() - GENERATE_LEAD_MS);

      await step.sleepUntil(`generate-wait-${i}`, generateAt);

      const blocked = await step.run(`safety-check-${i}`, () =>
        runPreSendSafetyCheck(leadId, sequenceId)
      );

      if (blocked) {
        await step.run(`cancel-on-block-${i}`, async () => {
          await adminClient
            .from("sequences")
            .update({ status: "cancelled" })
            .eq("id", sequenceId);
        });
        return { cancelled: true, reason: blocked };
      }

      const generated = await step.run(`generate-touchpoint-${i}`, () =>
        generateTouchpointDraft({
          coachId,
          leadId,
          sequenceId,
          touchpointIndex: i + 1,
          totalTouchpoints,
          track: "no_show",
          scheduledSendAt,
        })
      );

      if (generated.ok) {
        // Hand the draft to its own scheduled-send timer, which owns the actual
        // send at the cadence time (decoupled from approval timing).
        await step.sendEvent(`schedule-send-${i}`, {
          name: DRAFT_SCHEDULED_SEND,
          data: { draftId: generated.draftId, coachId, leadId, sequenceId, scheduledSendAt },
        });

        // Notify the coach there's a draft to review, skipped in Send-without-
        // review mode (mode_a), where the draft is already approved.
        if (generated.status === "pending") {
          await step.sendEvent(`notify-${i}`, {
            name: "notification/draft_ready",
            data: {
              coachId,
              eventType: "draft_ready",
              payload: {
                draftId: generated.draftId,
                leadName: generated.leadName,
                confidenceLevel: generated.confidenceLevel,
              },
            },
          });
        }
      }
    }

    // The final touchpoint sends ~24h after it was generated, via its own
    // scheduled-send timer. Wait until that send has settled before closing the
    // lead, otherwise we'd mark it terminal while the last message is pending,
    // and the safety check would block that send.
    if (delays.length > 0) {
      const lastSendAt = new Date(sequenceStart);
      lastSendAt.setDate(lastSendAt.getDate() + delays[delays.length - 1]!);
      await step.sleepUntil(
        "settle-final-send",
        new Date(lastSendAt.getTime() + SEND_SETTLE_MS)
      );
    }

    await step.run("auto-close-lead", async () => {
      await adminClient.from("leads").update({ status: "lost" }).eq("id", leadId);
      await adminClient.from("sequences").update({ status: "completed" }).eq("id", sequenceId);
      await adminClient.from("lead_events").insert({
        lead_id: leadId,
        coach_id: coachId,
        event_type: "state_changed",
        payload: { to: "lost", reason: "sequence_exhausted" },
        triggered_by: "system",
      });
    });

    return { completed: true };
  }
);
