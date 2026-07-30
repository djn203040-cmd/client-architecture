-- Column-restrict what a signed-in coach may write to their own coaches row.
--
-- Before this migration, `authenticated` (and `anon`) held table-wide UPDATE on
-- every column of `coaches`. RLS policy "coaches_self_update" kept that scoped to
-- the coach's OWN row, so there was never a cross-tenant write. But within their
-- own row a coach could, straight from the browser with the anon key + session,
-- set columns the API routes intend to own server-side:
--
--   autonomous_mode          -- skipping the Mode-A type-to-confirm gate + audit log
--   onboarding_progress      -- skipping the per-step server gates
--   onboarding_completed_at
--   avatar_url               -- arms the cross-tenant avatar-delete finding
--   voice_model / sales_toolkit / sequence_config -- schema-invalid junk into AI prompts
--   role / email / name      -- (role is not used for authz; app admin comes from the
--                            -- JWT's app_metadata.role, so this was never an escalation)
--
-- RLS cannot express "these columns are off limits" (an UPDATE policy sees the old
-- row in USING and the new row in WITH CHECK, but cannot diff them), so the control
-- is a column-level GRANT. Anything not granted below is service-role only, and the
-- server routes that write those columns use the admin client after their own
-- auth + Zod checks.
--
-- Source: GitHub #140, pre-launch audit 2026-07-15.

-- anon has no business writing coaches at all. No INSERT policy exists either, so
-- INSERT was already dead by RLS; drop the grant so it cannot be revived by a
-- future policy edit.
REVOKE INSERT, UPDATE ON public.coaches FROM anon;
REVOKE INSERT, UPDATE ON public.coaches FROM authenticated;

-- The columns a coach genuinely owns: everything on the Settings > Profile form.
-- These map 1:1 to ProfilePatchSchema in packages/shared/src/validators/settings.ts,
-- which is the only write path still using the RLS (anon key + session) client.
-- Worst case abuse is self-inflicted: a coach can put junk in their own display name.
GRANT UPDATE (
  display_name,
  role_title,
  language,
  timezone,
  working_hours,
  email_signature,
  public_booking_url
) ON public.coaches TO authenticated;

-- updated_at deliberately absent: the coaches_set_updated_at BEFORE UPDATE trigger
-- stamps it, and trigger assignments are not subject to column grants.

COMMENT ON POLICY "coaches_self_update" ON public.coaches IS
  'Row scope only (id = auth.uid()). WHICH columns are writable is enforced by the '
  'column-level GRANT in 20260730000001_coaches_column_grants.sql, not here. Adding a '
  'column that the server must own requires no policy change; adding a column the coach '
  'may edit directly requires adding it to that GRANT.';
