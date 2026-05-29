-- 2026-05-30 — Fix Vault secret re-store (reconnect) path
--
-- All five secret-store helpers updated an existing secret with a direct
-- `UPDATE vault.secrets SET secret = ...`. The SECURITY DEFINER role is NOT
-- granted UPDATE on vault.secrets, so that path fails with
-- `42501: permission denied for table secrets`. It was never hit before
-- because it only triggers on a *re-store* (e.g. reconnecting Gmail after a
-- first connect) — first connects take the create_secret() branch, which works.
--
-- Fix: use Supabase Vault's supported `vault.update_secret(secret_id, new_secret)`
-- helper instead of a direct UPDATE. CREATE OR REPLACE preserves existing grants.

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
  SELECT id INTO v_vault_id FROM vault.secrets WHERE name = v_secret_name;
  IF v_vault_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_vault_id, p_tokens::text);
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

CREATE OR REPLACE FUNCTION private.store_slack_token(
  p_coach_id UUID,
  p_token    TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_secret_name TEXT;
  v_vault_id    UUID;
  v_existing_id UUID;
BEGIN
  v_secret_name := 'slack_bot_token_' || p_coach_id::text;

  SELECT id INTO v_existing_id FROM vault.secrets WHERE name = v_secret_name;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_token);
    RETURN v_existing_id;
  END IF;

  SELECT vault.create_secret(
    p_token,
    v_secret_name,
    'Slack bot token for coach ' || p_coach_id::text
  ) INTO v_vault_id;

  RETURN v_vault_id;
END;
$$;

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
    PERFORM vault.update_secret(v_vault_id, p_corpus::text);
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

CREATE OR REPLACE FUNCTION private.store_calendar_tokens(
  p_coach_id UUID,
  p_provider integration_provider,
  p_tokens JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_vault_id UUID;
  v_secret_name TEXT := 'calendar_tokens_' || p_provider::text || '_' || p_coach_id::text;
BEGIN
  IF p_provider NOT IN ('calendly', 'cal_com', 'acuity', 'setmore', 'square', 'ms_bookings', 'tidycal') THEN
    RAISE EXCEPTION 'store_calendar_tokens: provider % is not a calendar provider', p_provider;
  END IF;

  SELECT id INTO v_vault_id FROM vault.secrets WHERE name = v_secret_name;

  IF v_vault_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_vault_id, p_tokens::text);
  ELSE
    SELECT vault.create_secret(
      p_tokens::text,
      v_secret_name,
      'Calendar tokens (' || p_provider::text || ') for coach ' || p_coach_id::text
    ) INTO v_vault_id;
  END IF;

  RETURN v_vault_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.store_calendar_webhook_secret(
  p_coach_id UUID,
  p_provider integration_provider,
  p_secret TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_vault_id UUID;
  v_secret_name TEXT := 'calendar_webhook_' || p_provider::text || '_' || p_coach_id::text;
BEGIN
  SELECT id INTO v_vault_id FROM vault.secrets WHERE name = v_secret_name;
  IF v_vault_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_vault_id, p_secret);
  ELSE
    SELECT vault.create_secret(
      p_secret,
      v_secret_name,
      'Webhook signing secret (' || p_provider::text || ') for coach ' || p_coach_id::text
    ) INTO v_vault_id;
  END IF;
  RETURN v_vault_id;
END;
$$;

-- 2026-05-30: All five secret re-store paths now use vault.update_secret().
