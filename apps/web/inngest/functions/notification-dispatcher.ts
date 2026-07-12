import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { computeEnabledChannels } from "@/lib/notifications/dispatcher";
import { sendDashboard } from "@/lib/notifications/channels/dashboard";
import { sendEmail } from "@/lib/notifications/channels/email";
import { sendSlack, postCallOutcomeSlack } from "@/lib/notifications/channels/slack";
import { sendWhatsApp } from "@/lib/notifications/channels/whatsapp";
import { sendSMS } from "@/lib/notifications/channels/sms";
import { buildCallOutcomeBlocks } from "@/lib/slack/blocks";
import type { TNotificationEvent } from "@client/shared";

/**
 * D-16: resolve the lead name + call time a call_outcome_pending prompt needs.
 * The producer (monitor/poller) only carries IDs (CALL-016: no PII on the wire),
 * so we hydrate from the call_outcomes + leads rows here.
 */
async function loadCallOutcomePromptContext(callOutcomeId: string): Promise<{
  leadName: string;
  callTime: string;
}> {
  const { data } = await adminClient
    .from("call_outcomes")
    .select("scheduled_at, leads(name)")
    .eq("id", callOutcomeId)
    .maybeSingle();
  const lead = (data?.leads ?? null) as { name: string | null } | null;
  return {
    leadName: lead?.name ?? "your lead",
    callTime: data?.scheduled_at ?? "the scheduled time",
  };
}

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
};

type DispatcherEvent = {
  name: string;
  data: TNotificationEvent;
};

export async function notificationDispatcherHandler({
  event,
  step,
}: {
  event: DispatcherEvent;
  step: StepTools;
}) {
  const data = event.data;
  const { coachId, eventType } = data;

  const enabled = await step.run("compute-enabled-channels", () =>
    computeEnabledChannels(coachId, eventType),
  );

  // D-16: the Call Outcomes prompt posts interactive Block Kit buttons, so its
  // Slack send is bespoke (buildCallOutcomeBlocks) rather than the generic
  // sendSlack draft path. Dashboard + email still fan out generically.
  if (eventType === "call_outcome_pending") {
    const callOutcomeId = data.payload.callOutcomeId;
    const ctx = callOutcomeId
      ? await step.run("load-call-outcome-context", () =>
          loadCallOutcomePromptContext(callOutcomeId),
        )
      : { leadName: "your lead", callTime: "the scheduled time" };

    const slackSend =
      enabled.slack && callOutcomeId
        ? step.run("send-call-outcome-slack", () =>
            postCallOutcomeSlack({
              coachId,
              callOutcomeId,
              blocks: buildCallOutcomeBlocks({
                leadName: ctx.leadName,
                callOutcomeId,
                callTime: ctx.callTime,
              }),
              fallbackText: `How did the call with ${ctx.leadName} go?`,
            }),
          )
        : null;

    const callOutcomeSteps = [
      enabled.dashboard && step.run("send-dashboard", () => sendDashboard(data)),
      enabled.email && step.run("send-email", () => sendEmail(data)),
      slackSend,
    ].filter(Boolean) as Promise<unknown>[];

    const coResults = await Promise.allSettled(callOutcomeSteps);
    return {
      dispatched: coResults.length,
      results: coResults.map((r) =>
        r.status === "fulfilled"
          ? { status: "fulfilled", value: r.value }
          : { status: "rejected" },
      ),
    };
  }

  // Build all channel step promises without awaiting, distinct step ids avoid Pitfall 8
  const channelSteps = [
    enabled.dashboard && step.run("send-dashboard", () => sendDashboard(data)),
    enabled.email     && step.run("send-email",     () => sendEmail(data)),
    enabled.slack     && step.run("send-slack",     () => sendSlack(data)),
    enabled.whatsapp  && step.run("send-whatsapp",  () => sendWhatsApp(data)),
    enabled.sms       && step.run("send-sms",       () => sendSMS(data)),
  ].filter(Boolean) as Promise<unknown>[];

  const results = await Promise.allSettled(channelSteps);

  return {
    dispatched: results.length,
    results: results.map((r) =>
      r.status === "fulfilled"
        ? { status: "fulfilled", value: r.value }
        : { status: "rejected" },
    ),
  };
}

export const notificationDispatcher = inngest.createFunction(
  {
    id: "notification-dispatcher",
    name: "Notification dispatcher, fan out to enabled channels",
    triggers: [
      { event: "notification/draft_ready" },
      { event: "notification/draft_followup" },
      { event: "notification/lead_replied" },
      { event: "notification/integration_broken" },
      { event: "notification/hard_bounce" },
      // D-16: Call Outcomes prompt, fans out like draft_ready. The Slack channel
      // posts buildCallOutcomeBlocks (07-01); 07-03's sync finds the message ts
      // via the call_outcome_pending notification_log row (payload.callOutcomeId).
      { event: "notification/call_outcome_pending" },
    ],
    retries: 2,
    concurrency: { key: "event.data.coachId", limit: 5 },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest event payload is structurally typed at runtime; no static schema
  notificationDispatcherHandler as any,
);
