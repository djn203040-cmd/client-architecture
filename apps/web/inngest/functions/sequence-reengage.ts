import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import {
  LEAD_REPLIED,
  LEAD_CALL_BOOKED,
  LEAD_UNSUBSCRIBED,
  LEAD_NO_SHOW,
  LEAD_MANUALLY_ENROLLED,
} from "@client/shared/constants/events";
import { generateReengagementDraft } from "@/lib/drafts/generate-reengagement";
import { buildDraftOutcome } from "@/lib/autonomous-mode";

// Defaults when a coach hasn't customised re-engagement in sequence_config.
const DEFAULT_SILENCE_DAYS = 3;
const DEFAULT_MAX_ATTEMPTS = 3;

type ReengageConfig = {
  reengage_silence_days?: number;
  reengage_max_attempts?: number;
};

export type ReengageEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

/**
 * After waking from the silence sleep, decide whether to send another
 * re-engagement nudge. A wake means no inbound reply landed during the window
 * (an inbound fires LEAD_REPLIED, which cancels this run), so we only need to
 * confirm the lead is still re-engageable and the coach isn't already sitting on
 * an unsent draft.
 */
export async function checkReengageEligible(
  leadId: string,
  coachId: string,
): Promise<ReengageEligibility> {
  const { data: lead } = await adminClient
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .eq("coach_id", coachId)
    .maybeSingle();

  // Only a lead still sitting in "replied" is a re-engagement candidate. Any
  // other status means they moved on (converted/lost/booked/unsubscribed) or
  // re-entered a fresh sequence — stop nudging.
  if (!lead) return { eligible: false, reason: "lead_missing" };
  if (lead.status !== "replied") return { eligible: false, reason: `status:${lead.status}` };

  // If a standalone draft is still pending, the ball is in the coach's court
  // (they haven't sent their reply / the previous nudge yet). Don't pile another
  // message on top — stop until they act.
  const { count: pendingCount } = await adminClient
    .from("drafts")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .eq("coach_id", coachId)
    .is("sequence_id", null)
    .eq("status", "pending");
  if ((pendingCount ?? 0) > 0) return { eligible: false, reason: "draft_pending" };

  return { eligible: true };
}

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sleep(id: string, duration: string): Promise<void>;
  sendEvent(
    id: string,
    event: { name: string; data: Record<string, unknown> },
  ): Promise<{ ids: string[] }>;
};

type ReengageEvent = {
  name: string;
  data: { coachId: string; leadId: string };
};

/**
 * Silence-gated re-engagement. Armed by every lead reply; a newer reply cancels
 * and re-arms this run (cancelOn LEAD_REPLIED), so a back-and-forth never
 * thrashes — it just keeps resetting the silence timer. Once the thread has been
 * quiet for the configured window AND the coach has cleared their queue, it
 * sends up to N conversation-aware nudges, then closes the lead out.
 */
export async function sequenceReengageHandler({
  event,
  step,
}: {
  event: ReengageEvent;
  step: StepTools;
}) {
  const { coachId, leadId } = event.data;

  const cfg = await step.run("load-reengage-config", async () => {
    const { data } = await adminClient
      .from("coaches")
      .select("sequence_config")
      .eq("id", coachId)
      .maybeSingle();
    const raw = (data?.sequence_config as ReengageConfig | null) ?? {};
    const silenceDays =
      typeof raw.reengage_silence_days === "number" && raw.reengage_silence_days > 0
        ? raw.reengage_silence_days
        : DEFAULT_SILENCE_DAYS;
    const maxAttempts =
      typeof raw.reengage_max_attempts === "number" && raw.reengage_max_attempts > 0
        ? Math.floor(raw.reengage_max_attempts)
        : DEFAULT_MAX_ATTEMPTS;
    return { silenceDays, maxAttempts };
  });

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    // Wait out the silence window. If the lead replies during it, cancelOn kills
    // this run and a fresh one starts from the new reply — so reaching the line
    // below proves the thread stayed quiet for the whole window.
    await step.sleep(`silence-${attempt}`, `${cfg.silenceDays}d`);

    const eligibility = await step.run(`eligibility-${attempt}`, () =>
      checkReengageEligible(leadId, coachId),
    );
    if (!eligibility.eligible) {
      return { stopped: true, attempt, reason: eligibility.reason };
    }

    const generated = await step.run(`generate-reengage-${attempt}`, () =>
      generateReengagementDraft({
        coachId,
        leadId,
        attempt,
        maxAttempts: cfg.maxAttempts,
      }),
    );
    if (!generated.ok) {
      // Couldn't generate (e.g. no voice model) — don't keep retrying blindly.
      return { stopped: true, attempt, reason: `generate_failed:${generated.reason}` };
    }

    // Fan out the mode-appropriate send/notify events, exactly like every other
    // draft creation path: mode_a sends now, mode_b arms the 24h auto-send timer,
    // manual notifies the coach and starts the follow-up CTA.
    const events = await step.run(`outcome-${attempt}`, async () => {
      const { data: coach } = await adminClient
        .from("coaches")
        .select("autonomous_mode")
        .eq("id", coachId)
        .maybeSingle();
      const now = new Date().toISOString();
      return buildDraftOutcome(
        coach?.autonomous_mode ?? "off",
        generated.draftId,
        coachId,
        generated.leadName,
        generated.confidenceLevel,
        now,
      ).events;
    });
    for (let i = 0; i < events.length; i++) {
      await step.sendEvent(`dispatch-${attempt}-event-${i}`, events[i]!);
    }
  }

  // All attempts met silence — close the lead and finish the paused sequence.
  await step.run("close-lead-reengage-exhausted", async () => {
    const { data: lead } = await adminClient
      .from("leads")
      .select("status")
      .eq("id", leadId)
      .eq("coach_id", coachId)
      .maybeSingle();
    // Re-check: if the lead moved on between the last nudge and here, leave them be.
    if (!lead || lead.status !== "replied") return;

    await adminClient
      .from("leads")
      .update({ status: "lost" })
      .eq("id", leadId)
      .eq("coach_id", coachId);
    await adminClient
      .from("sequences")
      .update({ status: "completed" })
      .eq("lead_id", leadId)
      .eq("coach_id", coachId)
      .eq("status", "paused");
    await adminClient.from("lead_events").insert({
      lead_id: leadId,
      coach_id: coachId,
      event_type: "state_changed",
      payload: { from: "replied", to: "lost", reason: "reengagement_exhausted" },
      triggered_by: "system",
    });
  });

  return { completed: true, attempts: cfg.maxAttempts };
}

export const sequenceReengage = inngest.createFunction(
  {
    id: "sequence-reengage",
    name: "Silence-gated re-engagement after a reply goes quiet",
    concurrency: { limit: 5, key: "event.data.coachId" },
    // Inngest caps cancelOn at 5 events per function. All of these transitions
    // are already backstopped by the post-sleep eligibility re-check
    // (checkReengageEligible stops on any lead status != "replied"), so cancelOn
    // is an instant-teardown optimization, not a correctness requirement — a
    // stale run that isn't cancelled here still self-terminates (and never sends)
    // at its next silence-window wake. LEAD_CALL_COMPLETED is deliberately
    // omitted to stay within the cap: a call can't complete without first being
    // booked, and LEAD_CALL_BOOKED below already cancels the run at booking time.
    cancelOn: [
      // A newer reply supersedes this watcher — cancel so a fresh run re-arms the
      // silence timer from the latest message. This is what makes a rapid
      // back-and-forth pause-stay-paused instead of thrashing.
      {
        event: LEAD_REPLIED,
        if: "async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId",
      },
      // Lead changed course or re-entered a fresh sequence — stop re-engaging.
      {
        event: LEAD_CALL_BOOKED,
        if: "async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId",
      },
      { event: LEAD_UNSUBSCRIBED, if: "async.data.leadId == event.data.leadId" },
      {
        event: LEAD_NO_SHOW,
        if: "async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId",
      },
      {
        event: LEAD_MANUALLY_ENROLLED,
        if: "async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId",
      },
    ],
    triggers: [{ event: LEAD_REPLIED }],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest event payload is structurally typed at runtime; no static schema
  sequenceReengageHandler as any,
);
