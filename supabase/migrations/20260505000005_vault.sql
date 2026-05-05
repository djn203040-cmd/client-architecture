-- INFRA-003: SECURITY DEFINER functions live in `private` schema (not `public`).
-- PostgREST exposes only `public` — `private` is unreachable from PostgREST.
-- GMAIL-003: Tokens stored encrypted in Vault; integrations table holds only the UUID reference.

CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Create private schema (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

-- Store Gmail tokens in Vault
CREATE OR REPLACE FUNCTION private.store_gmail_tokens(
  p_coach_id UUID,
  p_tokens JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_vault_id UUID;
  v_secret_name TEXT := 'gmail_tokens_' || p_coach_id::text;
BEGIN
  -- Upsert: update if exists, create if not
  SELECT id INTO v_vault_id FROM vault.secrets WHERE name = v_secret_name;

  IF v_vault_id IS NOT NULL THEN
    UPDATE vault.secrets SET secret = p_tokens::text WHERE id = v_vault_id;
  ELSE
    SELECT vault.create_secret(
      p_tokens::text,
      v_secret_name,
      'Gmail OAuth tokens for coach ' || p_coach_id::text
    ) INTO v_vault_id;
  END IF;

  RETURN v_vault_id;
END;
$$;

-- Retrieve Gmail tokens from Vault (service role only)
CREATE OR REPLACE FUNCTION private.get_gmail_tokens(
  p_coach_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_tokens TEXT;
BEGIN
  SELECT decrypted_secret INTO v_tokens
  FROM vault.decrypted_secrets
  WHERE name = 'gmail_tokens_' || p_coach_id::text;

  RETURN v_tokens::JSONB;
END;
$$;

-- Revoke public access — service role only via RPC
REVOKE ALL ON FUNCTION private.store_gmail_tokens(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_gmail_tokens(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.store_gmail_tokens(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION private.get_gmail_tokens(UUID) TO service_role;
