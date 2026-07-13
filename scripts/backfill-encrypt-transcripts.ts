// One-time backfill: encrypt any transcripts.content rows still stored as
// plaintext (rows written before app-level encryption was introduced).
//
// Safe to run repeatedly — already-encrypted rows (prefix `enc:v1:`) are skipped.
// Requires SUPABASE_SERVICE_ROLE_KEY and TRANSCRIPT_ENCRYPTION_KEY in the
// environment (loaded from apps/web/.env.local below), matching the key the app
// uses in production.
//
// Usage: pnpm tsx scripts/backfill-encrypt-transcripts.ts [--commit]
//   (dry-run by default; pass --commit to write)
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createCipheriv, randomBytes } from "node:crypto";

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

const PREFIX = "enc:v1:";
function encrypt(plaintext: string): string {
  const key = Buffer.from(process.env["TRANSCRIPT_ENCRYPTION_KEY"]!, "base64");
  if (key.length !== 32) throw new Error("TRANSCRIPT_ENCRYPTION_KEY must be 32 bytes (base64)");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ct].map((b) => b.toString("base64")).join(":");
}

const commit = process.argv.includes("--commit");

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

async function main(): Promise<void> {
  const { data, error } = await admin.from("transcripts").select("id, content");
  if (error) throw error;
  const rows = data ?? [];
  const plaintextRows = rows.filter(
    (r) => typeof r.content === "string" && r.content.length > 0 && !r.content.startsWith(PREFIX),
  );
  console.log(
    `transcripts: ${rows.length} total, ${plaintextRows.length} plaintext to encrypt` +
      (commit ? " (COMMIT)" : " (dry-run; pass --commit to write)"),
  );
  if (!commit) return;

  let done = 0;
  for (const r of plaintextRows) {
    const { error: upErr } = await admin
      .from("transcripts")
      .update({ content: encrypt(r.content as string) })
      .eq("id", r.id);
    if (upErr) {
      console.error(`  failed ${r.id}: ${upErr.message}`);
      continue;
    }
    done += 1;
  }
  console.log(`encrypted ${done}/${plaintextRows.length} rows`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
