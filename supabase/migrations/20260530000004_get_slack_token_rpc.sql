-- private.get_slack_token — SECURITY DEFINER read for the Slack bot token.
--
-- Bug fix: lib/slack/client.ts read the token via a direct PostgREST query
-- (adminClient.schema("vault").from("decrypted_secrets")), but the `vault` schema
-- is NOT exposed to PostgREST (only public, graphql_public, private are). Every
-- read failed with PGRST106 "Invalid schema: vault", so getSlackClientForCoach
-- always threw and NO Slack DM (welcome or draft_ready) could ever be sent in
-- production. The write side already used the correct definer-RPC pattern
-- (private.store_slack_token); this adds the matching reader, mirroring
-- private.get_gmail_tokens exactly.
CREATE OR REPLACE FUNCTION private.get_slack_token(
  p_coach_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'slack_bot_token_' || p_coach_id::text;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION private.get_slack_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_slack_token(UUID) TO service_role;
