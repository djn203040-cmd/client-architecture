-- Phase 3 Automation: sequence config per coach, pending actions, email event index
-- D-05: Per-coach sequence cadence config (locked decision)
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS sequence_config JSONB DEFAULT
    '{"no_show_delays":[1,3,7,14,21],"call_completed_delays":[1,4,10]}';

-- GMAIL-008: Index for reply detection via In-Reply-To header matching
-- email_events.gmail_message_id already exists — add composite index for fast lookup
CREATE INDEX IF NOT EXISTS idx_email_events_gmail_message_id
  ON email_events(coach_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

-- pending_actions: call follow-up cards + lead intake prompt cards (D-09, D-10, D-22)
-- Derived from sequences and calendar events; this table surfaces coach action items
CREATE TABLE IF NOT EXISTS pending_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  type            TEXT NOT NULL, -- 'call_follow_up' | 'lead_intake'
  payload         JSONB DEFAULT '{}',
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: pending_actions scoped to coach_id
ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_actions_coach_select"
  ON pending_actions FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "pending_actions_coach_insert"
  ON pending_actions FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "pending_actions_coach_update"
  ON pending_actions FOR UPDATE
  USING (coach_id = auth.uid());
