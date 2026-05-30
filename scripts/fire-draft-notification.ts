// Fires a `notification/draft_ready` event at the prod Inngest endpoint so the
// deployed notification-dispatcher fans out to the coach's enabled channels
// (Slack DM with Approve/Edit, dashboard, email, etc.). UAT helper for §2.6.
//
// Usage:
//   pnpm --filter web exec tsx ../../scripts/fire-draft-notification.ts <coach-email> [draftId]
// If draftId is omitted, targets the coach's most recent `pending` draft.
import { createClient } from "@supabase/supabase-js";
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
if (!email) { console.error("Usage: tsx fire-draft-notification.ts <coach-email> [draftId]"); process.exit(1); }

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

async function main(): Promise<void> {
  const { data: coach } = await admin.from("coaches").select("id").eq("email", email).maybeSingle();
  if (!coach) { console.error(`No coach for ${email}`); process.exit(1); }

  let draftQuery = admin.from("drafts").select("id, status, lead_id, subject").eq("coach_id", coach.id);
  draftQuery = draftIdArg ? draftQuery.eq("id", draftIdArg) : draftQuery.eq("status", "pending");
  const { data: draft } = await draftQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!draft) {
    console.error(draftIdArg ? `Draft ${draftIdArg} not found for ${email}` : `No pending draft for ${email} — generate one first.`);
    process.exit(1);
  }

  const { data: lead } = await admin.from("leads").select("name").eq("id", draft.lead_id).maybeSingle();
  const leadName = lead?.name ?? "your lead";

  const eventKey = process.env["INNGEST_EVENT_KEY"];
  if (!eventKey) { console.error("INNGEST_EVENT_KEY not set"); process.exit(1); }

  const body = {
    name: "notification/draft_ready",
    data: {
      coachId: coach.id,
      eventType: "draft_ready",
      payload: { draftId: draft.id, leadName, confidenceLevel: "high" },
    },
  };

  const res = await fetch(`https://inn.gs/e/${eventKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`Fired draft_ready for draft ${draft.id} (status=${draft.status}, lead=${leadName})`);
  console.log(`Inngest HTTP ${res.status}: ${text}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
