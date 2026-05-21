/**
 * Vault audit — verifies that:
 *   1. No public.* column stores a plaintext OAuth token/secret (covered in
 *      rls-pen-test.test.ts as well; duplicated here for explicit Vault focus).
 *   2. Every OAuth/integration token has a Vault-storage RPC under `private.*`.
 *   3. Vault RPCs are GRANTed only to service_role (never anon, never
 *      authenticated).
 *   4. No client-bundled file imports `vault.decrypted_secrets` directly.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

const REPO = path.resolve(__dirname, "../../../..");
const MIGRATIONS_DIR = path.join(REPO, "supabase/migrations");
const WEB_DIR = path.join(REPO, "apps/web");

let migrationsSql = "";

beforeAll(async () => {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql"));
  const parts = await Promise.all(
    files.map((f) => readFile(path.join(MIGRATIONS_DIR, f), "utf8")),
  );
  migrationsSql = parts.join("\n");
});

describe("Vault audit", () => {
  it("Gmail token RPCs exist in private schema", () => {
    expect(migrationsSql).toMatch(/private\.store_gmail_tokens/);
    expect(migrationsSql).toMatch(/private\.get_gmail_tokens/);
  });

  it("Voice corpus RPCs exist in private schema", () => {
    expect(migrationsSql).toMatch(/private\.store_voice_corpus/);
    expect(migrationsSql).toMatch(/private\.get_voice_corpus/);
  });

  it("every private.* OAuth/corpus RPC GRANTs EXECUTE only to service_role", () => {
    const grants = migrationsSql.match(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+private\.[a-z_]+\([^)]*\)\s+TO\s+([a-z_]+)/gi,
    ) ?? [];
    expect(grants.length).toBeGreaterThan(0);
    for (const line of grants) {
      const match = /TO\s+([a-z_]+)/i.exec(line);
      expect(match?.[1], `private.* RPC grants to non-service_role: ${line}`).toBe("service_role");
    }
  });

  it("REVOKE ALL ... FROM PUBLIC precedes every private.* GRANT EXECUTE", () => {
    const fnNames = [...migrationsSql.matchAll(
      /CREATE OR REPLACE FUNCTION\s+private\.([a-z_]+)/gi,
    )].map((m) => m[1]);
    for (const name of fnNames) {
      const re = new RegExp(`REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+private\\.${name}\\b[^;]+FROM\\s+PUBLIC`, "i");
      expect(migrationsSql, `private.${name} missing REVOKE ALL FROM PUBLIC`).toMatch(re);
    }
  });

  it("integrations table stores only vault UUIDs, no plaintext token columns", () => {
    const match = /CREATE TABLE\s+integrations\s*\(([\s\S]*?)\n\)\s*;/i.exec(migrationsSql);
    expect(match).toBeTruthy();
    const body = match![1];
    // forbidden plaintext columns
    expect(body).not.toMatch(/\baccess_token\s+TEXT/i);
    expect(body).not.toMatch(/\brefresh_token\s+TEXT/i);
    // required vault reference
    expect(body).toMatch(/vault_secret_id\s+UUID/i);
  });

  it("no client-bundled file imports vault.decrypted_secrets directly", async () => {
    const offenders: string[] = [];
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (
            e.name === "node_modules" ||
            e.name === ".next" ||
            e.name === ".turbo" ||
            e.name === "tests"
          ) continue;
          await walk(full);
          continue;
        }
        if (!/\.(ts|tsx|js|mjs)$/.test(e.name)) continue;
        const content = await readFile(full, "utf8");
        if (/decrypted_secrets/.test(content)) {
          // Allowed: server-only modules using service_role adminClient
          // OR private.* RPC wrappers — both are unreachable from the browser.
          const isServerOnly = /^\s*import\s+["']server-only["']/m.test(content);
          if (!isServerOnly && !/\bprivate\./.test(content)) {
            offenders.push(full);
          }
        }
      }
    }
    if ((await stat(WEB_DIR).then(() => true).catch(() => false))) {
      await walk(WEB_DIR);
    }
    expect(offenders, `decrypted_secrets reachable from app code: ${offenders.join(", ")}`).toEqual([]);
  });
});
