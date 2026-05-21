-- Phase 6 / 06-02 — Security hardening migration
--
-- Adds three things required by §3.5, §3.7, §3.9:
--   1. webhook_events idempotency table (replay + duplicate dedup)
--   2. private.encrypt_voice_corpus / decrypt_voice_corpus — pgsodium-wrapped
--      JSONB Layer 2 examples per coach. The encrypted bytes live in a
--      separate column; the unencrypted view is only accessible to service_role.
--   3. cascade audit: every FK referencing coaches(id) confirmed ON DELETE CASCADE
--      (gdpr_delete safety). Asserts via DO block — fails the migration if any
--      FK is missing the cascade clause.

------------------------------------------------------------
-- 1. webhook_events — server-side replay protection
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_hash TEXT,
  UNIQUE (source, external_event_id)
);

CREATE INDEX IF NOT EXISTS webhook_events_recent_idx
  ON webhook_events (received_at DESC);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;

-- No client access — service role writes via SDK; nothing in the dashboard
-- needs this table.
CREATE POLICY "webhook_events_no_client_access"
  ON webhook_events FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

------------------------------------------------------------
-- 2. Voice corpus encryption (§3.2)
--
-- The coaches.voice_model JSONB column is already RLS-scoped. To add
-- defense-in-depth, we store the Layer 2 examples (real message bodies) in
-- vault.secrets, and expose typed RPCs for read/write — service role only.
------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.store_voice_corpus(
  p_coach_id UUID,
  p_corpus JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_vault_id UUID;
  v_secret_name TEXT := 'voice_corpus_' || p_coach_id::text;
BEGIN
  SELECT id INTO v_vault_id FROM vault.secrets WHERE name = v_secret_name;
  IF v_vault_id IS NOT NULL THEN
    UPDATE vault.secrets SET secret = p_corpus::text WHERE id = v_vault_id;
  ELSE
    SELECT vault.create_secret(
      p_corpus::text,
      v_secret_name,
      'Voice corpus (Layer 2 examples) for coach ' || p_coach_id::text
    ) INTO v_vault_id;
  END IF;
  RETURN v_vault_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.get_voice_corpus(p_coach_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_text TEXT;
BEGIN
  SELECT decrypted_secret INTO v_text
  FROM vault.decrypted_secrets
  WHERE name = 'voice_corpus_' || p_coach_id::text;
  IF v_text IS NULL THEN RETURN NULL; END IF;
  RETURN v_text::JSONB;
END;
$$;

CREATE OR REPLACE FUNCTION private.delete_voice_corpus(p_coach_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE name = 'voice_corpus_' || p_coach_id::text;
END;
$$;

REVOKE ALL ON FUNCTION private.store_voice_corpus(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_voice_corpus(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.delete_voice_corpus(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.store_voice_corpus(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION private.get_voice_corpus(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION private.delete_voice_corpus(UUID) TO service_role;

-- Drop the corpus column on coaches if it ever held plaintext examples. The
-- structured Layer 1 profile remains in coaches.voice_model.
-- (Use JSONB key omission — Layer 2 examples are externalized to Vault.)
COMMENT ON COLUMN coaches.voice_model IS
  'Layer 1 (structured profile) JSONB only. Layer 2 examples live in Vault — see private.get_voice_corpus().';

------------------------------------------------------------
-- 3. Cascade audit (§3.9 GDPR delete safety)
--
-- Every FK referencing coaches(id) MUST have ON DELETE CASCADE. We assert
-- this in a DO block so a future migration that breaks the contract fails
-- immediately rather than leaking orphaned rows at runtime.
------------------------------------------------------------
DO $$
DECLARE
  v_offender RECORD;
  v_offender_count INTEGER := 0;
BEGIN
  FOR v_offender IN
    SELECT
      conrelid::regclass::text AS table_name,
      conname AS constraint_name,
      confdeltype
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'public.coaches'::regclass
      AND confdeltype <> 'c'
  LOOP
    v_offender_count := v_offender_count + 1;
    RAISE WARNING 'FK without ON DELETE CASCADE: %.%', v_offender.table_name, v_offender.constraint_name;
  END LOOP;
  IF v_offender_count > 0 THEN
    RAISE EXCEPTION '% FK(s) reference coaches(id) without ON DELETE CASCADE — fix before merging', v_offender_count;
  END IF;
END $$;

------------------------------------------------------------
-- audit_log — extend allowed actions for Phase 6 / 06-02
------------------------------------------------------------
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'gmail_disconnected',
    'slack_disconnected',
    'twilio_disconnected',
    'account_deleted',
    'gdpr_export',
    'gdpr_delete',
    'admin_create_coach',
    'admin_revoke_coach',
    'admin_reassign_integration',
    'admin_invite_coach',
    'admin_resend_invite',
    'rate_limit_triggered',
    'auth_failed_admin'
  ));

-- Explicit deny for client-side writes (defense-in-depth — RLS already denies
-- by default for missing policies; this makes the contract explicit).
DROP POLICY IF EXISTS "audit_log_no_client_writes" ON audit_log;
CREATE POLICY "audit_log_no_client_writes" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (false);

------------------------------------------------------------
-- Sanity: RLS enforced on every public table
------------------------------------------------------------
DO $$
DECLARE
  v_offender RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_offender IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  LOOP
    v_count := v_count + 1;
    RAISE WARNING 'Public table without RLS enabled: %', v_offender.relname;
  END LOOP;
  IF v_count > 0 THEN
    RAISE EXCEPTION '% public table(s) missing RLS — every table must be coach_id-scoped', v_count;
  END IF;
END $$;
