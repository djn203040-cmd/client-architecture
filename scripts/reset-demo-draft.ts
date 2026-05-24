// Deletes a coach's cached onboarding demo draft so StepFirstLead re-seeds it
// fresh on next load. Usage: pnpm tsx scripts/reset-demo-draft.ts <email>
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of [
  resolve(repoRoot, "apps/web/.env.local"),
  resolve(repoRoot, ".env.local"),
]) {
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
  console.error("Usage: pnpm tsx scripts/reset-demo-draft.ts <email>");
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
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!coach) {
    console.error(`No coach for ${email}`);
    process.exit(1);
  }

  const { data: deleted, error } = await admin
    .from("drafts")
    .delete()
    .eq("coach_id", coach.id)
    .eq("generation_context->>demo", "true")
    .select("id");
  if (error) throw error;

  console.log(
    `Deleted ${deleted?.length ?? 0} demo draft(s) for ${email}. ` +
      `StepFirstLead will regenerate on next load.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
