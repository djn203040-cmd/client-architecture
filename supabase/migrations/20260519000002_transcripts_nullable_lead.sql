-- 02-02: Make transcripts.lead_id nullable to support unmatched transcript queue
-- Unmatched transcripts (failed lead matching) are stored with lead_id = NULL
-- and appear in the coach's Unmatched tab for manual assignment.
ALTER TABLE transcripts ALTER COLUMN lead_id DROP NOT NULL;
