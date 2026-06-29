-- Durable fix for Supabase CLI v2.106.0's Data API grant-revoke (issue #66).
--
-- v2.106.0 flipped `[api].auto_expose_new_tables` to default false: local
-- start/reset now REVOKEs the default Data API privileges for public tables
-- and sequences. This codebase defines RLS policies on every table but never
-- granted table privileges explicitly — it relied entirely on the legacy
-- auto-expose default — so the revoke broke every PostgREST-backed path
-- ("permission denied for table leads", even with the service-role key).
--
-- PR #65 restored behavior via the deprecated `auto_expose_new_tables = true`
-- escape hatch (removed by Supabase 2026-10-30). This migration is the durable
-- replacement: explicit GRANTs that survive the revoke, so we no longer depend
-- on that flag or on pinning the CLI to a pre-v2.106 version.
--
-- Scope & safety:
--   * PUBLIC SCHEMA ONLY. The `private` schema stays service_role-only
--     (USAGE granted to service_role alone in 20260522000001) — untouched here.
--   * TABLES + SEQUENCES ONLY. Routines are deliberately excluded: the RPC
--     wrappers (20260520000003) REVOKE FROM PUBLIC + GRANT EXECUTE to
--     service_role on purpose; a blanket routine grant would undo that.
--   * Row access is still governed by RLS (policies are `TO authenticated`);
--     these grants only restore the Data API surface, matching what production
--     has held since the project was created under auto-expose.
--   * GRANT is additive — on the live project (grants already present) this is
--     a no-op; on a freshly-reset CI/dev DB it re-establishes them.

-- Existing objects ---------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;

-- Future objects -----------------------------------------------------------
-- Default privileges for objects created by the migration runner (postgres),
-- so later migrations' new tables/sequences are auto-granted without each
-- needing to repeat the GRANTs above.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES
  TO anon, authenticated, service_role;
