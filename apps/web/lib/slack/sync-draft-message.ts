import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getSlackClientForCoach } from "@/lib/slack/client";
import { resolveSlackDmChannel } from "@/lib/slack/dm-channel";
import {
  buildApprovedElsewhereBlocks,
  buildApprovedBlocks,
  buildHeldBlocks,
  buildCancelledBlocks,
} from "@/lib/slack/blocks";

export type SlackDraftState = "approved" | "sent" | "held" | "cancelled";

function blocksFor(state: SlackDraftState): { blocks: unknown[]; text: string } {
  switch (state) {
    case "sent":
      return {
        blocks: buildApprovedBlocks(
          new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        ),
        text: "Approved and sent",
      };
    case "held":
      return { blocks: buildHeldBlocks(), text: "Held" };
    case "cancelled":
      return { blocks: buildCancelledBlocks(), text: "Cancelled" };
    case "approved":
    default:
      return { blocks: buildApprovedElsewhereBlocks(), text: "Approved" };
  }
}

/**
 * Retire the interactive buttons on the Slack message we posted for a draft when
 * that draft transitions outside of Slack, approved/held/cancelled from the
 * dashboard or review link, or auto-sent by a Mode-B timer. Without this the
 * original DM keeps its Approve/Edit/Hold buttons forever even though the draft
 * is already resolved, so the coach sees stale buttons (and can double-act).
 *
 * Best-effort and self-contained: every failure path (no Slack message for this
 * draft, Slack disconnected, chat.update error) is swallowed, a stale button is
 * never worth failing the approval that triggered this.
 */
export async function syncSlackDraftMessage(args: {
  draftId: string;
  coachId: string;
  state: SlackDraftState;
}): Promise<void> {
  const { draftId, coachId, state } = args;
  try {
    // The Slack ts of the draft_ready / lead_replied message we posted for THIS
    // draft. Scoped by draft_id so we never edit a different draft's message.
    const { data: log } = await adminClient
      .from("notification_log")
      .select("external_id")
      .eq("coach_id", coachId)
      .eq("channel", "slack")
      .eq("draft_id", draftId)
      .eq("status", "sent")
      .not("external_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!log?.external_id) return; // never notified on Slack for this draft

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

    const { blocks, text } = blocksFor(state);
    const slack = await getSlackClientForCoach(coachId);
    // chat.update needs the DM channel id (D…), the stored external_account_id
    // is the coach's USER id (U…), which chat.update rejects (#77).
    const channel = await resolveSlackDmChannel(
      slack,
      integration.external_account_id as string,
    );
    if (!channel) return;
    await slack.chat.update({
      channel,
      ts: log.external_id as string,
      blocks: blocks as never[],
      text,
    });
  } catch (err) {
    console.error("[syncSlackDraftMessage] failed", {
      draftId,
      state,
      reason: err instanceof Error ? err.message : "unknown",
    });
  }
}
