# Runbook — Supabase project compromise

**Severity:** Critical. Treat as a data-breach incident from minute zero.

**Trigger:** Suspicious access to the Supabase dashboard, unauthorized
schema changes, mass row deletion, anonymous read of vault.secrets, or
Supabase support notification.

## Step 0 — Convene

Two people: Daniel + one trusted operator. Move communication off Slack to
a phone call so we keep a verbal log. Open the Supabase audit log on a
shared screen.

## Step 1 — Stop the bleeding

1. **Disable the service role key:** Supabase dashboard → Settings → API →
   "Reset" the service role key. This breaks the app temporarily — that's
   the correct trade-off.
2. **Disable public API access** if needed: Project pause toggle (Settings
   → General).
3. **Block egress from Vercel:** Pause the production deployment so no
   further reads/writes occur (Vercel dashboard → Production → Pause).

## Step 2 — Assess scope

```sql
-- Recent schema changes
SELECT * FROM postgres_log_history WHERE message ILIKE 'ALTER%' OR message ILIKE 'DROP%'
  AND log_time > now() - interval '24 hours' ORDER BY log_time DESC;

-- Recent admin auth events
SELECT * FROM auth.audit_log_entries
  WHERE created_at > now() - interval '24 hours'
  ORDER BY created_at DESC;

-- Vault.secrets reads — should be zero from non-service-role
SELECT * FROM pg_stat_statements WHERE query ILIKE '%vault.decrypted_secrets%';
```

Document everything observed into the post-mortem doc immediately.

## Step 3 — Restore

Supabase Point-in-Time Recovery (PITR) is enabled (`SECURITY.md`). Restore
to a timestamp 5 minutes before the first suspected unauthorized action.

PITR is a destructive operation — it creates a new project. Update Vercel
env vars (`NEXT_PUBLIC_SUPABASE_URL`, anon key, service role key) and
redeploy.

## Step 4 — Re-rotate every secret

The compromise may have exposed Vault contents. Even though Vault encrypts
at rest, assume the contents leaked:
- Every coach's Gmail / Slack / calendar OAuth tokens — force reconnect.
- Every provider API key — rotate per `key-leak.md` for each provider in
  parallel.
- Every JWT secret (`JWT_REVIEW_SECRET`, `UNSUBSCRIBE_TOKEN_SECRET`) —
  rotate; existing tokens are invalidated and coaches see "link expired"
  on stale review URLs.

## Step 5 — Notify

- Every coach within 24 hours. Plain-language email.
- GDPR Article 33 notification to the supervisory authority within 72 hours.
- Affected lead notifications via coaches (they are data controllers).

## Step 6 — Post-mortem within 7 days

Required sections:
- What happened (timeline)
- Why our defenses didn't catch it sooner
- What we changed (concrete code/process diffs)
- What we owe coaches (credits, free months)

Publish the post-mortem publicly within 30 days, redacted as needed.

## Step 7 — Hardening review

After the incident, audit:
- Who has Supabase dashboard access? Should it be fewer people?
- Are we using Supabase MFA for the dashboard? (Should be yes.)
- Is the service-role key in any non-Vercel location?
- Are RLS policies still tight after the PITR restore?
