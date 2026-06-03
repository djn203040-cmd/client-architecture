-- Phase 7 / 2026-06-03 — Realtime for the Call Outcomes queue (D-08).
-- Adds call_outcomes to the realtime publication so the /calls queue and the
-- lead-profile panel update live, exactly like drafts (20260505000006).
-- RLS still filters every realtime row by coach_id = auth.uid().
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_outcomes;
