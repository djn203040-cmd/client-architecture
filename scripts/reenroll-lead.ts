// Re-enroll a lead into the no_show intake sequence under the CURRENT deployed
// code. Cancels any active sequence first, then sends LEAD_NO_SHOW to Inngest
// Cloud (the same event the dashboard "Start Intake Sequence" button fires).
// Usage: pnpm tsx scripts/reenroll-lead.ts <lead-id>
import { createClient } from "@supabase/supabase-js";
import { Inngest } from "inngest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of [resolve(repoRoot, "apps/web/.env.local"), resolve(repoRoot, ".env.local")]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
  }
  break;
}

const leadId = process.argv[2];
if (!leadId) {
  console.error("Usage: pnpm tsx scripts/reenroll-lead.ts <lead-id>");
  process.exit(1);
}

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

const inngest = new Inngest({
  id: "client-architecture",
  eventKey: process.env["INNGEST_EVENT_KEY"]!,
});

async function main(): Promise<void> {
  const { data: lead } = await admin
    .from("leads")
    .select("id, name, email, status, coach_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) {
    console.error(`No lead ${leadId}`);
    process.exit(1);
  }
  console.log(`Lead: ${lead.name} <${lead.email}> status=${lead.status}`);

  // Cancel the stale active sequence so the old in-flight run can't act.
  const { data: cancelled } = await admin
    .from("sequences")
    .update({ status: "cancelled" })
    .eq("lead_id", lead.id)
    .eq("status", "active")
    .select("id");
  console.log(`Cancelled ${cancelled?.length ?? 0} active sequence(s).`);

  // Fire the enrollment event — handled by the deployed sequence-no-show fn.
  const res = await inngest.send({
    id: `reenroll-${lead.id}-${Date.now()}`,
    name: "lead/no_show",
    data: { coachId: lead.coach_id, leadId: lead.id, track: "no_show", triggeredBy: "manual" },
  });
  console.log(`Sent lead/no_show → Inngest. ids=${JSON.stringify(res.ids)}`);
  console.log("New sequence will generate touchpoint 1's draft now (sends ~24h later).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
