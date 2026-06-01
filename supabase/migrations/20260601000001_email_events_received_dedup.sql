-- Reply-pipeline hardening: persist inbound replies as email_events rows
-- (event_type = 'received') and make reply detection idempotent.
--
-- Background: gmail/monitor.ts re-runs over overlapping startHistoryId windows,
-- so the same inbound message could fire LEAD_REPLIED multiple times (observed:
-- one message id firing 3×). It also never stored the lead's actual reply, so
-- generate-reply.ts had to re-derive it live from Gmail every time and often got
-- it wrong. We now store each inbound once; this partial unique index is what
-- makes "store-once" enforceable and lets a duplicate insert (23505) signal
-- "already processed — don't fire again".
CREATE UNIQUE INDEX IF NOT EXISTS email_events_received_dedup
  ON email_events (coach_id, gmail_message_id)
  WHERE event_type = 'received' AND gmail_message_id IS NOT NULL;

-- Fast "newest inbound for this lead" lookups when building reply context.
CREATE INDEX IF NOT EXISTS email_events_lead_received
  ON email_events (lead_id, created_at DESC)
  WHERE event_type = 'received';
