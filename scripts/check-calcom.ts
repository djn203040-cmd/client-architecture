// Verification helper for the §2.5b Cal.com calendar walk.
// Shows the coach's cal_com integration state + recent calendar_events.
// Usage: pnpm tsx scripts/check-calcom.ts <coach-email>
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

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm tsx scripts/check-calcom.ts <coach-email>");
  process.exit(1);
}

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

async function main(): Promise<void> {
  const { data: coach } = await admin
    .from("coaches")
    .select("id, email, active_calendar_provider")
    .eq("email", email)
    .maybeSingle();
  if (!coach) {
    console.error(`No coach for ${email}`);
    process.exit(1);
  }
  console.log("== coach ==");
  console.log(`  id:                       ${coach.id}`);
  console.log(`  active_calendar_provider: ${coach.active_calendar_provider ?? "(none)"}`);

  const { data: integ } = await admin
    .from("integrations")
    .select("provider, status, error_message, vault_secret_id, metadata, last_checked_at")
    .eq("coach_id", coach.id)
    .eq("provider", "cal_com")
    .maybeSingle();
  console.log("\n== integrations[cal_com] ==");
  if (!integ) {
    console.log("  (no row — not connected yet)");
  } else {
    console.log(`  status:                 ${integ.status}`);
    console.log(`  error_message:          ${integ.error_message ?? "(none)"}`);
    console.log(`  has vault secret:       ${integ.vault_secret_id ? "yes" : "no"}`);
    console.log(`  webhook_subscription_id:${(integ.metadata as { webhook_subscription_id?: string } | null)?.webhook_subscription_id ?? "(none)"}`);
    console.log(`  last_checked_at:        ${integ.last_checked_at ?? "(none)"}`);
  }

  const { data: events } = await admin
    .from("calendar_events")
    .select("id, provider, event_type, external_event_id, lead_id, processed_at")
    .eq("coach_id", coach.id)
    .eq("provider", "cal_com")
    .order("processed_at", { ascending: false })
    .limit(10);
  console.log(`\n== calendar_events[cal_com] (latest ${events?.length ?? 0}) ==`);
  for (const e of events ?? []) {
    console.log(`  ${e.processed_at}  ${e.event_type.padEnd(16)} lead=${e.lead_id ?? "—"}  ext=${e.external_event_id}`);
  }
  if (!events?.length) console.log("  (none yet)");

  // Downstream effect: for any matched lead, show its status + recent sequences.
  const leadIds = [...new Set((events ?? []).map((e) => e.lead_id).filter(Boolean))] as string[];
  for (const lid of leadIds) {
    const { data: lead } = await admin.from("leads").select("email, status").eq("id", lid).maybeSingle();
    const { data: seqs } = await admin
      .from("sequences")
      .select("track, status, module, created_at")
      .eq("lead_id", lid)
      .order("created_at", { ascending: false })
      .limit(5);
    console.log(`\n== lead ${lead?.email ?? lid} -> status=${lead?.status} ==`);
    for (const s of seqs ?? []) {
      console.log(`  seq  track=${(s.track ?? "").padEnd(14)} status=${(s.status ?? "").padEnd(10)} created=${s.created_at}`);
    }
    if (!seqs?.length) console.log("  (no sequences)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
