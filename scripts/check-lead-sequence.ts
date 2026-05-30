// Inspect a lead's sequence + drafts state.
// Usage: pnpm tsx scripts/check-lead-sequence.ts <lead name or email substring>
import { createClient } from "@supabase/supabase-js";
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

const q = process.argv[2] ?? "augusta";
const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

async function main(): Promise<void> {
  const { data: leads } = await admin
    .from("leads")
    .select("id, name, email, status, coach_id, created_at")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .order("created_at", { ascending: false });

  if (!leads || leads.length === 0) {
    console.error(`No lead matching "${q}"`);
    process.exit(1);
  }

  for (const lead of leads) {
    console.log("== lead ==");
    console.log(`  ${lead.name} <${lead.email}>  status=${lead.status}`);
    console.log(`  id=${lead.id}  created=${lead.created_at}`);

    const { data: coach } = await admin
      .from("coaches")
      .select("email, autonomous_mode, sequence_config")
      .eq("id", lead.coach_id)
      .maybeSingle();
    console.log(
      `  coach=${coach?.email} mode=${coach?.autonomous_mode ?? "(null=manual)"} cadence=${JSON.stringify(coach?.sequence_config) ?? "(default)"}`,
    );

    const { data: seqs } = await admin
      .from("sequences")
      .select("id, track, status, created_at, current_touchpoint, inngest_run_id")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    console.log(`  sequences (${seqs?.length ?? 0}):`);
    for (const s of seqs ?? []) {
      console.log(
        `    [${s.status}] track=${s.track} created=${s.created_at} run=${s.inngest_run_id ?? "(none)"} id=${s.id}`,
      );
    }

    const { data: drafts } = await admin
      .from("drafts")
      .select(
        "id, status, sequence_id, touchpoint_index, total_touchpoints, scheduled_send_at, sent_at, created_at",
      )
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    console.log(`  drafts (${drafts?.length ?? 0}):`);
    for (const d of drafts ?? []) {
      console.log(
        `    [${d.status}] tp=${d.touchpoint_index}/${d.total_touchpoints ?? "?"} seq=${d.sequence_id ?? "(none)"} sched=${d.scheduled_send_at ?? "-"} sent=${d.sent_at ?? "-"}`,
      );
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
