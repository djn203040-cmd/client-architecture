-- Per-coach UI + AI language. Chosen as the first onboarding step, editable later
-- in Settings. Drives the coach-facing UI locale AND the language every AI
-- generator writes drafts in. Backend code, logs and admin stay English.
-- Defaults to 'en' so every existing coach keeps today's behavior until they pick.
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'da'));
