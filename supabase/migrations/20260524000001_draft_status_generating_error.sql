-- §2.3 fix: draft generation flow inserts status='generating' and updates to
-- status='error' on failure (see apps/web/app/api/drafts/generate/route.ts),
-- but neither value existed in the draft_status enum. Every Generate-draft
-- click failed with "Failed to create draft" because the INSERT was rejected
-- by Postgres before RLS was even evaluated.

ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'generating';
ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'error';
