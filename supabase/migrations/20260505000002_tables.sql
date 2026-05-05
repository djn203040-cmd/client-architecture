-- All 11 tables for The Client Architecture — all 5 phases scoped in schema now.
-- This prevents painful type regeneration cycles after Phase 3 Inngest functions deploy.
-- (RESEARCH.md Pitfall 1)

-- coaches: one row per coach, extends auth.users
CREATE TABLE coaches (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  role            TEXT NOT NULL DEFAULT 'coach', -- 'coach' | 'admin'
  -- Voice model (Phases 1-2 scaffold, Phase 2 population)
  voice_model     JSONB DEFAULT '{}',         -- Layer 1 + Layer 2 structure
  service_info    JSONB DEFAULT '{}',         -- coaching offer, outcomes, pricing
  -- Sequence settings (Phase 4)
  autonomous_mode TEXT DEFAULT 'off',         -- 'off' | 'mode_a' | 'mode_b'
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- integrations: one row per provider per coach
CREATE TABLE integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  provider        integration_provider NOT NULL,
  status          integration_status NOT NULL DEFAULT 'disconnected',
  vault_secret_id UUID,              -- Vault UUID — tokens never stored raw here
  scopes          TEXT[] DEFAULT '{}',
  webhook_secret_vault_id UUID,      -- webhook signing secret in Vault
  watch_expiry_at TIMESTAMPTZ,       -- Gmail Pub/Sub watch expiry (HEALTH-005)
  last_checked_at TIMESTAMPTZ,
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}', -- provider-specific data (calendar account IDs, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coach_id, provider)
);

-- leads: the core entity
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  -- Contact
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  -- Classification
  source          lead_source NOT NULL DEFAULT 'manual',
  status          lead_status NOT NULL DEFAULT 'identified',
  -- State flags (non-redundant — these block sends regardless of status)
  do_not_contact  BOOLEAN NOT NULL DEFAULT false,
  bounced         BOOLEAN NOT NULL DEFAULT false,
  -- Coach notes (injected into AI context, Phase 1 scaffold Phase 2 use)
  coach_notes     TEXT,
  -- External identifiers (for matching from webhooks/transcripts)
  external_ids    JSONB DEFAULT '{}',  -- { "calendly_invitee_uri": "...", "fireflies_speaker_id": "..." }
  -- Timestamps
  last_activity_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coach_id, email)
);

-- lead_events: activity timeline
CREATE TABLE lead_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL,      -- denormalized for RLS
  event_type      lead_event_type NOT NULL,
  payload         JSONB DEFAULT '{}', -- event-specific data
  triggered_by    TEXT,               -- 'system' | 'coach' | 'calendly' | etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sequences: one per lead enrollment
CREATE TABLE sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  module          INTEGER NOT NULL DEFAULT 1, -- 1 = Intake Sequence
  track           TEXT NOT NULL DEFAULT 'no_show', -- 'no_show' | 'call_completed'
  status          sequence_status NOT NULL DEFAULT 'active',
  inngest_run_id  TEXT,               -- Inngest run ID for cancellation
  current_touchpoint INTEGER DEFAULT 0,
  scheduled_steps JSONB DEFAULT '[]', -- [{touchpoint, scheduled_at, draft_id}]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- drafts: one per sequence touchpoint
CREATE TABLE drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id     UUID REFERENCES sequences(id) ON DELETE SET NULL,
  -- Content
  subject         TEXT,
  body            TEXT NOT NULL,
  -- Sequence context
  touchpoint_index INTEGER NOT NULL DEFAULT 1,
  total_touchpoints INTEGER,
  -- Approval flow
  status          draft_status NOT NULL DEFAULT 'pending',
  scheduled_send_at TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  held_at         TIMESTAMPTZ,
  -- Voice confidence
  confidence_level TEXT,              -- 'high' | 'low' (fewer than 8 examples)
  -- AI metadata
  ai_model        TEXT DEFAULT 'claude-sonnet-4-6',
  generation_context JSONB DEFAULT '{}', -- token counts, context summary
  -- Locking (Phase 4 autonomous mode race condition prevention)
  status_locked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- draft_edits: voice model feedback loop scaffold (VOICE-006, Phase 1 scaffold)
CREATE TABLE draft_edits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id        UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL,      -- denormalized for RLS
  original_body   TEXT NOT NULL,
  edited_body     TEXT NOT NULL,
  edit_summary    TEXT,               -- future: AI-analyzed diff category
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- transcripts: call transcript storage (Phase 2 population, scaffold now)
CREATE TABLE transcripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL,      -- denormalized for RLS
  provider        TEXT NOT NULL,      -- 'fireflies' | 'zoom' | 'manual'
  call_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  content         TEXT NOT NULL,      -- full transcript text
  token_count     INTEGER,
  external_id     TEXT,               -- provider's transcript ID
  matched_by      TEXT,               -- 'email' | 'name_timestamp' | 'manual'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- email_events: tracking (Phase 3 tracking pixel, scaffold now)
CREATE TABLE email_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id        UUID REFERENCES drafts(id) ON DELETE SET NULL,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL,
  event_type      TEXT NOT NULL,      -- 'sent' | 'opened' | 'clicked' | 'bounced'
  open_source     TEXT,               -- 'direct' | 'proxy' (Apple MPP)
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  raw_payload     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- calendar_events: idempotency store for webhook deduplication (Phase 3)
CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL,
  provider        integration_provider NOT NULL,
  external_event_id TEXT NOT NULL,    -- provider's event UUID
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,      -- 'no_show' | 'call_completed' | 'booking_created'
  payload         JSONB DEFAULT '{}',
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_event_id)  -- deduplication constraint (SEQ-014)
);

-- notification_log: multi-channel notification tracking (Phase 4)
CREATE TABLE notification_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL,
  draft_id        UUID REFERENCES drafts(id) ON DELETE SET NULL,
  channel         notification_channel NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'sent' | 'failed' | 'delivered'
  external_id     TEXT,               -- Twilio SID, Resend ID, etc.
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger function (reused across all tables with updated_at column)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to all tables that have updated_at
CREATE TRIGGER coaches_set_updated_at
  BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER integrations_set_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sequences_set_updated_at
  BEFORE UPDATE ON sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER drafts_set_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
