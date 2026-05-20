-- Phase 4 / 2026-05-20 — Advisory-lock RPCs (D-22, DRAFT-011)
-- Five SECURITY DEFINER functions in the private schema:
--   approve_draft_atomic, hold_draft_atomic, consume_review_token,
--   store_slack_token, increment_followup_count
-- All: REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO service_role

CREATE SCHEMA IF NOT EXISTS private;

-- ===========================================================
-- 1) approve_draft_atomic — CAS pending -> approved (D-22)
-- ===========================================================
CREATE OR REPLACE FUNCTION private.approve_draft_atomic(
  p_draft_id UUID,
  p_actor    TEXT  -- 'dashboard' | 'slack' | 'review_link' | 'mode_b' | 'reapprove'
)
RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status draft_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_lock_ok        BOOLEAN;
  v_current_status draft_status;
BEGIN
  v_lock_ok := pg_try_advisory_xact_lock(hashtextextended(p_draft_id::text, 0));
  IF NOT v_lock_ok THEN
    RETURN QUERY SELECT false, 'concurrent_attempt'::TEXT, NULL::draft_status;
    RETURN;
  END IF;

  SELECT status INTO v_current_status FROM drafts WHERE id = p_draft_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'draft_not_found'::TEXT, NULL::draft_status;
    RETURN;
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN QUERY SELECT false, ('not_pending:' || v_current_status::TEXT)::TEXT, v_current_status;
    RETURN;
  END IF;

  UPDATE drafts
    SET status = 'approved', approved_at = now(), status_locked_at = now()
    WHERE id = p_draft_id;

  RETURN QUERY SELECT true, ('approved_by:' || p_actor)::TEXT, 'approved'::draft_status;
END;
$$;

REVOKE ALL ON FUNCTION private.approve_draft_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.approve_draft_atomic(UUID, TEXT) TO service_role;

-- ===========================================================
-- 2) hold_draft_atomic — CAS pending -> held (D-17/D-22)
-- ===========================================================
CREATE OR REPLACE FUNCTION private.hold_draft_atomic(
  p_draft_id UUID,
  p_actor    TEXT  -- 'dashboard' | 'slack' | 'review_link' | 'hold_cascade'
)
RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status draft_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_lock_ok        BOOLEAN;
  v_current_status draft_status;
BEGIN
  v_lock_ok := pg_try_advisory_xact_lock(hashtextextended(p_draft_id::text, 0));
  IF NOT v_lock_ok THEN
    RETURN QUERY SELECT false, 'concurrent_attempt'::TEXT, NULL::draft_status;
    RETURN;
  END IF;

  SELECT status INTO v_current_status FROM drafts WHERE id = p_draft_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'draft_not_found'::TEXT, NULL::draft_status;
    RETURN;
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN QUERY SELECT false, ('not_pending:' || v_current_status::TEXT)::TEXT, v_current_status;
    RETURN;
  END IF;

  UPDATE drafts
    SET status = 'held', held_at = now(), status_locked_at = now()
    WHERE id = p_draft_id;

  RETURN QUERY SELECT true, ('held_by:' || p_actor)::TEXT, 'held'::draft_status;
END;
$$;

REVOKE ALL ON FUNCTION private.hold_draft_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.hold_draft_atomic(UUID, TEXT) TO service_role;

-- ===========================================================
-- 3) consume_review_token — single-use nonce enforcement (D-10)
-- ===========================================================
CREATE OR REPLACE FUNCTION private.consume_review_token(
  p_token_id  UUID,
  p_coach_id  UUID,
  p_draft_id  UUID,
  p_action    TEXT  -- 'approve' | 'hold'
)
RETURNS TABLE (ok BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_lock_ok        BOOLEAN;
  v_current_nonce  UUID;
BEGIN
  v_lock_ok := pg_try_advisory_xact_lock(hashtextextended(p_draft_id::text, 0));
  IF NOT v_lock_ok THEN
    RETURN QUERY SELECT false, 'concurrent_attempt'::TEXT;
    RETURN;
  END IF;

  SELECT review_token_nonce INTO v_current_nonce FROM drafts WHERE id = p_draft_id FOR UPDATE;

  IF v_current_nonce IS NULL OR v_current_nonce <> p_token_id THEN
    RETURN QUERY SELECT false, 'nonce_mismatch'::TEXT;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO consumed_tokens (token_id, coach_id, draft_id, action)
      VALUES (p_token_id, p_coach_id, p_draft_id, p_action);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'already_consumed'::TEXT;
    RETURN;
  END;

  -- Rotate nonce so the link cannot be replayed
  UPDATE drafts SET review_token_nonce = gen_random_uuid() WHERE id = p_draft_id;

  RETURN QUERY SELECT true, ('consumed_for:' || p_action)::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION private.consume_review_token(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.consume_review_token(UUID, UUID, UUID, TEXT) TO service_role;

-- ===========================================================
-- 4) store_slack_token — Vault write for Slack bot token
--    Mirrors store_gmail_tokens pattern from vault.sql
-- ===========================================================
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
    UPDATE vault.secrets SET secret = p_token WHERE id = v_existing_id;
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

REVOKE ALL ON FUNCTION private.store_slack_token(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.store_slack_token(UUID, TEXT) TO service_role;

-- ===========================================================
-- 5) increment_followup_count — atomic counter bump (B-3 / 04-07 follow-up CTA)
--    UPDATE...RETURNING is already atomic — no advisory lock needed.
-- ===========================================================
CREATE OR REPLACE FUNCTION private.increment_followup_count(p_draft_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE drafts
    SET followup_count = followup_count + 1
    WHERE id = p_draft_id
    RETURNING followup_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION private.increment_followup_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.increment_followup_count(UUID) TO service_role;

-- Phase 4 / 2026-05-20
-- Created: private.approve_draft_atomic (advisory-lock CAS pending->approved)
-- Created: private.hold_draft_atomic (advisory-lock CAS pending->held)
-- Created: private.consume_review_token (advisory-lock nonce consume + rotation)
-- Created: private.store_slack_token (Vault upsert for Slack bot token)
-- Created: private.increment_followup_count (atomic counter bump)
