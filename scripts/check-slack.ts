// Inspects a coach's Slack integration row + notification prefs.
// Usage: pnpm tsx scripts/check-slack.ts <coach-email>
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
if (!email) { console.error("Usage: pnpm tsx scripts/check-slack.ts <coach-email>"); process.exit(1); }

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

async function main(): Promise<void> {
  const { data: coach } = await admin.from("coaches").select("id, email").eq("email", email).maybeSingle();
  if (!coach) { console.error(`No coach for ${email}`); process.exit(1); }
  console.log(`Coach: ${coach.email} (${coach.id})`);

  const { data: integ } = await admin
    .from("integrations")
    .select("provider, status, external_account_id, vault_secret_id, scopes, error_message, metadata, last_checked_at, updated_at")
    .eq("coach_id", coach.id)
    .eq("provider", "slack")
    .maybeSingle();
  console.log("\n=== slack integration row ===");
  console.log(integ ? JSON.stringify(integ, null, 2) : "  (no slack row at all — OAuth never reached the upsert)");

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("event_type, channel, enabled")
    .eq("coach_id", coach.id)
    .eq("channel", "slack")
    .order("event_type");
  console.log("\n=== slack notification_preferences ===");
  for (const p of prefs ?? []) console.log(`  ${p.event_type.padEnd(22)} enabled=${p.enabled}`);
  if (!prefs?.length) console.log("  (none)");
}
main().catch((e) => { console.error(e); process.exit(1); });
