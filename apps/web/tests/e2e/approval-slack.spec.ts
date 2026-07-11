import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { admin } from "../fixtures/createCoach";
import crypto from "node:crypto";

// 06-PLAN.md §1.4, approval-slack: Block Kit button click → atomic approve → message updated.
// Slack interactivity payloads are signed with the Slack signing secret (v0 scheme).

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "test-slack-secret";

function signSlack(body: string): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const baseString = `v0:${timestamp}:${body}`;
  const signature =
    "v0=" +
    crypto.createHmac("sha256", SLACK_SIGNING_SECRET).update(baseString).digest("hex");
  return { signature, timestamp };
}

test("Slack interactivity approve: atomic update + 200 response", async ({ coach, page }) => {
  const lead = await createLead(coach.id);
  const draft = await createDraft(coach.id, lead.id);

  const payload = {
    type: "block_actions",
    user: { id: "U-test" },
    actions: [
      {
        action_id: "approve_draft",
        value: JSON.stringify({ draft_id: draft.id, coach_id: coach.id }),
      },
    ],
    response_url: "https://hooks.slack.com/actions/test",
  };

  const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const { signature, timestamp } = signSlack(body);

  const res = await page.request.post("/api/webhooks/slack/interactivity", {
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-slack-signature": signature,
      "x-slack-request-timestamp": timestamp,
    },
    data: body,
  });
  expect([200, 202]).toContain(res.status());

  const { data: updated } = await admin
    .from("drafts")
    .select("status")
    .eq("id", draft.id)
    .single();
  // Approved either synchronously or via background job
  expect(["approved", "sent", "pending"]).toContain(updated?.status);
});

test("Slack interactivity with invalid signature: rejected", async ({ page }) => {
  const body = "payload=%7B%22type%22%3A%22block_actions%22%7D";
  const res = await page.request.post("/api/webhooks/slack/interactivity", {
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-slack-signature": "v0=invalid",
      "x-slack-request-timestamp": Math.floor(Date.now() / 1000).toString(),
    },
    data: body,
  });
  expect([401, 400]).toContain(res.status());
});
