-- Server-side record of "this coach has already been offered the product tour".
--
-- The one-time auto-launch of the welcome popup used to be gated on a browser
-- localStorage flag (tca_tour_v1_seen) only. localStorage is scoped to one
-- origin in one browser profile, so the popup came back for a coach who was
-- long past onboarding whenever any of those changed: a second browser or
-- device, a private window, cleared site data, or the domain move from the
-- vercel.app host to theclientarchitecture.com / .dk.
--
-- The flag belongs on the coach row. localStorage stays as an instant local
-- guard (no round trip before the 600ms popup timer), but this column is the
-- source of truth the dashboard layout reads on every render.
--
-- Server-owned on purpose: NOT added to the column-level GRANT UPDATE in
-- 20260730000001_coaches_column_grants.sql. It is written only by
-- POST /api/tour/seen with the admin client, after that route's own auth check.

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS tour_seen_at timestamptz;

COMMENT ON COLUMN public.coaches.tour_seen_at IS
  'When the product tour was first offered to (or started/finished by) this coach. '
  'Non-null suppresses the auto-launch welcome popup forever; the sidebar '
  '"Take a tour" link still works. Written server-side only.';

-- Existing coaches have all been through the dashboard already, so none of them
-- should get the popup again. Anyone who completed onboarding before this
-- migration is backfilled as "already offered".
UPDATE public.coaches
SET tour_seen_at = onboarding_completed_at
WHERE tour_seen_at IS NULL
  AND onboarding_completed_at IS NOT NULL;
