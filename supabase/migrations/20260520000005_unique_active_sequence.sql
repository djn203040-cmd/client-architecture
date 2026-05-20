-- Enforce at-most-one active sequence per (coach_id, lead_id, track).
-- The Inngest sequence functions already cancel-then-create, so this index
-- catches any race that slips through and makes the invariant testable
-- directly via the admin client in E2E fixtures.
CREATE UNIQUE INDEX IF NOT EXISTS sequences_single_active_per_lead
  ON sequences(coach_id, lead_id, track)
  WHERE status = 'active';
