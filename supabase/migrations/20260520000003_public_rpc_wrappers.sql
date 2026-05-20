-- Phase 4 / 2026-05-20 — Public-schema wrappers for private SECURITY DEFINER RPCs
-- PostgREST only exposes the public schema (PGRST106 if you call .schema("private")).
-- These thin wrappers live in public, delegate to private.*, and are callable only
-- by service_role (REVOKE FROM PUBLIC + GRANT TO service_role).

CREATE OR REPLACE FUNCTION approve_draft_atomic(p_draft_id UUID, p_actor TEXT)
RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status draft_status)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$ SELECT ok, reason, new_status FROM private.approve_draft_atomic(p_draft_id, p_actor) $$;

REVOKE ALL ON FUNCTION approve_draft_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_draft_atomic(UUID, TEXT) TO service_role;

-- --

CREATE OR REPLACE FUNCTION hold_draft_atomic(p_draft_id UUID, p_actor TEXT)
RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status draft_status)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$ SELECT ok, reason, new_status FROM private.hold_draft_atomic(p_draft_id, p_actor) $$;

REVOKE ALL ON FUNCTION hold_draft_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hold_draft_atomic(UUID, TEXT) TO service_role;

-- --

CREATE OR REPLACE FUNCTION consume_review_token(
  p_token_id UUID,
  p_coach_id UUID,
  p_draft_id UUID,
  p_action   TEXT
)
RETURNS TABLE (ok BOOLEAN, reason TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$ SELECT ok, reason FROM private.consume_review_token(p_token_id, p_coach_id, p_draft_id, p_action) $$;

REVOKE ALL ON FUNCTION consume_review_token(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_review_token(UUID, UUID, UUID, TEXT) TO service_role;

-- --

CREATE OR REPLACE FUNCTION store_slack_token(p_coach_id UUID, p_token TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$ SELECT private.store_slack_token(p_coach_id, p_token) $$;

REVOKE ALL ON FUNCTION store_slack_token(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION store_slack_token(UUID, TEXT) TO service_role;

-- --

CREATE OR REPLACE FUNCTION increment_followup_count(p_draft_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$ SELECT private.increment_followup_count(p_draft_id) $$;

REVOKE ALL ON FUNCTION increment_followup_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_followup_count(UUID) TO service_role;

-- Phase 4 / 2026-05-20
-- Fallback for PGRST106: public wrappers delegate to private.* functions.
-- All five wrappers: SECURITY DEFINER, REVOKE PUBLIC, GRANT service_role.
