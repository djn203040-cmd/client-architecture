# Security Policy

The Client Architecture is operated by Sonorous Digital on behalf of coaching
businesses. Security is a launch-blocker; this document explains how to report
issues and how we respond.

## Reporting a vulnerability

Please email **security@theclientarchitecture.com** (Daniel — djn203040@gmail.com
as a fallback) with:

- A clear description of the vulnerability
- Steps to reproduce
- Impact assessment (what data or capability is exposed)
- Whether you have a proof-of-concept

**Please do not file a public GitHub issue.** Responsible disclosure gives us
time to fix the problem before attackers see it.

### Response timeline

| Severity | Acknowledgement | Initial assessment | Fix target |
|---------|-----------------|--------------------|------------|
| Critical | 4 hours | 24 hours | 7 days |
| High | 24 hours | 3 days | 14 days |
| Medium | 3 days | 7 days | 30 days |
| Low / informational | 7 days | 14 days | best effort |

We will keep you informed throughout and credit you publicly once the fix
ships, unless you prefer to remain anonymous.

## Supported versions

We ship from `main`. Only the currently deployed build is supported — there
are no LTS branches.

## Out of scope

- Reports limited to missing security headers on `*.vercel.app` preview URLs
  (production has them).
- Reports based on outdated copies of `pnpm-lock.yaml`. Run `pnpm install`
  first, then `pnpm audit --prod --audit-level=high`.
- Social-engineering and physical attacks on Sonorous Digital staff.
- Findings that require a compromised provider (Supabase, Vercel, Anthropic)
  to be exploitable.

---

## Key rotation runbook

Every provider's secret should be rotated **immediately** on the following
events:
- Suspected leak (gitleaks finding, accidental commit, staff laptop loss)
- Departure of a person with operator access
- Annually, regardless of incident

Order: rotate at provider → update Vercel env var → redeploy → confirm
healthcheck → revoke the old key at provider.

| Provider | Rotation steps |
|---------|----------------|
| **Anthropic** | console.anthropic.com → Settings → API keys → "Create" → copy → update `ANTHROPIC_API_KEY` → revoke old |
| **Supabase service role** | supabase.com/dashboard → Project → Settings → API → "Reset" → update `SUPABASE_SERVICE_ROLE_KEY` → revoke old |
| **Supabase anon key** | Same panel — note this is in client bundles; coordinate redeploy timing |
| **Gmail OAuth client secret** | console.cloud.google.com → APIs & Services → Credentials → reset client secret → update `GOOGLE_CLIENT_SECRET` |
| **Twilio auth token** | twilio.com/console → Account → Auth Tokens → "Promote secondary" → update `TWILIO_AUTH_TOKEN` |
| **Slack signing secret** | api.slack.com/apps → app → Basic Information → "Regenerate" → update `SLACK_SIGNING_SECRET` |
| **Slack client secret** | Same panel — affects OAuth flow |
| **Resend API key** | resend.com/api-keys → "Create new" → swap → revoke old |
| **Inngest signing key + event key** | app.inngest.com → Settings → Keys → rotate both → update `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` |
| **Upstash Redis token** | upstash.com → Database → Reset password → update `UPSTASH_REDIS_REST_TOKEN` |
| **Calendar provider secrets** (Calendly, Cal.com, Acuity, Square, MS Bookings, TidyCal, Setmore) | Per-coach. Re-issue via Settings → Integrations → "Reconnect"; new secret lands in Vault |
| **Fireflies API key** | fireflies.ai → Settings → Integrations → API keys → revoke + create |
| **Zoom webhook secret** | marketplace.zoom.us → app → Webhook → "Regenerate" → update `ZOOM_WEBHOOK_SECRET_TOKEN` |
| **JWT review/unsubscribe secrets** | Generate new 32-byte random hex with `openssl rand -hex 32` → update `JWT_REVIEW_SECRET` / `UNSUBSCRIBE_TOKEN_SECRET`. Existing tokens are invalidated — surface UI guidance for affected coaches |

## License policy

Production dependencies must be MIT / Apache-2.0 / BSD / ISC / 0BSD. **GPL and
AGPL are forbidden in production** because the managed-service model means
their copyleft would extend to our hosted code.

Run `pnpm licenses list --prod` quarterly. Approved licenses today:
- MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Unlicense, CC0-1.0,
  Python-2.0 (re: type stubs), BlueOak-1.0.0.

Anything else triggers a manual review before merging the dependency.

## Cookie consent

Daniel operates from the EU. Until the dashboard ships marketing or analytics
cookies that aren't strictly necessary, no consent banner is required. We use
only session cookies (HttpOnly, Secure, SameSite=Lax). Re-evaluate if we add
Google Analytics, Meta Pixel, or any non-essential tracker.

## OAuth app review status

| Provider | Status | Notes |
|---------|--------|-------|
| Google Gmail | Pending (`gmail.send`, `gmail.modify`, `gmail.readonly`) | App review submitted via Google Cloud Console |
| Slack distribution | Deferred to Phase 7 | Daniel's first 5 coaches use the dev app |
| Meta (Instagram) | Pending submission | Phase 2+; webhook verify token already in `.env.example` |

## CI security gates

- **gitleaks** — every PR (`.github/workflows/security.yml`)
- **pnpm audit --prod --audit-level=high** — every PR
- **Client bundle secret leak check** — verifies no server secrets reach `.next/static`
- **OWASP ZAP baseline** — weekly cron against staging
- **Security integration tests** — `apps/web/tests/security/*` runs on every PR

---

*See `apps/web/lib/security/README.md` for the webhook signature registry and
`docs/runbooks/` for incident playbooks.*
