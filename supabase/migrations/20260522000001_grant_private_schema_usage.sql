-- GMAIL-OAUTH fix: the Gmail token callback calls private.store_gmail_tokens
-- via PostgREST (adminClient.schema("private").rpc(...)). The original vault
-- migration (20260505000005_vault.sql) granted EXECUTE on the functions to
-- service_role but never granted USAGE on the `private` schema itself.
-- Calling a function requires BOTH: USAGE on the schema + EXECUTE on the
-- function. Without schema USAGE, PostgREST returns 42501 "permission denied
-- for schema private" and Gmail OAuth fails at the token-storage step.
--
-- Only service_role gets USAGE. anon/authenticated are deliberately excluded
-- so the private RPCs stay unreachable from the browser (see the integration
-- test apps/web/tests/integration/vault.test.ts: "anon role cannot call
-- private RPC").

GRANT USAGE ON SCHEMA private TO service_role;
