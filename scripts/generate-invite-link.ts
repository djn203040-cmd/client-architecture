// Generate a Supabase invite link for an email without going through the
// rate-limited built-in SMTP. Use when testing the onboarding flow locally.
//
// Usage: pnpm tsx scripts/generate-invite-link.ts <email> [name]
//
// What it does:
//   1. Generates a one-time invite link via the Supabase admin API.
//   2. Creates the matching public.coaches row (mirrors inviteCoach() in
//      apps/web/lib/auth/invite-coach.ts) so the new coach isn't an orphan.
//   3. Prints the link to stdout — paste it into an incognito browser.
//
// The link only works once. If the coach row already exists for this email,
// the script skips the insert (idempotent).
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
const name = process.argv[3] ?? email?.split("@")[0];
if (!email) {
  console.error("Usage: pnpm tsx scripts/generate-invite-link.ts <email> [name]");
  process.exit(1);
}

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main(): Promise<void> {
  const redirectTo = `${appUrl}/invite/accept`;

  // generateLink works whether or not the user already exists — for "invite"
  // type, if the user doesn't exist Supabase creates them.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: email!,
    options: { redirectTo, data: { role: "coach", name } },
  });
  if (error || !data.user) {
    console.error("generateLink failed:", error?.message ?? "no user returned");
    process.exit(1);
  }

  // Ensure the coaches row exists (mirrors apps/web/lib/auth/invite-coach.ts).
  const { data: existing } = await admin
    .from("coaches")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!existing) {
    const { error: insertErr } = await admin.from("coaches").insert({
      id: data.user.id,
      email: email!,
      name,
      role: "coach",
    });
    if (insertErr) {
      console.error("coaches insert failed:", insertErr.message);
      // Roll back the auth user so we don't leave an orphan.
      await admin.auth.admin.deleteUser(data.user.id);
      process.exit(1);
    }
    console.log(`coaches row created for ${email}`);
  } else {
    console.log(`coaches row already exists for ${email} — reusing`);
  }

  const link = data.properties?.action_link;
  if (!link) {
    console.error("No action_link in response");
    process.exit(1);
  }
  console.log("\n=== Invite link (open in incognito) ===");
  console.log(link);
  console.log("=======================================\n");
  console.log("Single-use. Open in a fresh incognito window. Don't pre-fetch.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
