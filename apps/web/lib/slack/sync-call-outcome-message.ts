import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getSlackClientForCoach } from "@/lib/slack/client";
import { buildCallOutcomeResolvedBlocks } from "@/lib/slack/blocks";
import type { TCallOutcomeValue } from "@client/shared";

/**
 * Retire the interactive buttons on the Slack "How did the call go?" prompt once
 * the outcome is recorded on ANY surface (dashboard PATCH, lead-profile panel, a
 * Slack click, or an auto provider no_show). Mirrors syncSlackDraftMessage: find
 * the message ts we logged for THIS call_outcome, then chat.update it to the
 * buttonless "Recorded: …" state so the coach can't double-act on a stale prompt.
 *
 * The ts lives in notification_log with event_type='call_outcome_pending' and
 * payload.callOutcomeId (written by postCallOutcomeSlack in 07-02). Best-effort:
 * every failure path (never notified on Slack, disconnected, chat.update error)
 * is swallowed — a stale button is never worth failing the resolve that ran. IDs
 * only in logs (CALL-016) — no lead name/email.
 */
export async function syncSlackCallOutcomeMessage(args: {
  id: string;
  coachId: string;
  outcome: TCallOutcomeValue;
}): Promise<void> {
  const { id, coachId, outcome } = args;
  try {
    const { data: log } = await adminClient
      .from("notification_log")
      .select("external_id")
      .eq("coach_id", coachId)
      .eq("channel", "slack")
      .eq("event_type", "call_outcome_pending")
      .eq("status", "sent")
      .contains("payload", { callOutcomeId: id })
      .not("external_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!log?.external_id) return; // never notified on Slack for this outcome

    const { data: integration } = await adminClient
      .from("integrations")
      .select("external_account_id, status")
      .eq("coach_id", coachId)
      .eq("provider", "slack")
      .maybeSingle();
    if (
      !integration ||
      integration.status !== "connected" ||
      !integration.external_account_id
    ) {
      return;
    }

    const slack = await getSlackClientForCoach(coachId);
    await slack.chat.update({
      channel: integration.external_account_id as string,
      ts: log.external_id as string,
      blocks: buildCallOutcomeResolvedBlocks(outcome) as never[],
      text: "Call outcome recorded",
    });
  } catch (err) {
    console.error("[syncSlackCallOutcomeMessage] failed", {
      callOutcomeId: id,
      outcome,
      reason: err instanceof Error ? err.message : "unknown",
    });
  }
}
