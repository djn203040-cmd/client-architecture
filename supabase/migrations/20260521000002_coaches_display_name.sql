-- Adds the missing display_name column referenced by the settings page and
-- ProfilePatchSchema. Without this, the settings query 400s and the page
-- redirects to /login (looked like a broken auth flow).

ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS display_name TEXT;
