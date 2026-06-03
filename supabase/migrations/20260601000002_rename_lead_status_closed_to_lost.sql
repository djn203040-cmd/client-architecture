-- Rename the lead_status enum value 'closed' -> 'lost'.
-- ALTER TYPE ... RENAME VALUE updates the value in place, so every existing
-- leads.status = 'closed' row becomes 'lost' automatically.
-- (Historical JSONB event payloads, e.g. lead_events.payload->>'to' = 'closed',
--  are audit records and are intentionally left untouched.)
--
-- Idempotent: only renames if 'closed' still exists. The value was already
-- renamed on the production DB ahead of this migration being recorded, so this
-- guard makes the migration a safe no-op there while still applying cleanly to
-- any fresh environment that still has the old label.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lead_status'
      AND e.enumlabel = 'closed'
  ) THEN
    ALTER TYPE lead_status RENAME VALUE 'closed' TO 'lost';
  END IF;
END
$$;
