-- GDPR retention: implement the 90-day do_not_contact purge that the privacy
-- policy (docs/privacy-policy.md §Retention) promises but which was never
-- enforced in code. Article 5(1)(e): personal data of a lead who has opted out
-- must not be retained beyond what is necessary.
--
-- Design:
--   * A `marked_do_not_contact_at` timestamp records WHEN a lead entered the
--     do_not_contact state, so the 90-day window is measured from opt-out, not
--     from row creation.
--   * A trigger maintains the timestamp across every write path (dashboard
--     PATCH, unsubscribe link, admin) instead of trusting each call site.
--   * Existing do_not_contact rows are backfilled to now() so the very first
--     purge run does NOT mass-delete historical opt-outs by surprise; they get
--     a fresh, auditable 90-day window from this migration.
--   * The purge itself runs in an Inngest daily cron (do-not-contact-purge.ts);
--     lead deletes cascade to transcripts/drafts/events via existing FKs.

alter table public.leads
  add column if not exists marked_do_not_contact_at timestamptz;

-- Trigger: keep marked_do_not_contact_at in sync with the do_not_contact flag.
create or replace function public.sync_do_not_contact_marked_at()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if new.do_not_contact is true and (old.do_not_contact is distinct from true) then
    new.marked_do_not_contact_at := now();
  elsif new.do_not_contact is false and old.do_not_contact is true then
    new.marked_do_not_contact_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_do_not_contact_marked_at on public.leads;
create trigger trg_sync_do_not_contact_marked_at
  before update on public.leads
  for each row
  execute function public.sync_do_not_contact_marked_at();

-- Also stamp on INSERT if a lead is created already opted out.
create or replace function public.stamp_do_not_contact_on_insert()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if new.do_not_contact is true and new.marked_do_not_contact_at is null then
    new.marked_do_not_contact_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_do_not_contact_on_insert on public.leads;
create trigger trg_stamp_do_not_contact_on_insert
  before insert on public.leads
  for each row
  execute function public.stamp_do_not_contact_on_insert();

-- Backfill existing opt-outs with a fresh window (see design note above).
update public.leads
  set marked_do_not_contact_at = now()
  where do_not_contact is true and marked_do_not_contact_at is null;

-- Index the purge predicate.
create index if not exists idx_leads_dnc_purge
  on public.leads (marked_do_not_contact_at)
  where do_not_contact is true;
