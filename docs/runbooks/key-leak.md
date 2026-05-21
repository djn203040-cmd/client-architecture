# Runbook — API key leak

**Severity:** Critical the moment a real key is seen anywhere outside
production secret storage.

**Trigger sources:**
- gitleaks CI finding on a PR
- gitleaks history scan
- Manual sighting in logs / chat / a screenshot
- Provider notification (Anthropic, Supabase) of suspicious activity

## Step 0 — Confirm the finding is real

Diff the suspect string against `.env.example` placeholders and known test
fixtures. Most gitleaks hits are placeholders.

If real → proceed immediately to Step 1. Do not wait for a "good time".

## Step 1 — Rotate at provider FIRST

Use `SECURITY.md → Key rotation runbook` to find the exact provider URL.
Rotate before doing anything in git. This is the single most important step.

## Step 2 — Update Vercel env vars

Vercel dashboard → Project → Settings → Environment Variables → update the
relevant key → redeploy (production + preview).

Verify the deploy boots: `curl https://<app>/api/health | jq`.

## Step 3 — Revoke the old key at provider

After Step 2 confirms healthy, return to the provider and revoke the old
key. Some providers (Twilio) require both keys to be active during a
"promote" cycle; honour that pattern instead.

## Step 4 — Audit usage of the old key

Look for suspicious activity in the window between Step 0 timestamp and
revocation timestamp. Most provider dashboards have audit log access:

| Provider | Audit log |
|---------|-----------|
| Anthropic | console.anthropic.com → Usage → filter by API key |
| Supabase | dashboard → Logs → Postgres role filter |
| Gmail | admin.google.com → Security → API logs |
| Twilio | console.twilio.com → Monitor → Logs |
| Slack | api.slack.com/apps → app → Activity |
| Resend | resend.com/logs |

If you find unauthorized usage → escalate to `coach-unauthorized-access.md`
for affected coaches.

## Step 5 — Remove from git history (only if needed)

Provider rotation alone is sufficient. History rewrite is optional and
disruptive. Do it only if:
- The leaked key is irreplaceable (e.g., long-lived cert) AND
- All collaborators agree to coordinate the force-push

Use `git filter-repo --replace-text replacements.txt` (NOT `filter-branch`)
and force-push. Notify every clone holder to re-clone.

## Step 6 — Update SECURITY.md

Add an entry under "Historical rotations" with the date, provider, and a
one-line reason ("gitleaks detected key committed in PR #N — rotated 06-15
14:32 UTC").

## Step 7 — Strengthen the gate

Was there a way the leak could have been blocked earlier?
- Gitleaks allowlist too permissive? Tighten it.
- A new provider not in the secret-prefix scanner? Add the prefix.
- Dev process bypassed CI? Reinforce the contribution guide.

Open an issue tagged `security` so the gate change ships in the next PR.
