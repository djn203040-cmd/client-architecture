-- calendar_events dedup key was UNIQUE(provider, external_event_id), which
-- collides across event types for the SAME booking: a booking is recorded as
-- 'booking_created', then later marked 'no_show' carrying the same provider uid.
-- The no_show row could never insert (and the receiver's dedup check dropped it),
-- so the no-show sequence never fired. Widen the key to include event_type.

ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_provider_external_event_id_key;

ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_provider_external_event_id_event_type_key
  UNIQUE (provider, external_event_id, event_type);
