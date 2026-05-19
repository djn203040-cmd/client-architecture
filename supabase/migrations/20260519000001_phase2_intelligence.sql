-- Phase 2 Intelligence: AI lead description columns, zoom integration provider, transcripts realtime
-- D-17, D-22: AI lead description on leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary_protected BOOLEAN NOT NULL DEFAULT false;

-- RESEARCH.md Open Question 2: zoom transcript provider needs an enum value
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'zoom';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'fireflies';

-- RESEARCH.md Open Question 3: transcripts table in realtime publication for live unmatched queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;
