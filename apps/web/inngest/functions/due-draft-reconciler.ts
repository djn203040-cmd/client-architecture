import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { CRON_RECONCILE_DUE_SENDS } from "@client/shared/constants/events";
// Threshold is shared with the /admin stuck-sends surface so the two agree on
// what "stuck" means. See packages/shared/src/constants/sends.ts.
import { stuckSendingCutoff } from "@client/shared/constants/sends";

type ReconcilerEvent = { name: string; data: Record<string, never> };

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sendEvent(
    id: string,
    event: { name: string; data: Record<string, unknown> },
  ): Promise<{ ids: string[] }>;
};

/**
 * Due-draft reconciler (#83), the safety net under `sequence-scheduled-send`.
 *
 * Scheduled sequence sends are driven ONLY by an Inngest `sleepUntil` timer. If
 * that timer is ever lost, a mis-fired `cancelOn`, a failed sync / registry
 * freeze (cf. #75), or a redeploy edge case, the coach-approved draft sits in
 * `approved`/`edited` forever and the lead silently stops progressing. This ran
 * once already as a whole-app freeze.
 *
 * Every 10 min this finds drafts whose fixed send time has passed but which are
 * still in an approved state (a delivered draft would be `sent`), and re-emits
 * the single send event. It is idempotent: `send-via-gmail` atomically claims the
 * draft into `sending` (#139), so a live timer firing at the same moment as this
 * tick, or two reconciler runs, still send at most once. Emitting with
 * `source: 'sequence_scheduled'` bypasses the cadence gate (the time has already
 * passed) and keeps the correct send semantics.
 *
 * Finding a stranded draft means a timer was genuinely lost, that's worth
 * visibility, so we log a count (IDs only, no PII per CALL-016).
 *
 * Exported handler so integration tests can drive it without an Inngest dev server.
 */
export async function dueDraftReconcilerHandler({
  step,
}: {
  event: ReconcilerEvent;
  step: StepTools;
}) {
  // Coach-approved (`approved`/`edited`) sequence drafts whose fixed send time
  // has passed. `scheduled_send_at <= now()` also excludes manual/reply drafts
  // (those have no scheduled_send_at) and anything not yet due.
  const stranded = await step.run("select-stranded", async () => {
    const { data } = await adminClient
      .from("drafts")
      .select("id, coach_id")
      .in("status", ["approved", "edited"])
      .not("scheduled_send_at", "is", null)
      .lte("scheduled_send_at", new Date().toISOString());
    return data ?? [];
  });

  if (stranded.length > 0) {
    // A lost timer is an operational signal, not routine, surface it. IDs only.
    console.warn(
      `[due-draft-reconciler] recovering ${stranded.length} stranded approved draft(s):`,
      stranded.map((d) => d.id),
    );
  }

  for (const draft of stranded) {
    await step.sendEvent(`send-${draft.id}`, {
      name: "draft/send_via_gmail",
      data: { draftId: draft.id, coachId: draft.coach_id, source: "sequence_scheduled" },
    });
  }

  // Second sweep (#139): drafts stuck in the transient `sending` claim. Reaching
  // here means send-via-gmail claimed the draft and then died past its retries,
  // so nothing will move it on its own.
  const recovered = await step.run("recover-stuck-sending", () =>
    recoverStuckSendingDrafts(),
  );

  return { stranded: stranded.length, ...recovered };
}

/**
 * Resolve drafts left in `sending` by a crashed send.
 *
 * The DB cannot tell "Gmail never got the message" apart from "Gmail got it but
 * recordDelivery failed" — both leave the draft in `sending`. What it CAN tell is
 * whether the send was witnessed: recordDelivery writes the `email_events` row
 * BEFORE flipping the draft, so an existing 'sent' event means the email
 * definitely went out.
 *
 *   witnessed  → finish the interrupted bookkeeping. Never re-send.
 *   unwitnessed → log loudly and LEAVE IT in `sending`.
 *
 * The unwitnessed case is deliberately not auto-retried: re-emitting a send that
 * may already have reached the lead would reintroduce exactly the duplicate this
 * whole mechanism exists to prevent. It needs a human judgement instead, so it
 * surfaces on /admin under System health, where the operator can query the
 * coach's own Gmail for the answer and then mark it sent or re-queue it
 * (lib/admin/stuck-sends.ts). A duplicate email to a lead is not retractable.
 */
async function recoverStuckSendingDrafts() {
  const cutoff = stuckSendingCutoff();

  const { data: stuck } = await adminClient
    .from("drafts")
    .select("id, coach_id, lead_id, subject")
    .eq("status", "sending")
    .lte("updated_at", cutoff);

  if (!stuck?.length) return { stuckSending: 0, completed: 0 };

  const needsOperator: string[] = [];
  let completed = 0;

  for (const draft of stuck) {
    const { data: witness } = await adminClient
      .from("email_events")
      .select("id, created_at")
      .eq("draft_id", draft.id)
      .eq("event_type", "sent")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!witness) {
      needsOperator.push(draft.id);
      continue;
    }

    await adminClient
      .from("drafts")
      .update({ status: "sent", sent_at: witness.created_at })
      .eq("id", draft.id)
      .eq("status", "sending");

    // recordDelivery's lead_events insert comes after the draft flip, so it is
    // the step most likely to have been lost. Only add it if it is missing.
    const { data: loggedEvent } = await adminClient
      .from("lead_events")
      .select("id")
      .eq("lead_id", draft.lead_id)
      .eq("event_type", "email_sent")
      .contains("payload", { draft_id: draft.id })
      .limit(1)
      .maybeSingle();

    if (!loggedEvent) {
      await adminClient.from("lead_events").insert({
        coach_id: draft.coach_id,
        lead_id: draft.lead_id,
        event_type: "email_sent",
        payload: { draft_id: draft.id, subject: draft.subject, source: "reconciler_recovery" },
        triggered_by: "system",
      });
    }

    completed++;
  }

  if (completed > 0) {
    console.warn(
      `[due-draft-reconciler] completed ${completed} interrupted send(s) from email_events`,
    );
  }
  if (needsOperator.length > 0) {
    // Not auto-resent on purpose (see above). IDs only, no PII per CALL-016.
    console.error(
      `[due-draft-reconciler] ${needsOperator.length} draft(s) stuck in 'sending' with no send ` +
        `on record, awaiting an operator decision on /admin#system-health:`,
      needsOperator,
    );
  }

  return { stuckSending: stuck.length, completed };
}

export const dueDraftReconciler = inngest.createFunction(
  {
    id: "due-draft-reconciler",
    name: "Recover approved sequence drafts stranded by a lost timer (#83)",
    // Inngest-native cron is the live cadence: Vercel Hobby rejects sub-daily
    // crons. The event trigger is a manual fast-path via /api/cron/reconcile-due-sends.
    triggers: [{ cron: "*/10 * * * *" }, { event: CRON_RECONCILE_DUE_SENDS }],
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest handler signature widened for event payload
  dueDraftReconcilerHandler as any,
);
