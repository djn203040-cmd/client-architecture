import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import {
  LEAD_CALL_COMPLETED,
  LEAD_REPLIED,
  LEAD_UNSUBSCRIBED,
  DRAFT_SCHEDULED_SEND,
} from "@client/shared/constants/events";
import { runPreSendSafetyCheck } from "./sequence-step";
import { generateTouchpointDraft } from "@/lib/sequences/generate-touchpoint";

// Generate each touchpoint's draft this far ahead of its fixed send time.
const GENERATE_LEAD_MS = 24 * 60 * 60 * 1000;

// Grace period after the final send before auto-closing the lead, so the last
// touchpoint's scheduled-send timer settles before we terminal-ize the lead.
const SEND_SETTLE_MS = 15 * 60 * 1000;

export const sequenceCallCompleted = inngest.createFunction(
  {
    id: "sequence-call-completed",
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
        event: LEAD_UNSUBSCRIBED,
        if: "async.data.leadId == event.data.leadId",
      },
    ],
    triggers: [{ event: LEAD_CALL_COMPLETED }],
  },
  async ({ event, step, runId }) => {
    const { coachId, leadId, eventEndAt, externalEventId, leadName } = event.data as {
      coachId: string;
      leadId: string;
      eventEndAt: string;
      externalEventId: string;
      leadName: string;
    };

    // Wait 30 minutes after the call ends before surfacing the pending action
    const callEndTime = new Date(eventEndAt);
    callEndTime.setMinutes(callEndTime.getMinutes() + 30);
    await step.sleepUntil("wait-for-call-end", callEndTime);

    // Surface a pending action card for the coach to decide next steps
    await step.run("create-pending-action", async () => {
      await adminClient.from("pending_actions").insert({
        coach_id: coachId,
        lead_id: leadId,
        type: "call_follow_up",
        payload: { leadName, calendarEventId: externalEventId },
      });
    });

    // Wait for the coach to decide: start follow-up, mark closed, or reschedule
    // If no decision within 30 days, abandon quietly
    const decision = await step.waitForEvent("wait-for-coach-decision", {
      event: LEAD_CALL_COMPLETED,
      if: `async.data.calendarEventId == event.data.externalEventId`,
      timeout: "30d",
    });

    if (!decision || decision.data?.action !== "start_follow_up") {
      return { abandoned: true };
    }

    // Coach chose to start follow-up — create sequence and run 3-touchpoint loop
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
          track: "call_completed",
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
        payload: { to: "in_sequence", track: "call_completed" },
        triggered_by: "system",
      });
    });

    const delays: number[] = await step.run("load-cadence", async () => {
      const { data } = await adminClient
        .from("coaches")
        .select("sequence_config")
        .eq("id", coachId)
        .single();
      const config = data?.sequence_config as { call_completed_delays?: number[] } | null;
      return config?.call_completed_delays ?? [1, 4, 10];
    });

    const sequenceStart = new Date();
    const totalTouchpoints = delays.length;

    for (let i = 0; i < delays.length; i++) {
      const dayOffset = delays[i]!;
      const sendAt = new Date(sequenceStart);
      sendAt.setDate(sendAt.getDate() + dayOffset);
      const scheduledSendAt = sendAt.toISOString();
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
          track: "call_completed",
          scheduledSendAt,
        })
      );

      if (generated.ok) {
        await step.sendEvent(`schedule-send-${i}`, {
          name: DRAFT_SCHEDULED_SEND,
          data: { draftId: generated.draftId, coachId, leadId, sequenceId, scheduledSendAt },
        });

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

    // Wait until the final touchpoint's scheduled send has settled before
    // closing the lead (see sequence-no-show for the full rationale).
    if (delays.length > 0) {
      const lastSendAt = new Date(sequenceStart);
      lastSendAt.setDate(lastSendAt.getDate() + delays[delays.length - 1]!);
      await step.sleepUntil(
        "settle-final-send",
        new Date(lastSendAt.getTime() + SEND_SETTLE_MS)
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
