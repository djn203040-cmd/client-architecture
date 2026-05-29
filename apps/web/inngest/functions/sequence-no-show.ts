import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import {
  LEAD_NO_SHOW,
  LEAD_REPLIED,
  LEAD_CALL_BOOKED,
  LEAD_UNSUBSCRIBED,
} from "@client/shared/constants/events";
import { runPreSendSafetyCheck, buildDraftGeneratePayload } from "./sequence-step";

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

    for (const dayOffset of delays) {
      const sendAt = new Date(sequenceStart);
      sendAt.setDate(sendAt.getDate() + dayOffset);

      await step.sleepUntil(`sleep-day-${dayOffset}`, sendAt);

      const blocked = await step.run(`safety-check-${dayOffset}`, () =>
        runPreSendSafetyCheck(leadId, sequenceId)
      );

      if (blocked) {
        await step.run(`cancel-on-block-${dayOffset}`, async () => {
          await adminClient
            .from("sequences")
            .update({ status: "cancelled" })
            .eq("id", sequenceId);
        });
        return { cancelled: true, reason: blocked };
      }

      await step.sendEvent(
        `send-touchpoint-${dayOffset}`,
        buildDraftGeneratePayload({
          coachId,
          leadId,
          sequenceId,
          touchpointIndex: delays.indexOf(dayOffset) + 1,
          track: "no_show",
        })
      );
    }

    await step.run("auto-close-lead", async () => {
      await adminClient.from("leads").update({ status: "closed" }).eq("id", leadId);
      await adminClient.from("sequences").update({ status: "completed" }).eq("id", sequenceId);
      await adminClient.from("lead_events").insert({
        lead_id: leadId,
        coach_id: coachId,
        event_type: "state_changed",
        payload: { to: "closed", reason: "sequence_exhausted" },
        triggered_by: "system",
      });
    });

    return { completed: true };
  }
);
