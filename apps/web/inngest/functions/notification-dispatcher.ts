import "server-only";
import { inngest } from "@/inngest/client";
import { computeEnabledChannels } from "@/lib/notifications/dispatcher";
import { sendDashboard } from "@/lib/notifications/channels/dashboard";
import { sendEmail } from "@/lib/notifications/channels/email";
import { sendSlack } from "@/lib/notifications/channels/slack";
import { sendWhatsApp } from "@/lib/notifications/channels/whatsapp";
import { sendSMS } from "@/lib/notifications/channels/sms";
import type { TNotificationEvent } from "@client/shared";

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

  // Build all channel step promises without awaiting — distinct step ids avoid Pitfall 8
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
    name: "Notification dispatcher — fan out to enabled channels",
    triggers: [
      { event: "notification/draft_ready" },
      { event: "notification/draft_followup" },
      { event: "notification/lead_replied" },
      { event: "notification/integration_broken" },
      { event: "notification/hard_bounce" },
    ],
    retries: 2,
    concurrency: { key: "event.data.coachId", limit: 5 },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest event payload is structurally typed at runtime; no static schema
  notificationDispatcherHandler as any,
);
