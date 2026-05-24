-- Adds the coaches.notification_settings JSONB column. The onboarding step
-- page, the complete-step notifications gate, and the onboarding E2E test all
-- reference coaches.notification_settings, but no migration ever created it.
-- A SELECT touching the missing column fails with 42703, the whole coach row
-- read returns null, onboarding_progress reads as empty, and the wizard bounces
-- the coach back to step 1.
--
-- Holds onboarding/notification flags such as { dashboard_only_acknowledged }.

ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
