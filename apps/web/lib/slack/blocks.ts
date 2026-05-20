import "server-only";

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
      text: { type: "mrkdwn", text: `*Subject:* ${args.subject}\n\n${args.body}` },
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
      text: { type: "mrkdwn", text: `:white_check_mark: Approved — sent at ${sentAt}` },
    },
  ];
}

export function buildEditedApprovedBlocks(sentAt: string): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: `:pencil2: Edited and approved — sent at ${sentAt}` },
    },
  ];
}

export function buildHeldBlocks(): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: ":pause_button: Held — visit your dashboard to re-approve." },
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
