// One-off: find auth.users without a public.coaches row and provision one.
// Run from repo root: pnpm tsx scripts/provision-orphan-coaches.ts
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

async function main(): Promise<void> {
  const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersErr) throw usersErr;

  const users = usersPage.users;
  console.log(`Found ${users.length} auth.users.`);

  const { data: coaches, error: coachesErr } = await admin
    .from("coaches")
    .select("id, email");
  if (coachesErr) throw coachesErr;

  const coachIds = new Set(coaches?.map((c) => c.id) ?? []);
  const orphans = users.filter((u) => !coachIds.has(u.id));

  if (orphans.length === 0) {
    console.log("No orphan auth users. Nothing to do.");
    return;
  }

  console.log(`\n${orphans.length} orphan(s) to provision:`);
  for (const u of orphans) {
    console.log(`  - ${u.email} (${u.id})`);
  }

  for (const u of orphans) {
    if (!u.email) {
      console.log(`  SKIP ${u.id} — no email`);
      continue;
    }
    const nameFromMeta =
      (u.user_metadata?.["name"] as string | undefined) ??
      (u.user_metadata?.["full_name"] as string | undefined) ??
      u.email.split("@")[0];

    const { error: insertErr } = await admin.from("coaches").insert({
      id: u.id,
      email: u.email,
      name: nameFromMeta,
    });
    if (insertErr) {
      console.error(`  FAIL ${u.email}: ${insertErr.message}`);
    } else {
      console.log(`  OK   ${u.email} -> coaches row created`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
