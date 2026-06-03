-- Phase 7 / 2026-06-03 — Call Outcomes module data foundation (D-05..D-09).
-- New table call_outcomes (mirrors drafts), two lifecycle/outcome enums, the
-- 'call_converted' timeline event, FORCE RLS scoped to coach_id, and the
-- record_call_outcome_atomic advisory-lock CAS RPC (structural copy of
-- approve_draft_atomic in 20260520000002).

-- ===========================================================
-- 1) Enums — lifecycle (status) separate from chosen outcome (value), D-06
-- ===========================================================
CREATE TYPE call_outcome_status AS ENUM ('scheduled', 'awaiting_outcome', 'resolved', 'cancelled');
CREATE TYPE call_outcome_value  AS ENUM ('no_show', 'completed', 'converted');

-- ===========================================================
-- 2) Timeline event extension (D-07).
--    Note: nothing in THIS migration uses the new value, so adding it here is
--    safe — Postgres only forbids USING a freshly-added enum value inside the
--    same transaction, not adding it. The value is consumed by app writes and
--    by later migrations/functions (LEAD_CONVERTED downstream).
-- ===========================================================
ALTER TYPE lead_event_type ADD VALUE IF NOT EXISTS 'call_converted';

-- ===========================================================
-- 3) Table (D-05)
-- ===========================================================
CREATE TABLE call_outcomes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  calendar_event_id UUID REFERENCES calendar_events(id),
  provider          integration_provider NOT NULL,
  external_event_id TEXT NOT NULL,
  scheduled_at      TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  status            call_outcome_status NOT NULL DEFAULT 'scheduled',
  outcome           call_outcome_value,           -- null until resolved
  prompted_at       TIMESTAMPTZ,
  reminder_sent_at  TIMESTAMPTZ,
  decided_at        TIMESTAMPTZ,
  decided_via       TEXT,                          -- 'dashboard'|'slack'|'lead_profile'|'provider'|'auto'
  decided_by        TEXT,
  status_locked_at  TIMESTAMPTZ,                   -- advisory-lock CAS marker (mirror drafts)
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT call_outcomes_dedup UNIQUE (coach_id, external_event_id)
);

-- ===========================================================
-- 4) Indexes — queue filtering + poller (D-14)
-- ===========================================================
CREATE INDEX idx_call_outcomes_coach_status ON call_outcomes (coach_id, status);
CREATE INDEX idx_call_outcomes_lead         ON call_outcomes (lead_id);
-- Partial index for the resilience poller: scheduled rows not yet prompted.
CREATE INDEX idx_call_outcomes_poller
  ON call_outcomes (ends_at)
  WHERE status = 'scheduled' AND prompted_at IS NULL;

-- ===========================================================
-- 5) RLS (D-08) — single-policy FORCE, mirror drafts (20260505000004)
-- ===========================================================
ALTER TABLE call_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_outcomes FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_call_outcomes" ON call_outcomes
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- ===========================================================
-- 6) Atomic resolve RPC (D-09) — advisory-lock CAS on status='awaiting_outcome'.
--    Direct structural copy of private.approve_draft_atomic (20260520000002).
-- ===========================================================
CREATE OR REPLACE FUNCTION private.record_call_outcome_atomic(
  p_id      UUID,
  p_outcome call_outcome_value,
  p_actor   TEXT  -- 'dashboard' | 'slack' | 'lead_profile' | 'provider' | 'auto'
)
RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status call_outcome_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_lock_ok        BOOLEAN;
  v_current_status call_outcome_status;
BEGIN
  v_lock_ok := pg_try_advisory_xact_lock(hashtextextended(p_id::text, 0));
  IF NOT v_lock_ok THEN
    RETURN QUERY SELECT false, 'concurrent_attempt'::TEXT, NULL::call_outcome_status;
    RETURN;
  END IF;

  SELECT status INTO v_current_status FROM call_outcomes WHERE id = p_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, NULL::call_outcome_status;
    RETURN;
  END IF;

  IF v_current_status <> 'awaiting_outcome' THEN
    RETURN QUERY SELECT false, ('not_awaiting:' || v_current_status::TEXT)::TEXT, v_current_status;
    RETURN;
  END IF;

  UPDATE call_outcomes
    SET status           = 'resolved',
        outcome          = p_outcome,
        decided_at       = now(),
        decided_via      = p_actor,
        status_locked_at = now(),
        updated_at       = now()
    WHERE id = p_id;

  RETURN QUERY SELECT true, ('resolved_by:' || p_actor)::TEXT, 'resolved'::call_outcome_status;
END;
$$;

REVOKE ALL ON FUNCTION private.record_call_outcome_atomic(UUID, call_outcome_value, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.record_call_outcome_atomic(UUID, call_outcome_value, TEXT) TO service_role;

-- ===========================================================
-- 7) Public wrapper (mirror 20260520000003) — PostgREST only exposes public.
-- ===========================================================
CREATE OR REPLACE FUNCTION record_call_outcome_atomic(
  p_id      UUID,
  p_outcome call_outcome_value,
  p_actor   TEXT
)
RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status call_outcome_status)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$ SELECT ok, reason, new_status FROM private.record_call_outcome_atomic(p_id, p_outcome, p_actor) $$;

REVOKE ALL ON FUNCTION record_call_outcome_atomic(UUID, call_outcome_value, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_call_outcome_atomic(UUID, call_outcome_value, TEXT) TO service_role;

-- Phase 7 / 2026-06-03
-- Created: call_outcome_status + call_outcome_value enums; lead_event_type += 'call_converted';
--          call_outcomes table (UNIQUE(coach_id, external_event_id)); 3 indexes;
--          FORCE RLS coaches_own_call_outcomes; private + public record_call_outcome_atomic.
