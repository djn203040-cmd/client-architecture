import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { LEAD_CALL_BOOKED } from "@client/shared/constants/events";
import { getCallOutcomeBufferMinutes } from "@/lib/call-outcomes/config";

type MonitorEvent = {
  name: string;
  data: {
    coachId: string;
    leadId: string;
    callOutcomeId: string;
    eventEndAt: string;
  };
};

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sleepUntil(id: string, when: Date | string | number): Promise<void>;
  sendEvent(
    id: string,
    event: { name: string; data: Record<string, unknown> },
  ): Promise<{ ids: string[] }>;
};

/**
 * Extracted handler, exported so integration tests can invoke it without the
 * Inngest dev server.
 *
 * D-13: arm on LEAD_CALL_BOOKED, sleep until ends_at + per-coach buffer, then
 * flip the call_outcomes row to awaiting_outcome and emit the prompt. The flip
 * is CAS-guarded (WHERE status='scheduled') so the D-14 poller can never
 * double-flip the same row (T-07-08). A reschedule/cancel cancels this run via
 * cancelOn; the reschedule branch in process-event.ts re-emits LEAD_CALL_BOOKED
 * with the new window, which re-arms a fresh monitor, no extra handling here.
 */
export async function callOutcomeMonitorHandler({
  event,
  step,
}: {
  event: MonitorEvent;
  step: StepTools;
}) {
  const { coachId, leadId, callOutcomeId, eventEndAt } = event.data;

  // A booking without an outcome row or end time can't be monitored, bail
  // rather than sleep forever or NaN the target.
  if (!callOutcomeId || !eventEndAt) {
    return { skipped: true, reason: "missing_outcome_or_end" };
  }

  const buffer = await step.run("load-buffer", () =>
    getCallOutcomeBufferMinutes(coachId),
  );

  const target = new Date(eventEndAt).getTime() + buffer * 60_000;
  await step.sleepUntil("await-call-end", new Date(target));

  // CAS flip: only a still-scheduled row transitions. Returns the affected row
  // so a no-op (already resolved/cancelled, or poller-flipped) skips the notify.
  const flipped = await step.run("flip-awaiting", async () => {
    const { data } = await adminClient
      .from("call_outcomes")
      .update({ status: "awaiting_outcome", prompted_at: new Date().toISOString() })
      .eq("id", callOutcomeId)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    return !!data;
  });

  if (!flipped) {
    return { flipped: false, callOutcomeId };
  }

  await step.sendEvent("notify", {
    name: "notification/call_outcome_pending",
    data: {
      coachId,
      eventType: "call_outcome_pending",
      payload: { callOutcomeId, leadId },
    },
  });

  return { flipped: true, callOutcomeId };
}

export const callOutcomeMonitor = inngest.createFunction(
  {
    id: "call-outcome-monitor",
    name: "Call outcome monitor, prompt the coach after the call ends",
    triggers: [{ event: LEAD_CALL_BOOKED }],
    cancelOn: [
      {
        event: "calendar/cancelled",
        if: "async.data.callOutcomeId == event.data.callOutcomeId",
      },
      {
        event: "calendar/rescheduled",
        if: "async.data.callOutcomeId == event.data.callOutcomeId",
      },
    ],
    concurrency: { key: "event.data.coachId", limit: 5 },
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest handler signature widened for event payload
  callOutcomeMonitorHandler as any,
);
