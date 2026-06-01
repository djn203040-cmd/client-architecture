import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getSlackClientForCoach } from "@/lib/slack/client";
import { buildDraftReadyBlocks } from "@/lib/slack/blocks";
import type { TNotificationEvent, TChannelResult } from "@client/shared";

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
      await adminClient.from("notification_log").insert({
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

    await adminClient.from("notification_log").insert({
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
    await adminClient.from("notification_log").insert({
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
