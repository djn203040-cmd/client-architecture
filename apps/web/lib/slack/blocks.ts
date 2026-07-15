import "server-only";

// Slack mrkdwn treats `&`, `<`, `>` as control characters (`<url|label>` renders
// a clickable link). Lead-controlled text (reply subject inherited from a lead's
// inbound email) must be escaped per Slack's spec before going into an mrkdwn
// field, or a lead can inject a clickable link into the coach's DM.
function escapeSlackMrkdwn(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface DraftReadyBlockArgs {
  draftId: string;
  leadName: string;
  subject: string;
  body: string;
  scheduledSendAt: string;
  confidenceLevel: "high" | "low";
}

export function buildDraftReadyBlocks(args: DraftReadyBlockArgs): unknown[] {
  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: `Draft ready for ${args.leadName}` } },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Scheduled to send at *${args.scheduledSendAt}*` }],
    },
  ];
  if (args.confidenceLevel === "low") {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: ":warning: Voice model has limited examples" }],
    });
  }
  blocks.push(
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Subject:* ${escapeSlackMrkdwn(args.subject)}\n\n${escapeSlackMrkdwn(args.body)}`,
      },
    },
    { type: "divider" },
    {
      type: "actions",
      block_id: `draft_actions_${args.draftId}`,
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve & send" },
          style: "primary",
          value: args.draftId,
          action_id: "draft_approve",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Edit" },
          value: args.draftId,
          action_id: "draft_edit",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Hold" },
          style: "danger",
          value: args.draftId,
          action_id: "draft_hold",
          confirm: {
            title: { type: "plain_text", text: "Hold this draft?" },
            text: { type: "plain_text", text: "It will move to the Held tab until you re-approve it." },
            confirm: { type: "plain_text", text: "Hold" },
            deny: { type: "plain_text", text: "Cancel" },
          },
        },
      ],
    },
  );
  return blocks;
}

export function buildApprovedBlocks(sentAt: string): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: `:white_check_mark: Approved, sent at ${sentAt}` },
    },
  ];
}

export function buildEditedApprovedBlocks(sentAt: string): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: `:pencil2: Edited and approved, sent at ${sentAt}` },
    },
  ];
}

export function buildHeldBlocks(): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: ":pause_button: Held, visit your dashboard to re-approve." },
    },
  ];
}

// Shown when a draft is approved somewhere other than Slack (dashboard, review
// link) and the original interactive message's buttons must be retired so the
// coach can't double-act on it.
export function buildApprovedElsewhereBlocks(): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: ":white_check_mark: Approved, sending shortly." },
    },
  ];
}

export function buildCancelledBlocks(): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: ":x: Cancelled, no message was sent." },
    },
  ];
}

// ---------------------------------------------------------------------------
// Call Outcomes (Phase 7, D-18), groundwork. STABLE export imported by both
// wave-2 plans (07-02 dispatcher posts the prompt; 07-03 extends interactivity).
// Mirrors buildDraftReadyBlocks: action_id carries intent, value carries the id.
// ---------------------------------------------------------------------------

export function buildCallOutcomeBlocks(args: {
  leadName: string;
  callOutcomeId: string;
  callTime: string;
}): unknown[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: `How did the call with ${args.leadName} go?` },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Scheduled call time: *${args.callTime}*` }],
    },
    {
      type: "actions",
      block_id: `call_outcome_actions_${args.callOutcomeId}`,
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "No show" },
          value: args.callOutcomeId,
          action_id: "call_outcome_no_show",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Call completed" },
          style: "primary",
          value: args.callOutcomeId,
          action_id: "call_outcome_completed",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Converted 🎉" },
          value: args.callOutcomeId,
          action_id: "call_outcome_converted",
        },
      ],
    },
  ];
}

// Retire-state blocks (no buttons) for the chat.update once an outcome is
// recorded, mirrors buildApprovedBlocks / buildHeldBlocks.
export function buildCallOutcomeResolvedBlocks(
  outcome: "no_show" | "completed" | "converted",
): unknown[] {
  const label =
    outcome === "no_show"
      ? "No show"
      : outcome === "completed"
        ? "Call completed"
        : "Converted 🎉";
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: `:white_check_mark: Recorded: ${label}` },
    },
  ];
}

export function buildEditModalView(args: {
  draftId: string;
  currentSubject: string;
  currentBody: string;
}): unknown {
  return {
    type: "modal",
    callback_id: "draft_edit_submit",
    private_metadata: args.draftId,
    title: { type: "plain_text", text: "Edit draft" },
    submit: { type: "plain_text", text: "Save and send" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "draft_subject_input",
        label: { type: "plain_text", text: "Subject" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          initial_value: args.currentSubject,
        },
      },
      {
        type: "input",
        block_id: "draft_body_input",
        label: { type: "plain_text", text: "Draft body" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          multiline: true,
          initial_value: args.currentBody,
        },
      },
    ],
  };
}
