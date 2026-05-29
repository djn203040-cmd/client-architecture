import "server-only";
import { inngest } from "@/inngest/client";
import {
  loadSendContext,
  deliverDraft,
  recordDelivery,
  type Delivery,
  type SendContext,
} from "@/lib/gmail/send";

type SendEvent = {
  name: string;
  data: { draftId: string; coachId: string; source?: string };
};

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
};

/**
 * Consumes `draft/send_via_gmail` — the single send pipeline every approval
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

  const delivery: Delivery = await step.run("deliver", () => deliverDraft(ctx));

  await step.run("record", () => recordDelivery(ctx, delivery, source));

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
