// Promote an auth.users entry to admin by setting app_metadata.role = "admin".
// Usage: pnpm tsx scripts/promote-admin.ts <email>
// Also flips public.coaches.role to "admin" to keep both sides in sync.
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
for (const p of [
  resolve(repoRoot, "apps/web/.env.local"),
  resolve(repoRoot, ".env.local"),
]) {
  if (existsSync(p)) {
    loadEnv(p);
    break;
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm tsx scripts/promote-admin.ts <email>");
  process.exit(1);
}

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main(): Promise<void> {
  const { data: page, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw listErr;
  const user = page.users.find((u) => u.email === email);
  if (!user) {
    console.error(`No auth.users row for ${email}`);
    process.exit(1);
  }

  const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: "admin" },
  });
  if (metaErr) throw metaErr;
  console.log(`OK   ${email} -> app_metadata.role = "admin"`);

  const { error: coachErr } = await admin
    .from("coaches")
    .update({ role: "admin" })
    .eq("id", user.id);
  if (coachErr) {
    console.error(`WARN coaches.role update failed: ${coachErr.message}`);
  } else {
    console.log(`OK   ${email} -> coaches.role = "admin"`);
  }

  console.log("\nDone. Sign out and sign back in to refresh the JWT.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
