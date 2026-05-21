# Runbook — OAuth app suspended / scopes restricted

**Severity:** High. Coach-facing features degrade immediately.

**Trigger:** Email from Google, Slack, or Meta announcing app review
failure, scope restriction, or full app suspension.

## Step 0 — Read the notification carefully

Providers send specific reasons (e.g., "your app is using sensitive scopes
without OAuth verification"). Do not generalise — fix the exact issue
flagged.

## Step 1 — Determine the blast radius

| Provider | Affected feature |
|---------|------------------|
| Google Gmail | Outbound sends; inbound Pub/Sub monitoring |
| Slack | Coach notifications via Slack |
| Meta (Instagram) | Phase 2+ DM monitoring (not blocking v1) |
| Calendar OAuth (Cal.com, Acuity, etc.) | Webhook-driven sequences for affected coaches |

Note which coaches are affected. Subscriptions where the affected feature
is the *only* outbound channel need immediate attention.

## Step 2 — Communicate to coaches

Within 1 hour, send an in-app banner + email:
"Our Gmail integration is temporarily restricted while Google completes
a routine app review. Sends are paused. We expect this resolved within
N days. No coach action required."

Avoid blame, avoid promises. The coach needs to know the state, not the
reason.

## Step 3 — Fix the underlying issue

Examples:
- **Scope reduction**: prune `gmail.full` → `gmail.send` + `gmail.modify` +
  `gmail.readonly`. Update the OAuth consent screen. Resubmit verification.
- **Privacy policy URL invalid**: ensure `docs/privacy-policy.md` is
  publicly reachable at `/privacy-policy`. Resubmit.
- **Brand mismatch**: align logo + name on the consent screen with the
  domain.

Document the resolution path in the same post-mortem.

## Step 4 — Resubmit

Provider review queues are slow (3–10 business days for Google). Plan
accordingly. Use the time to:
- Send weekly progress updates to coaches.
- Build a SMS fallback for any coach whose Gmail is paused.

## Step 5 — Once approved

Reconnect every coach's account:
- Send a one-tap reconnect email with a deep link to `/settings#integrations`.
- Verify Gmail watch is re-registered (Pub/Sub topic subscription).
- Resume any paused sequences that were on this coach's account.

## Step 6 — Prevention

Most app suspensions come from drift between what we advertise and what we
actually do. Quarterly review:
- Are we still using every scope we asked for?
- Is the privacy policy still accurate?
- Has our logo / domain changed without updating the consent screen?

A 30-minute quarterly check is cheaper than a 5-day suspension.
