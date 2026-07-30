/**
 * RLS pen-test.
 *
 * Confirms that every public table:
 *   1. Has RLS enabled in migrations
 *   2. Has at least one policy scoped by coach_id (or coaches.id for the
 *      self-referential table) or explicit deny-all (webhook_events).
 *
 * Live cross-tenant pen-test (sign in as coach A, attempt to read coach B's
 * leads) lives in tests/integration/cross-tenant-rls.test.ts where it runs
 * against the local Supabase instance. The static check here gates merges
 * even when CI cannot spin up Postgres.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../supabase/migrations");

let migrationsSql = "";

beforeAll(async () => {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const parts = await Promise.all(
    files.map((f) => readFile(path.join(MIGRATIONS_DIR, f), "utf8")),
  );
  migrationsSql = parts.join("\n");
});

/**
 * Tables that are intentionally not coach-scoped (singleton / cross-tenant
 * server-internal). Each requires an explicit deny-all RLS policy.
 */
const NON_COACH_SCOPED_DENY_ALL = new Set<string>(["webhook_events"]);

/**
 * Tables expected to exist in public schema. Drives the coverage assertion, 
 * adding a new table will fail this test unless explicitly listed.
 */
const EXPECTED_TABLES = [
  "coaches",
  "integrations",
  "leads",
  "lead_events",
  "sequences",
  "drafts",
  "draft_edits",
  "transcripts",
  "email_events",
  "calendar_events",
  "notification_log",
  "pending_actions",
  "notification_preferences",
  "consumed_tokens",
  "audit_log",
  "webhook_events",
] as const;

describe("RLS pen-test (static schema)", () => {
  it("every expected table has CREATE TABLE statement in migrations", () => {
    for (const t of EXPECTED_TABLES) {
      const re = new RegExp(`CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?${t}\\b`, "i");
      expect(migrationsSql, `missing CREATE TABLE for ${t}`).toMatch(re);
    }
  });

  it("every expected table has ENABLE ROW LEVEL SECURITY", () => {
    for (const t of EXPECTED_TABLES) {
      const re = new RegExp(`ALTER TABLE\\s+${t}\\s+ENABLE ROW LEVEL SECURITY`, "i");
      expect(migrationsSql, `RLS not enabled on ${t}`).toMatch(re);
    }
  });

  it("every coach-scoped table has a coach_id-bound or self-id policy", () => {
    for (const t of EXPECTED_TABLES) {
      if (NON_COACH_SCOPED_DENY_ALL.has(t)) continue;
      const policiesForTable = new RegExp(
        `CREATE POLICY\\s+\"[^\"]+\"\\s+ON\\s+${t}\\b[\\s\\S]*?(?=CREATE\\s|ALTER TABLE\\s|DO\\s|$)`,
        "gi",
      );
      const matches = migrationsSql.match(policiesForTable) ?? [];
      expect(matches.length, `no policies defined on ${t}`).toBeGreaterThan(0);

      const joined = matches.join("\n");
      // Accept both `auth.uid()` and `(SELECT auth.uid())` forms.
      const isSelfScoped = /\bid\s*=\s*\(?\s*(?:SELECT\s+)?auth\.uid\(\)/i.test(joined);
      const isCoachScoped = /coach_id\s*=\s*\(?\s*(?:SELECT\s+)?auth\.uid\(\)/i.test(joined);
      expect(
        isSelfScoped || isCoachScoped,
        `policies on ${t} are not bound to auth.uid()`,
      ).toBe(true);
    }
  });

  it("non-coach-scoped tables have explicit deny-all policy", () => {
    for (const t of NON_COACH_SCOPED_DENY_ALL) {
      const re = new RegExp(
        `CREATE POLICY[^;]+ON\\s+${t}[^;]+USING\\s*\\(\\s*false\\s*\\)`,
        "i",
      );
      expect(migrationsSql, `no deny-all policy on ${t}`).toMatch(re);
    }
  });

  it("no public.* table contains a plaintext token/secret column", () => {
    // Scan every CREATE TABLE block in public schema. Allowed names contain
    // `vault` (e.g. vault_secret_id) which is a UUID reference, not the secret.
    const tableBlocks = migrationsSql.matchAll(
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_]+)\s*\(([\s\S]*?)\n\)\s*;/gi,
    );
    const forbidden = /\b(access_token|refresh_token|api_key|client_secret|password)\b\s+(text|varchar|bytea)/i;
    for (const block of tableBlocks) {
      const [, tableName, body] = block;
      // Skip vault internals
      if (!tableName) continue;
      if (tableName.startsWith("vault_")) continue;
      // Allow `*_vault_id`, `*_secret_id` UUID references, they hold UUIDs.
      const sanitized = (body ?? "").replace(/\w+_(vault|secret)_id\s+UUID/gi, "");
      expect(forbidden.test(sanitized), `${tableName} has a plaintext token column`).toBe(false);
    }
  });

  it("coach FK constraints all use ON DELETE CASCADE (GDPR delete safety)", () => {
    // Every line referencing coaches(id) MUST end with ON DELETE CASCADE.
    const fkLines = migrationsSql.match(/REFERENCES\s+coaches\s*\([^)]+\)[^,\n]*/gi) ?? [];
    expect(fkLines.length, "expected at least one FK to coaches(id)").toBeGreaterThan(0);
    const violators = fkLines.filter((l) => !/ON DELETE CASCADE/i.test(l));
    expect(violators, `FKs missing CASCADE: ${violators.join(" | ")}`).toEqual([]);
  });

  it("voice corpus encryption helpers live in private schema (service_role only)", () => {
    expect(migrationsSql).toMatch(/CREATE OR REPLACE FUNCTION\s+private\.store_voice_corpus/i);
    expect(migrationsSql).toMatch(/CREATE OR REPLACE FUNCTION\s+private\.get_voice_corpus/i);
    expect(migrationsSql).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+private\.store_voice_corpus[^;]+TO\s+service_role/i,
    );
  });

  it("audit_log enforces no-client-write policy", () => {
    expect(migrationsSql).toMatch(
      /CREATE POLICY[^;]+ON\s+audit_log[^;]+FOR\s+INSERT[^;]+WITH\s+CHECK\s*\(\s*false\s*\)/i,
    );
  });
});

/**
 * #140: RLS scopes the coaches row, but WHICH columns a coach may write is a
 * column-level GRANT. These assertions are the guard rail: adding a
 * server-owned column to that GRANT should fail the build, not ship quietly.
 */
describe("coaches column-level UPDATE grant (#140)", () => {
  /** Columns a signed-in coach may write directly (Settings > Profile). */
  const COACH_WRITABLE = [
    "display_name",
    "role_title",
    "language",
    "timezone",
    "working_hours",
    "email_signature",
    "public_booking_url",
  ];

  /** Columns the server must own. A coach writing these bypasses an API gate. */
  const SERVER_OWNED = [
    "autonomous_mode",
    "onboarding_progress",
    "onboarding_completed_at",
    "avatar_url",
    "voice_model",
    "sales_toolkit",
    "sequence_config",
    "service_info",
    "notification_settings",
    "active_calendar_provider",
    "role",
    "email",
    "name",
    "id",
  ];

  /** The final `GRANT UPDATE (...) ON public.coaches TO authenticated` column list. */
  function grantedColumns(): string[] {
    const matches = [
      ...migrationsSql.matchAll(
        /GRANT\s+UPDATE\s*\(([\s\S]*?)\)\s*ON\s+(?:public\.)?coaches\s+TO\s+authenticated/gi,
      ),
    ];
    expect(matches.length, "no column-restricted GRANT UPDATE on coaches found").toBeGreaterThan(0);
    return (matches.at(-1)![1] ?? "")
      .split(",")
      .map((c) => c.trim().replace(/--.*$/gm, "").trim())
      .filter(Boolean);
  }

  it("revokes the blanket table-wide UPDATE from anon and authenticated", () => {
    for (const role of ["anon", "authenticated"]) {
      const re = new RegExp(
        `REVOKE\\s+[^;]*UPDATE[^;]*ON\\s+(?:public\\.)?coaches\\s+FROM\\s+${role}`,
        "i",
      );
      expect(migrationsSql, `blanket UPDATE never revoked from ${role}`).toMatch(re);
    }
  });

  it("grants exactly the coach-writable profile columns", () => {
    expect(grantedColumns().sort()).toEqual([...COACH_WRITABLE].sort());
  });

  it("grants no server-owned column to authenticated", () => {
    const granted = new Set(grantedColumns());
    const leaked = SERVER_OWNED.filter((c) => granted.has(c));
    expect(leaked, `server-owned columns exposed to the browser: ${leaked.join(", ")}`).toEqual([]);
  });

  it("every granted column is writable through ProfilePatchSchema", async () => {
    // The profile route is the one coaches write with the RLS client. If a
    // column is granted but no validated route writes it, the grant is dead
    // surface area; if a route writes it but it isn't granted, saves 500.
    const settingsValidators = await readFile(
      path.resolve(__dirname, "../../../../packages/shared/src/validators/settings.ts"),
      "utf8",
    );
    const schemaBody = settingsValidators.match(
      /export const ProfilePatchSchema = z\.object\(\{([\s\S]*?)\n\}\);/,
    )?.[1];
    expect(schemaBody, "ProfilePatchSchema not found").toBeTruthy();
    for (const col of grantedColumns()) {
      expect(schemaBody, `${col} is granted but absent from ProfilePatchSchema`).toMatch(
        new RegExp(`^\\s*${col}:`, "m"),
      );
    }
  });
});
