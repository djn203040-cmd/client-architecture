-- Phase 7 / 2026-06-03 — D-16: allow the `call_outcome_pending` event in
-- notification_preferences. The original CHECK (20260520000001_phase4_approval)
-- predates Call Outcomes, so it rejected the new event type and no coach could
-- receive the interactive Slack/email call-outcome prompt. Widen the constraint.
ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_event_type_check;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_event_type_check
  CHECK (event_type IN (
    'draft_ready',
    'lead_replied',
    'call_outcome_pending',
    'integration_broken',
    'hard_bounce'
  ));
