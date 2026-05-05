-- DRAFT-012: Realtime subscription for draft approval queue (filtered by coach_id via RLS)
ALTER PUBLICATION supabase_realtime ADD TABLE public.drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.integrations;
