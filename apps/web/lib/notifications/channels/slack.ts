import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { writeNotificationLog } from "@/lib/notifications/log-write";
import { getSlackClientForCoach } from "@/lib/slack/client";
import { isSlackAuthRevokedError, handleSlackIntegrationBroken } from "@/lib/slack/error-handler";
import { buildDraftReadyBlocks } from "@/lib/slack/blocks";
import type { TNotificationEvent, TChannelResult } from "@client/shared";

/**
 * Low-level Slack poster for the Call Outcomes prompt (D-16). The dispatcher
 * builds the blocks (buildCallOutcomeBlocks) and hands them here so the posting
 * + notification_log bookkeeping stays in one place. The ts is logged with the
 * call_outcome_pending event_type and payload.callOutcomeId so 07-03's
 * syncSlackCallOutcomeMessage can find the message to retire its buttons.
 */
export async function postCallOutcomeSlack(args: {
  coachId: string;
  callOutcomeId: string;
  blocks: unknown[];
  fallbackText: string;
}): Promise<TChannelResult> {
  const { coachId, callOutcomeId, blocks, fallbackText } = args;
  try {
    const { data: integration } = await adminClient
      .from("integrations")
      .select("external_account_id, status")
      .eq("coach_id", coachId)
      .eq("provider", "slack")
      .maybeSingle();

    if (!integration || integration.status !== "connected" || !integration.external_account_id) {
      await writeNotificationLog({
        coach_id: coachId,
        event_type: "call_outcome_pending",
        channel: "slack",
        status: "failed",
        error_message: "slack_not_connected",
        payload: { callOutcomeId },
      });
      return { channel: "slack", status: "failed", external_id: null, error_message: "slack_not_connected" };
    }

    const slack = await getSlackClientForCoach(coachId);
    const res = await slack.chat.postMessage({
      channel: integration.external_account_id,
      text: fallbackText,
      blocks: blocks as never[],
    });
    if (!res.ok || !res.ts) throw new Error(`slack_post_failed:${res.error ?? "no_ts"}`);

    await writeNotificationLog({
      coach_id: coachId,
      event_type: "call_outcome_pending",
      channel: "slack",
      external_id: res.ts,
      status: "sent",
      payload: { callOutcomeId },
    });
    return { channel: "slack", status: "sent", external_id: res.ts, error_message: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send_failed";
    // A revoked bot token means the Slack integration is broken — flag it and
    // notify the coach on their other channels (no recursion risk here: this
    // path only ever runs for call_outcome_pending, never integration_broken).
    if (isSlackAuthRevokedError(err)) {
      await handleSlackIntegrationBroken(coachId);
    }
    await writeNotificationLog({
      coach_id: coachId,
      event_type: "call_outcome_pending",
      channel: "slack",
      status: "failed",
      error_message: msg,
      payload: { callOutcomeId },
    });
    return { channel: "slack", status: "failed", external_id: null, error_message: msg };
  }
}

export async function sendSlack(event: TNotificationEvent): Promise<TChannelResult> {
  const { coachId, eventType, payload } = event;

  try {
    const { data: integration } = await adminClient
      .from("integrations")
      .select("external_account_id, status")
      .eq("coach_id", coachId)
      .eq("provider", "slack")
      .maybeSingle();

    if (!integration || integration.status !== "connected" || !integration.external_account_id) {
      await writeNotificationLog({
        coach_id: coachId,
        event_type: eventType,
        channel: "slack",
        status: "failed",
        error_message: "slack_not_connected",
      });
      return {
        channel: "slack",
        status: "failed",
        external_id: null,
        error_message: "slack_not_connected",
      };
    }

    const slack = await getSlackClientForCoach(coachId);

    let blocks: unknown[];
    let fallbackText: string;

    if (eventType === "draft_ready" || eventType === "lead_replied") {
      if (!payload.draftId) throw new Error("draftId required");
      const { data: draft } = await adminClient
        .from("drafts")
        .select("id, body, subject, confidence_level, scheduled_send_at")
        .eq("id", payload.draftId)
        .single();
      if (!draft) throw new Error("draft_not_found");

      blocks = buildDraftReadyBlocks({
        draftId: draft.id,
        leadName: payload.leadName ?? "your lead",
        subject: payload.subject ?? (draft.subject as string) ?? "",
        body: payload.body ?? (draft.body as string) ?? "",
        scheduledSendAt: payload.sendTime ?? "soon",
        confidenceLevel: draft.confidence_level === "low" ? "low" : "high",
      });
      fallbackText = `Draft ready for ${payload.leadName ?? "your lead"}`;
    } else {
      // hard_bounce / integration_broken — simple text message
      fallbackText =
        eventType === "hard_bounce"
          ? `Email to ${payload.leadEmail ?? "your lead"} bounced. Check integrations.`
          : payload.provider
            ? `Your ${payload.provider} connection needs attention — reconnect it from your dashboard.`
            : "An integration needs attention.";
      blocks = [{ type: "section", text: { type: "mrkdwn", text: fallbackText } }];
    }

    const res = await slack.chat.postMessage({
      channel: integration.external_account_id,
      text: fallbackText,
      blocks: blocks as never[],
    });
    if (!res.ok || !res.ts) throw new Error(`slack_post_failed:${res.error ?? "no_ts"}`);

    await writeNotificationLog({
      coach_id: coachId,
      draft_id: payload.draftId ?? null,
      event_type: eventType,
      channel: "slack",
      external_id: res.ts,
      status: "sent",
    });
    return { channel: "slack", status: "sent", external_id: res.ts, error_message: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send_failed";
    // A revoked bot token means the Slack integration is broken — flag it and
    // notify the coach. Guard against eventType === "integration_broken": that
    // notice is itself fanned out over Slack, so re-detecting here would have
    // the dispatcher emit integration_broken forever. The coach still gets the
    // notice via dashboard + email (both enabled in the seed matrix).
    if (eventType !== "integration_broken" && isSlackAuthRevokedError(err)) {
      await handleSlackIntegrationBroken(coachId);
    }
    await writeNotificationLog({
      coach_id: coachId,
      draft_id: payload.draftId ?? null,
      event_type: eventType,
      channel: "slack",
      status: "failed",
      error_message: msg,
    });
    return { channel: "slack", status: "failed", external_id: null, error_message: msg };
  }
}
