// One-off (D-16): backfill notification_preferences rows for the new
// `call_outcome_pending` event for every already-seeded coach. Without this,
// computeEnabledChannels default-denies every channel and no coach receives the
// interactive Slack/email call-outcome prompt. Idempotent (ignoreDuplicates).
// Run from repo root: pnpm tsx scripts/backfill-call-outcome-prefs.ts
// Reads env from apps/web/.env.local.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function loadEnv(path: string): void {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envCandidates = [
  resolve(repoRoot, "apps/web/.env.local"),
  resolve(repoRoot, ".env.local"),
];
for (const p of envCandidates) {
  if (existsSync(p)) {
    loadEnv(p);
    break;
  }
}

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

// Must match DEFAULT_MATRIX in apps/web/lib/notifications/seed-preferences.ts.
const CHANNEL_DEFAULTS: Array<{ channel: string; enabled: boolean }> = [
  { channel: "dashboard", enabled: true },
  { channel: "email", enabled: true },
  { channel: "slack", enabled: true },
  { channel: "whatsapp", enabled: true },
  { channel: "sms", enabled: false },
];

async function main(): Promise<void> {
  const { data: coaches, error: coachesErr } = await admin
    .from("coaches")
    .select("id, email");
  if (coachesErr) throw coachesErr;

  if (!coaches || coaches.length === 0) {
    console.log("No coaches found. Nothing to do.");
    return;
  }

  console.log(`Backfilling call_outcome_pending prefs for ${coaches.length} coach(es).`);

  const rows = coaches.flatMap((c) =>
    CHANNEL_DEFAULTS.map((d) => ({
      coach_id: c.id,
      event_type: "call_outcome_pending" as const,
      channel: d.channel,
      enabled: d.enabled,
    })),
  );

  const { data, error } = await admin
    .from("notification_preferences")
    .upsert(rows, {
      onConflict: "coach_id,event_type,channel",
      ignoreDuplicates: true,
    })
    .select("coach_id");

  if (error) throw error;

  console.log(`Inserted ${data?.length ?? 0} new row(s) (existing rows left untouched).`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
