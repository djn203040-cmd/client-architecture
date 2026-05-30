-- integrations.external_account_id — the provider's external account/user identifier.
--
-- Schema/code drift fix: the application code has always referenced an
-- `external_account_id` column on `integrations` (the Slack callback writes the
-- authed Slack user id here; lib/notifications/channels/slack.ts reads it as the
-- DM target channel; app/api/webhooks/slack/interactivity reads it to post the
-- approval confirmation; several integration tests mock it as a real column).
-- But no migration ever created the column, so every Slack-connect upsert failed
-- with PGRST204 ("Could not find the 'external_account_id' column") — silently,
-- because the callback never checked the upsert error. Coaches saw `?connected=slack`
-- yet no integration row was ever written.
--
-- Additive, nullable, no backfill needed. Other providers (Gmail, Cal.com) simply
-- leave it NULL; the column is only read by the Slack channel/interactivity paths.
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS external_account_id TEXT;

COMMENT ON COLUMN integrations.external_account_id IS
  'Provider-side account/user id. Slack: the authed user id, used as the DM channel for notifications and approval confirmations.';
