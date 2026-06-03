import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { getCallOutcomeBufferMinutes } from "@/lib/call-outcomes/config";

type PollerEvent = { name: string; data: Record<string, never> };

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sendEvent(
    id: string,
    event: { name: string; data: Record<string, unknown> },
  ): Promise<{ ids: string[] }>;
};

/**
 * Extracted handler — exported for integration tests.
 *
 * D-14 resilience: a lost call-outcome-monitor sleepUntil run would strand a
 * call forever (T-07-10). Every 15 min this poller finds scheduled rows whose
 * call has ended and that were never prompted, applies the per-coach buffer in
 * JS (the SQL can't join coaches.sequence_config cheaply), and flips them to
 * awaiting_outcome + notifies. The CAS guard (status='scheduled' AND
 * prompted_at IS NULL) makes it idempotent and safe against monitor double-flip
 * (T-07-08). No PII is logged — IDs only (CALL-016).
 */
export async function callOutcomePollerHandler({ step }: { event: PollerEvent; step: StepTools }) {
  // Candidate rows: call ended, still scheduled, never prompted. The partial
  // index idx_call_outcomes_poller backs this predicate.
  const candidates = await step.run("select-stranded", async () => {
    const { data } = await adminClient
      .from("call_outcomes")
      .select("id, coach_id, lead_id, ends_at")
      .eq("status", "scheduled")
      .is("prompted_at", null)
      .lt("ends_at", new Date().toISOString());
    return data ?? [];
  });

  let recovered = 0;

  for (const row of candidates) {
    if (!row.ends_at) continue;

    const buffer = await step.run(`buffer-${row.id}`, () =>
      getCallOutcomeBufferMinutes(row.coach_id),
    );

    // Never prompt before ends_at + buffer — the poller respects the same
    // timing the monitor would have used.
    const dueAt = new Date(row.ends_at).getTime() + buffer * 60_000;
    if (Date.now() < dueAt) continue;

    const flipped = await step.run(`flip-${row.id}`, async () => {
      const { data } = await adminClient
        .from("call_outcomes")
        .update({ status: "awaiting_outcome", prompted_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "scheduled")
        .is("prompted_at", null)
        .select("id")
        .maybeSingle();
      return !!data;
    });

    if (!flipped) continue;

    await step.sendEvent(`notify-${row.id}`, {
      name: "notification/call_outcome_pending",
      data: {
        coachId: row.coach_id,
        eventType: "call_outcome_pending",
        payload: { callOutcomeId: row.id, leadId: row.lead_id },
      },
    });
    recovered += 1;
  }

  return { candidates: candidates.length, recovered };
}

export const callOutcomePoller = inngest.createFunction(
  {
    id: "call-outcome-poller",
    name: "Call outcome poller — recover stranded prompts (D-14)",
    triggers: [{ event: "cron/call_outcome_poll" }],
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest handler signature widened for event payload
  callOutcomePollerHandler as any,
);
