-- Security hardening: lock down SECURITY DEFINER RPC wrappers + advisor fixes.
--
-- The public.* wrapper functions delegate to private.* SECURITY DEFINER
-- functions that perform NO ownership checks (they trust the caller because
-- they are only ever invoked server-side via the service-role adminClient —
-- see lib/drafts/approve-atomic.ts, lib/call-outcomes/record-atomic.ts,
-- app/api/auth/slack/callback/route.ts, app/admin/admin-data.ts).
-- Postgres grants EXECUTE to PUBLIC on new functions by default, which made
-- them callable by `anon` and `authenticated` via /rest/v1/rpc/* — meaning an
-- unauthenticated caller who learned a draft UUID could approve it (triggering
-- an email send), or overwrite a coach's Slack bot token given their coach_id.

-- 1) Draft state machine RPCs: service-role only
revoke execute on function public.approve_draft_atomic(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_draft_atomic(uuid, text) to service_role;

revoke execute on function public.hold_draft_atomic(uuid, text) from public, anon, authenticated;
grant execute on function public.hold_draft_atomic(uuid, text) to service_role;

revoke execute on function public.increment_followup_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_followup_count(uuid) to service_role;

revoke execute on function public.consume_review_token(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.consume_review_token(uuid, uuid, uuid, text) to service_role;

-- 2) Call outcome RPC: service-role only
revoke execute on function public.record_call_outcome_atomic(uuid, public.call_outcome_value, text) from public, anon, authenticated;
grant execute on function public.record_call_outcome_atomic(uuid, public.call_outcome_value, text) to service_role;

-- 3) Slack token vault writer: service-role only
revoke execute on function public.store_slack_token(uuid, text) from public, anon, authenticated;
grant execute on function public.store_slack_token(uuid, text) to service_role;

-- 4) Cross-coach usage aggregate (admin dashboard only): service-role only,
--    and pin search_path (advisor: function_search_path_mutable)
revoke execute on function public.coach_ai_usage_summary() from public, anon, authenticated;
grant execute on function public.coach_ai_usage_summary() to service_role;
alter function public.coach_ai_usage_summary() set search_path = 'public';

-- 5) Trigger helper: pin search_path (advisor: function_search_path_mutable).
--    Touches only NEW, so an empty search_path is safe.
alter function public.set_updated_at() set search_path = '';

-- 6) Storage: the coach-avatars bucket is public (object URLs work without a
--    SELECT policy) and all uploads/deletes go through the server-side admin
--    client. The broad SELECT policy only enabled client-side LISTING of every
--    coach's avatar (advisor: public_bucket_allows_listing). Remove it.
drop policy if exists coach_avatars_select_public on storage.objects;
