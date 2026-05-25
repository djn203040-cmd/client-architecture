-- 06-04 Task 1: Calendar integration scaffolding
-- Adds:
--   1. coaches.active_calendar_provider — soft "one calendar per coach" pointer.
--      Constrained to the 7 calendar provider enum values (gmail/slack/twilio/instagram excluded).
--   2. private.store_calendar_tokens / get_calendar_tokens / delete_calendar_tokens —
--      generic per-provider vault helpers, mirror of the Gmail pattern in 20260505000005_vault.sql.

-- ----- 1. coaches.active_calendar_provider -----

ALTER TABLE coaches
  ADD COLUMN active_calendar_provider integration_provider;

ALTER TABLE coaches
  ADD CONSTRAINT coaches_active_calendar_provider_is_calendar
  CHECK (active_calendar_provider IS NULL OR active_calendar_provider IN (
    'calendly', 'cal_com', 'acuity', 'setmore', 'square', 'ms_bookings', 'tidycal'
  ));

CREATE INDEX coaches_active_calendar_provider_idx
  ON coaches(active_calendar_provider)
  WHERE active_calendar_provider IS NOT NULL;

-- ----- 2. Generic calendar token vault helpers -----

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
    UPDATE vault.secrets SET secret = p_tokens::text WHERE id = v_vault_id;
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

CREATE OR REPLACE FUNCTION private.get_calendar_tokens(
  p_coach_id UUID,
  p_provider integration_provider
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
  WHERE name = 'calendar_tokens_' || p_provider::text || '_' || p_coach_id::text;
  RETURN v_tokens::JSONB;
END;
$$;

CREATE OR REPLACE FUNCTION private.delete_calendar_tokens(
  p_coach_id UUID,
  p_provider integration_provider
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_secret_name TEXT := 'calendar_tokens_' || p_provider::text || '_' || p_coach_id::text;
  v_deleted INT;
BEGIN
  DELETE FROM vault.secrets WHERE name = v_secret_name;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- Also a webhook-secret helper — for providers where the coach pastes our URL into their dashboard,
-- we generate a per-coach signing secret and store it in Vault, referenced by integrations.webhook_secret_vault_id.
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
    UPDATE vault.secrets SET secret = p_secret WHERE id = v_vault_id;
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

CREATE OR REPLACE FUNCTION private.get_calendar_webhook_secret(
  p_coach_id UUID,
  p_provider integration_provider
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'calendar_webhook_' || p_provider::text || '_' || p_coach_id::text;
  RETURN v_secret;
END;
$$;

-- Service role only
REVOKE ALL ON FUNCTION private.store_calendar_tokens(UUID, integration_provider, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_calendar_tokens(UUID, integration_provider) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.delete_calendar_tokens(UUID, integration_provider) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.store_calendar_webhook_secret(UUID, integration_provider, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_calendar_webhook_secret(UUID, integration_provider) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.store_calendar_tokens(UUID, integration_provider, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION private.get_calendar_tokens(UUID, integration_provider) TO service_role;
GRANT EXECUTE ON FUNCTION private.delete_calendar_tokens(UUID, integration_provider) TO service_role;
GRANT EXECUTE ON FUNCTION private.store_calendar_webhook_secret(UUID, integration_provider, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION private.get_calendar_webhook_secret(UUID, integration_provider) TO service_role;
