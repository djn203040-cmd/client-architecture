// Posts a real draft_ready Slack DM (full body + Approve/Edit/Hold buttons) to a
// coach, replicating lib/notifications/channels/slack.ts + lib/slack/blocks.ts.
// Used for §2.6 UAT when we can't reach prod Inngest directly (event key is
// integration-injected and not readable locally). The buttons work because the
// live interactivity webhook resolves them by draft id.
//
// Usage: pnpm --filter web exec tsx ../../scripts/slack-dm-draft.ts <coach-email> [draftId]
import { createClient } from "@supabase/supabase-js";
import { WebClient } from "@slack/web-api";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of [resolve(repoRoot, "apps/web/.env.local"), resolve(repoRoot, ".env.local")]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq < 0) continue;
    const k = t.slice(0, eq).trim(); if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
  }
  break;
}

const email = process.argv[2];
const draftIdArg = process.argv[3];
if (!email) { console.error("Usage: tsx slack-dm-draft.ts <coach-email> [draftId]"); process.exit(1); }

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

function buildDraftReadyBlocks(a: { draftId: string; leadName: string; subject: string; body: string; scheduledSendAt: string }): unknown[] {
  return [
    { type: "header", text: { type: "plain_text", text: `Draft ready for ${a.leadName}` } },
    { type: "context", elements: [{ type: "mrkdwn", text: `Scheduled to send at *${a.scheduledSendAt}*` }] },
    { type: "divider" },
    { type: "section", text: { type: "mrkdwn", text: `*Subject:* ${a.subject}\n\n${a.body}` } },
    { type: "divider" },
    {
      type: "actions",
      block_id: `draft_actions_${a.draftId}`,
      elements: [
        { type: "button", text: { type: "plain_text", text: "Approve & send" }, style: "primary", value: a.draftId, action_id: "draft_approve" },
        { type: "button", text: { type: "plain_text", text: "Edit" }, value: a.draftId, action_id: "draft_edit" },
        {
          type: "button", text: { type: "plain_text", text: "Hold" }, style: "danger", value: a.draftId, action_id: "draft_hold",
          confirm: {
            title: { type: "plain_text", text: "Hold this draft?" },
            text: { type: "plain_text", text: "It will move to the Held tab until you re-approve it." },
            confirm: { type: "plain_text", text: "Hold" }, deny: { type: "plain_text", text: "Cancel" },
          },
        },
      ],
    },
  ];
}

async function main(): Promise<void> {
  const { data: coach } = await admin.from("coaches").select("id").eq("email", email).maybeSingle();
  if (!coach) { console.error(`No coach for ${email}`); process.exit(1); }

  let q = admin.from("drafts").select("id, status, lead_id, subject, body").eq("coach_id", coach.id);
  q = draftIdArg ? q.eq("id", draftIdArg) : q.eq("status", "pending");
  const { data: draft } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!draft) { console.error("No matching draft (need a pending one — generate first)."); process.exit(1); }

  const { data: lead } = await admin.from("leads").select("name").eq("id", draft.lead_id).maybeSingle();

  const { data: integration } = await admin.from("integrations")
    .select("external_account_id, vault_secret_id, status").eq("coach_id", coach.id).eq("provider", "slack").maybeSingle();
  if (!integration || integration.status !== "connected" || !integration.external_account_id) {
    console.error("Slack not connected for this coach"); process.exit(1);
  }
  const { data: token, error: tokErr } = await admin.schema("private").rpc("get_slack_token", { p_coach_id: coach.id });
  if (tokErr || !token) { console.error("bot token read failed:", tokErr?.message ?? "null"); process.exit(1); }

  const slack = new WebClient(token as string);
  const blocks = buildDraftReadyBlocks({
    draftId: draft.id,
    leadName: lead?.name ?? "your lead",
    subject: (draft.subject as string) ?? "",
    body: (draft.body as string) ?? "",
    scheduledSendAt: "tomorrow at 12:15",
  });
  const res = await slack.chat.postMessage({
    channel: integration.external_account_id,
    text: `Draft ready for ${lead?.name ?? "your lead"}`,
    blocks: blocks as never[],
  });
  console.log(`Posted DM (ok=${res.ok}, ts=${res.ts}) for draft ${draft.id} → ${lead?.name}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
