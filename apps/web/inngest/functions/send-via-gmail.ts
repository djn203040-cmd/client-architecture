import "server-only";
import { inngest } from "@/inngest/client";
import {
  loadSendContext,
  deliverDraft,
  recordDelivery,
  type Delivery,
  type SendContext,
} from "@/lib/gmail/send";
import { syncSlackDraftMessage } from "@/lib/slack/sync-draft-message";

type SendEvent = {
  name: string;
  data: { draftId: string; coachId: string; source?: string };
};

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
};

/**
 * Consumes `draft/send_via_gmail`, the single send pipeline every approval
 * path funnels into (dashboard, Slack, tokenized review link, autonomous
 * Mode A/B). Sends the approved draft as the coach via the Gmail API.
 *
 * Step boundaries matter: `deliver` is its own memoized step so an Inngest
 * retry of a later step never re-sends the email. Idempotency against
 * duplicate events is handled in `loadSendContext` (skips when status='sent').
 *
 * Exported separately from the createFunction wrapper so integration tests can
 * drive the handler without an Inngest dev server.
 */
export async function sendViaGmailHandler({
  event,
  step,
}: {
  event: SendEvent;
  step: StepTools;
}) {
  const { draftId, coachId, source = "unknown" } = event.data;

  const loaded = await step.run("load-context", () =>
    loadSendContext(draftId, coachId),
  );
  if (loaded.skip || !loaded.ctx) {
    return { sent: false, skipped: loaded.skip ?? "no_context", draftId };
  }
  const ctx: SendContext = loaded.ctx;

  // Decouple approval from send for sequence touchpoints: an approved draft must
  // still wait for its fixed cadence time. Only the scheduled-send timer (which
  // fires AT that time) may send early-approved sequence drafts. Manual/reply
  // drafts have no scheduled_send_at and pass straight through.
  if (
    source !== "sequence_scheduled" &&
    ctx.scheduledSendAt &&
    new Date(ctx.scheduledSendAt).getTime() > Date.now()
  ) {
    return { sent: false, skipped: "awaiting_scheduled_time", draftId };
  }

  const delivery: Delivery = await step.run("deliver", () => deliverDraft(ctx));

  await step.run("record", () => recordDelivery(ctx, delivery, source));

  // Retire any Slack buttons for this draft now that it's actually sent. Covers
  // the autonomous Mode-B timer path that never passes through an approval route,
  // and upgrades a "sending shortly" message to "sent". Best-effort.
  await step.run("sync-slack-sent", async () => {
    await syncSlackDraftMessage({ draftId, coachId, state: "sent" });
    return { ok: true };
  });

  return {
    sent: true,
    draftId,
    gmailMessageId: delivery.gmailMessageId,
    gmailThreadId: delivery.gmailThreadId,
  };
}

export const sendViaGmail = inngest.createFunction(
  {
    id: "send-via-gmail",
    name: "Send approved draft as the coach via Gmail",
    triggers: [{ event: "draft/send_via_gmail" }],
    // Failed sends retry; invalid_grant self-heals via the Gmail client wrapper.
    retries: 3,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest handler signature widened for event payload
  sendViaGmailHandler as any,
);
