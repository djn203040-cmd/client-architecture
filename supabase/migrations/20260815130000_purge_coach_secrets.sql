-- Admin coach deletion: every Vault secret for a coach is named
-- '<kind>_..._<coach_id>' (gmail_tokens_, calendar_tokens_<provider>_,
-- calendar_webhook_<provider>_, slack_bot_token_, voice_corpus_). Deleting the
-- auth.users row cascades through public.coaches to every child table, but
-- vault.secrets has no FK, so the encrypted tokens would be orphaned. This
-- RPC removes them; called from lib/auth/delete-coach.ts before deleteUser.
CREATE OR REPLACE FUNCTION private.purge_coach_secrets(p_coach_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM vault.secrets
  WHERE name LIKE '%\_' || p_coach_id::text ESCAPE '\';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION private.purge_coach_secrets(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.purge_coach_secrets(UUID) TO service_role;
