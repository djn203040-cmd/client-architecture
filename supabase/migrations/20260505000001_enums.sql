-- 8 enums covering all 5 phases of state, status, and routing
CREATE TYPE lead_status AS ENUM (
  'identified', 'call_booked', 'no_show', 'call_completed',
  'in_sequence', 'replied', 'converted', 'closed',
  'unsubscribed', 'do_not_contact', 'bounced'
);

CREATE TYPE draft_status AS ENUM (
  'pending', 'approved', 'edited', 'sent', 'held', 'cancelled'
);

CREATE TYPE lead_event_type AS ENUM (
  'call_booked', 'no_show', 'call_completed', 'email_sent',
  'email_opened', 'replied', 'draft_approved', 'draft_held',
  'state_changed', 'unsubscribed', 'bounced', 'note_added',
  'sequence_started', 'sequence_paused', 'sequence_resumed',
  'sequence_completed', 'sequence_cancelled', 'manually_enrolled'
);

CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error');

CREATE TYPE integration_provider AS ENUM (
  'gmail', 'calendly', 'cal_com', 'acuity', 'setmore',
  'square', 'ms_bookings', 'tidycal', 'slack', 'twilio',
  'instagram'
);

CREATE TYPE lead_source AS ENUM (
  'calendly', 'cal_com', 'acuity', 'setmore', 'square',
  'ms_bookings', 'tidycal', 'manual', 'gmail_detected',
  'instagram_detected', 'referral'
);

CREATE TYPE sequence_status AS ENUM (
  'active', 'paused', 'completed', 'cancelled', 'held'
);

CREATE TYPE notification_channel AS ENUM ('email', 'slack', 'whatsapp', 'sms');
