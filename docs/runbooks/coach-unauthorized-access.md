# Runbook — Coach reports unauthorized access

**Severity:** High to Critical depending on scope.
**Owner:** Daniel.
**Trigger:** A coach contacts us claiming their account was accessed by
someone they didn't authorize.

## Step 0 — Acknowledge

Reply within 1 hour acknowledging the report. Use plain language. Do not
speculate about cause until step 2.

## Step 1 — Lock the account immediately

```
-- Service-role psql or Supabase SQL editor
SELECT * FROM coaches WHERE email = '<coach-email>';
-- Revoke active sessions:
SELECT auth.revoke_session(id) FROM auth.refresh_tokens WHERE user_id = '<coach-uuid>';
-- Optional: temporarily disable
UPDATE coaches SET status = 'suspended' WHERE id = '<coach-uuid>';
```

The middleware's `getUser()` check will deny further requests within 30s.

## Step 2 — Reconstruct the timeline

1. Pull `audit_log` for the coach: `SELECT * FROM audit_log WHERE coach_id = '<id>' ORDER BY created_at DESC LIMIT 200;`
2. Pull Vercel logs for the last 24h filtered by the coach's IP set.
3. Pull `notification_log` for any outbound messages that look out of pattern.
4. Pull `email_events` for unusual send volume.

## Step 3 — Determine root cause

Common patterns:
- **Credential theft** — password / magic-link reuse. The coach reports
  unfamiliar messages were sent.
- **Stale session** — coach left their dashboard logged in on a shared
  device. No actual unauthorized access; just session hygiene.
- **Phishing of OAuth scope** — coach approved a malicious OAuth app that
  read their Gmail. Not our breach, but we help triage.
- **Internal compromise** — service-role key leak. Treat as Critical and
  follow `key-leak.md` simultaneously.

## Step 4 — Remediate

- Force password reset via Supabase Auth admin.
- Force re-auth on every device (`supabase.auth.admin.signOut(userId, 'global')`).
- Rotate any provider OAuth tokens for that coach (Gmail, Slack, calendar
  providers).
- Restore Vault tokens via `private.store_gmail_tokens` once the coach
  reconnects.

## Step 5 — Notify

If lead data was accessed by the attacker:
- Notify the coach within 24 hours.
- The coach is the data controller for their leads — they decide whether to
  notify the leads themselves. We provide a list of affected lead IDs.
- File a GDPR Article 33 notification with the supervisory authority within
  72 hours if EU/UK leads are affected and risk to rights/freedoms is more
  than low.

## Step 6 — Post-mortem

Write a post-mortem in `docs/incidents/<date>-<short-slug>.md`. Cover:
- Timeline (with UTC timestamps)
- Root cause
- What we changed
- What's still open

Share the post-mortem with the coach. Offer service credit if our system
contributed to the breach.
