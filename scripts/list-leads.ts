// Lists a coach's recent leads (email + status) to pick a test-booking invitee.
// Usage: pnpm tsx scripts/list-leads.ts <coach-email>
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
if (!email) { console.error("Usage: pnpm tsx scripts/list-leads.ts <coach-email>"); process.exit(1); }

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

async function main(): Promise<void> {
  const { data: coach } = await admin.from("coaches").select("id").eq("email", email).maybeSingle();
  if (!coach) { console.error(`No coach for ${email}`); process.exit(1); }
  const { data: leads } = await admin
    .from("leads")
    .select("email, name, status, created_at")
    .eq("coach_id", coach.id)
    .order("created_at", { ascending: false })
    .limit(15);
  console.log(`Leads for ${email} (${leads?.length ?? 0}):`);
  for (const l of leads ?? []) {
    console.log(`  ${(l.email ?? "—").padEnd(34)} ${(l.status ?? "").padEnd(12)} ${l.name ?? ""}`);
  }
  if (!leads?.length) console.log("  (none)");
}

main().catch((e) => { console.error(e); process.exit(1); });
