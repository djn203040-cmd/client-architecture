-- notification_log.event_type — written by every channel adapter (slack, sms,
-- whatsapp, dashboard) since Phase 4, but the column was never created in any
-- migration, so those inserts silently failed on prod (supabase-js returns
-- { error } and the adapters never checked it). Email was unaffected only
-- because its inserts omit the field. Restores: Slack message-ts logging
-- (required by syncSlackCallOutcomeMessage / syncSlackDraftMessage sync-back,
-- #77), dashboard realtime notification rows, sms/whatsapp bookkeeping.
--
-- Already applied to prod 2026-07-03 via MCP apply_migration as version
-- 20260703075238 (this file matches that version exactly — do not re-push).
ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS event_type TEXT;

-- Backs the sync-back lookup (coach_id, channel, event_type, status) used to
-- find the Slack ts for a resolved call outcome / draft.
CREATE INDEX IF NOT EXISTS idx_notification_log_sync_lookup
  ON notification_log (coach_id, channel, event_type, status);
