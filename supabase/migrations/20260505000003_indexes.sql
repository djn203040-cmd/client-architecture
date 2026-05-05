-- Performance indexes — verbatim from RESEARCH.md Pattern 5 §Indexes
-- All use IF NOT EXISTS for idempotency (safe to re-run)

CREATE INDEX IF NOT EXISTS leads_coach_id_status
  ON leads(coach_id, status);

CREATE INDEX IF NOT EXISTS leads_coach_id_email
  ON leads(coach_id, email);

CREATE INDEX IF NOT EXISTS lead_events_lead_id
  ON lead_events(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS drafts_coach_id_status
  ON drafts(coach_id, status);

CREATE INDEX IF NOT EXISTS drafts_lead_id
  ON drafts(lead_id);

CREATE INDEX IF NOT EXISTS sequences_lead_id
  ON sequences(lead_id, status);

CREATE INDEX IF NOT EXISTS email_events_lead_id
  ON email_events(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS calendar_events_external
  ON calendar_events(provider, external_event_id);
