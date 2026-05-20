-- Phase 4 / 2026-05-20 — Approval schema additions (D-25 + B-5 amendment to D-26)
-- Adds: drafts.followup_count, drafts.review_token_nonce,
--       notification_channel 'dashboard' value,
--       notification_preferences table, consumed_tokens table,
--       notification_log.payload column

-- 0) Extend notification_channel enum to include 'dashboard'
--    Dashboard is an internal delivery channel not part of the transport-layer enum,
--    but storing it in notification_preferences requires it in the enum.
ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'dashboard';

-- 1) drafts.followup_count — tracks how many follow-up CTAs have been sent
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS followup_count INTEGER NOT NULL DEFAULT 0;

-- 2) drafts.review_token_nonce — single-use nonce for email review links (D-10)
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS review_token_nonce UUID DEFAULT gen_random_uuid();

-- 3) notification_preferences — per-coach, per-event, per-channel opt-in/out
CREATE TABLE IF NOT EXISTS notification_preferences (
  coach_id      UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN ('draft_ready', 'lead_replied', 'integration_broken', 'hard_bounce')),
  channel       notification_channel NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (coach_id, event_type, channel)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_coach_select"
  ON notification_preferences FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "notification_preferences_coach_insert"
  ON notification_preferences FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "notification_preferences_coach_update"
  ON notification_preferences FOR UPDATE
  USING (coach_id = auth.uid());

CREATE POLICY "notification_preferences_coach_delete"
  ON notification_preferences FOR DELETE
  USING (coach_id = auth.uid());

CREATE INDEX IF NOT EXISTS notification_preferences_lookup_idx
  ON notification_preferences(coach_id, event_type)
  WHERE enabled = true;

-- 4) notification_log.payload — JSONB payload for dashboard channel Realtime delivery (B-5 / 04-07)
--    Amends D-26: one column added; no existing column altered, dropped, or renamed.
ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}';

-- 5) consumed_tokens — single-use review-link nonce audit log (D-10)
CREATE TABLE IF NOT EXISTS consumed_tokens (
  token_id      UUID PRIMARY KEY,
  coach_id      UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  draft_id      UUID REFERENCES drafts(id) ON DELETE CASCADE,
  action        TEXT NOT NULL CHECK (action IN ('approve', 'hold', 'view')),
  consumed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE consumed_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consumed_tokens_coach_select"
  ON consumed_tokens FOR SELECT
  USING (coach_id = auth.uid());
-- No INSERT policy for coach role — inserts via service_role through consume_review_token RPC only

CREATE INDEX IF NOT EXISTS consumed_tokens_draft_id_idx ON consumed_tokens(draft_id);

-- Phase 4 / 2026-05-20
-- Added: drafts.followup_count (INTEGER DEFAULT 0)
-- Added: drafts.review_token_nonce (UUID DEFAULT gen_random_uuid())
-- Added: notification_channel enum value 'dashboard'
-- Created: notification_preferences (PK: coach_id, event_type, channel) + RLS
-- Added: notification_log.payload (JSONB DEFAULT '{}')
-- Created: consumed_tokens (PK: token_id) + RLS (SELECT only for coach)
