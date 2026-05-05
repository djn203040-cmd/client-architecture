-- INFRA-001: RLS on every coach-owned table; FORCE applies even to table owner.
-- Service role bypasses RLS by design (ADMIN-005) — used in /api/admin/* only.

-- coaches table: uses id = auth.uid() (PK = auth.users.id, no coach_id column)
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_self_read" ON coaches
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "coaches_self_update" ON coaches
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
-- INSERT/DELETE on coaches is admin-only (service role bypasses RLS by design — ADMIN-005)

-- integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_integrations" ON integrations
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_leads" ON leads
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- lead_events
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_lead_events" ON lead_events
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- sequences
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_sequences" ON sequences
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- drafts
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_drafts" ON drafts
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- draft_edits (VOICE-006)
ALTER TABLE draft_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_edits FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_draft_edits" ON draft_edits
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- transcripts
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_transcripts" ON transcripts
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- email_events
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_email_events" ON email_events
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_calendar_events" ON calendar_events
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_notification_log" ON notification_log
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
