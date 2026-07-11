-- 2026-07-11 — Per-coach AI usage metering (pay-per-use billing foundation).
-- Every Anthropic call the ai-engine makes records one row here: which coach,
-- which operation, the model, token counts, and the computed USD cost. The
-- admin dashboard reads a per-coach rollup via coach_ai_usage_summary().
--
-- Writes come only from the service-role ai-engine (RLS is bypassed there).
-- RLS is FORCEd and scoped to coach_id so a coach can read only their own
-- usage; there is no INSERT/UPDATE/DELETE policy, so non-service clients cannot
-- mutate the ledger.

-- ===========================================================
-- 1) Table
-- ===========================================================
CREATE TABLE public.ai_usage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id            uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  -- draft_generate | draft_review | lead_description | voice_analysis
  operation           text NOT NULL,
  model               text NOT NULL,
  input_tokens        integer NOT NULL DEFAULT 0,
  output_tokens       integer NOT NULL DEFAULT 0,
  cache_read_tokens   integer NOT NULL DEFAULT 0,
  cache_write_tokens  integer NOT NULL DEFAULT 0,
  -- Cost in USD computed at write time from the model's per-token price, so a
  -- later price change never rewrites history. numeric(12,6) = fractions of a cent.
  cost_usd            numeric(12,6) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_coach_created_idx ON public.ai_usage (coach_id, created_at DESC);

-- ===========================================================
-- 2) RLS — coach reads own rows only; service role bypasses and does the writes
-- ===========================================================
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_select_own ON public.ai_usage
  FOR SELECT
  USING (coach_id = auth.uid());

-- Match the explicit Data API grants pattern used elsewhere (20260628000001).
GRANT SELECT ON public.ai_usage TO authenticated;

-- ===========================================================
-- 3) Per-coach rollup for the admin dashboard (this-month + all-time).
--    Called by the service-role admin client, which bypasses RLS.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.coach_ai_usage_summary()
RETURNS TABLE (
  coach_id      uuid,
  month_cost    numeric,
  month_input   bigint,
  month_output  bigint,
  total_cost    numeric,
  event_count   bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    u.coach_id,
    COALESCE(SUM(u.cost_usd) FILTER (WHERE u.created_at >= date_trunc('month', now())), 0),
    COALESCE(SUM(u.input_tokens) FILTER (WHERE u.created_at >= date_trunc('month', now())), 0),
    COALESCE(SUM(u.output_tokens) FILTER (WHERE u.created_at >= date_trunc('month', now())), 0),
    COALESCE(SUM(u.cost_usd), 0),
    COUNT(*)
  FROM public.ai_usage u
  GROUP BY u.coach_id;
$$;
