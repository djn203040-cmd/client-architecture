-- Phase 7 / 2026-06-03 — Allow email-less placeholder leads (D-04).
-- Some calendar providers omit an invitee email. The Call Outcomes module must
-- still create the lead (deduped by phone) and flag it for enrichment via
-- leads.external_ids.email_pending = true. The existing NOT NULL on leads.email
-- blocks that, so relax it. UNIQUE(coach_id, email) is unaffected: Postgres
-- treats NULLs as distinct, so multiple email-pending leads coexist without
-- colliding on the unique key.
--
-- Idempotent / non-destructive: dropping a NOT NULL never rewrites or loses data.

ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;
