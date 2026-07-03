import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { CRON_RECONCILE_DUE_SENDS } from "@client/shared/constants/events";

type ReconcilerEvent = { name: string; data: Record<string, never> };

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sendEvent(
    id: string,
    event: { name: string; data: Record<string, unknown> },
  ): Promise<{ ids: string[] }>;
};

/**
 * Due-draft reconciler (#83) — the safety net under `sequence-scheduled-send`.
 *
 * Scheduled sequence sends are driven ONLY by an Inngest `sleepUntil` timer. If
 * that timer is ever lost — a mis-fired `cancelOn`, a failed sync / registry
 * freeze (cf. #75), or a redeploy edge case — the coach-approved draft sits in
 * `approved`/`edited` forever and the lead silently stops progressing. This ran
 * once already as a whole-app freeze.
 *
 * Every 10 min this finds drafts whose fixed send time has passed but which are
 * still in an approved state (a delivered draft would be `sent`), and re-emits
 * the single send event. It is idempotent: `send-via-gmail` → `loadSendContext`
 * skips anything already `status = 'sent'`, so a live timer that fires first, or
 * two reconciler runs, still send at most once. Emitting with
 * `source: 'sequence_scheduled'` bypasses the cadence gate (the time has already
 * passed) and keeps the correct send semantics.
 *
 * Finding a stranded draft means a timer was genuinely lost — that's worth
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
    // A lost timer is an operational signal, not routine — surface it. IDs only.
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

  return { stranded: stranded.length };
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
