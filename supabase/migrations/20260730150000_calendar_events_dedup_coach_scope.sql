-- calendar_events dedup key was UNIQUE(provider, external_event_id, event_type),
-- which is GLOBAL across coaches. Providers with per-account numeric/sequential
-- ids (Acuity, Square, TidyCal) can legitimately produce the same
-- external_event_id for two different coaches; under the old key the second
-- coach's booking hit the dedup early-return in
-- apps/web/lib/calendar/process-event.ts and was silently dropped (no lead, no
-- sequence, no error). It also let one tenant's event suppress another's.
--
-- Scope the key by coach_id. Safe without a dedupe pass: the old constraint was
-- strictly tighter, so every existing row set already satisfies the new one.

ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_provider_external_event_id_event_type_key;

ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_coach_provider_external_event_id_event_type_key
  UNIQUE (coach_id, provider, external_event_id, event_type);
