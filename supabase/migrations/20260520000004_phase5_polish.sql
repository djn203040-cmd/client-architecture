-- Phase 5 Polish: Coach profile columns, audit_log, coach-avatars storage bucket
-- Unblocks Plans 05-02 (onboarding_* columns) and 05-04 (settings E2E).

-- A. Coach profile columns (net-new; IF NOT EXISTS guards against partial re-runs)
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_progress JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS role_title TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS working_hours JSONB NOT NULL DEFAULT '{"start":"09:00","end":"18:00"}',
  ADD COLUMN IF NOT EXISTS email_signature TEXT,
  ADD COLUMN IF NOT EXISTS public_booking_url TEXT;

-- B. Audit log — append-only, service-role INSERT, authenticated SELECT own rows only
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID        NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL CHECK (action IN (
                'gmail_disconnected',
                'slack_disconnected',
                'twilio_disconnected',
                'account_deleted'
              )),
  metadata    JSONB       NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_coach_id_created_at_idx
  ON audit_log (coach_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Coaches can only read their own audit entries
CREATE POLICY "audit_log_select_own" ON audit_log
  FOR SELECT TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- No INSERT / UPDATE / DELETE for authenticated role — service role only (bypasses RLS)

-- C. Coach avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-avatars',
  'coach-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Coaches can upload to their own folder only: coach-avatars/{coach_id}/...
CREATE POLICY "coach_avatars_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'coach-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Avatars are public-read (they are intentionally displayed)
CREATE POLICY "coach_avatars_select_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'coach-avatars');

-- Coaches can update/delete their own avatar objects only
CREATE POLICY "coach_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'coach-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "coach_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'coach-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
