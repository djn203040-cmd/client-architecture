# Privacy Policy

> Published publicly at `/privacy-policy` (rendered from
> `apps/web/app/privacy-policy/content.ts` — keep the two in sync).
> This URL is registered on the Google OAuth consent screen.

**Last updated: 2026-07-14**

This privacy policy explains what data The Client Architecture (operated by
Sonorous Digital) collects, why, and how you can control it. We've written it
in plain language. If anything is unclear, email
**privacy@theclientarchitecture.com**.

## Who we are

The Client Architecture is a managed software-delivered service for coaching
businesses. The operator is Daniel (Sonorous Digital). Coaches are our direct
customers; leads belong to coaches, not to us.

## What we collect

### From coaches (you)
- Account profile — name, email, business name, photo
- OAuth tokens for Gmail, Slack, calendar providers, transcript providers — held
  encrypted in Supabase Vault, never in plain database columns
- Voice corpus — structured profile (tone adjectives, formality, opener
  phrases) plus 10–15 real message examples you supply. The examples are
  encrypted at rest via Supabase Vault.
- Notification preferences
- Activity timestamps (last login, most recent draft approval)

### From your leads (people who contact you)
- Contact details — name, email, phone — supplied by you, by the calendar
  provider, or via your inbox monitoring
- Call transcripts — when you connect Fireflies, Zoom, or paste in manually.
  Transcript content is encrypted at rest with AES-256-GCM.
- Sequence state — which messages we've drafted and which you sent
- Engagement signals — opens, clicks, replies, bounces
- An automatic 90-day purge applies to leads marked `do_not_contact`

### Operational data
- Server logs — request paths, response codes, latency. PII is scrubbed
  before any log leaves our servers (Sentry / Vercel logs).
- Error reports — Sentry, with `beforeSend` scrubbing for emails, phones, and
  lead identifiers

## How we use it

- To draft and send follow-up messages on your behalf, in your voice
- To detect replies, bounces, and unsubscribes
- To notify you when a draft is ready or a sequence pauses
- To detect abuse and protect the system (rate limits, audit log)

We never train AI models on your data. Anthropic, our LLM provider, is bound
by enterprise terms that prohibit training on inputs.

## Google API Services & Limited Use

The Client Architecture's use and transfer of information received from
Google APIs adheres to the [Google API Services User Data
Policy](https://developers.google.com/terms/api-services-user-data-policy),
including the Limited Use requirements.

- We access Gmail only to send follow-up emails you have approved (or
  authorized to send automatically) and to detect replies, bounces, and
  unsubscribes from your leads.
- We do not use Gmail data for advertising, and we never sell it.
- We do not use Gmail data to train AI or machine-learning models. Only the
  minimum context needed to draft a specific message is passed to our AI
  provider under the no-training terms above.
- Humans do not read your Gmail data except with your explicit permission
  for support, where required for security purposes, or to comply with
  applicable law.
- Disconnecting Gmail in Settings revokes our access; you can also revoke it
  at any time from your Google account's security settings.

## Sub-processors

| Sub-processor | Purpose | Data shared |
|---------------|---------|-------------|
| Vercel | Hosting | All request data |
| Supabase | Database + auth + vault | Account + lead data (RLS-scoped, Vault for secrets) |
| Anthropic | AI drafts | Lead first name + transcript snippets relevant to the message being drafted. No emails, no phone numbers in prompts. |
| Gmail (Google) | Outbound email + inbound monitoring | Your messages and your leads' replies |
| Twilio | WhatsApp + SMS notifications | Your phone number; lead's phone for delivery |
| Slack | Coach notifications | Draft body when you opt in |
| Resend | Transactional email (review links, alerts) | Your email + draft preview |
| Inngest | Workflow orchestration | Workflow state (no message bodies) |
| Upstash | Rate-limit counters | IP / coach ID hashes |
| Calendar providers (Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal) | Booking webhooks | Booking metadata; you control connection |
| Transcript providers (Fireflies, Zoom) | Call transcripts | Per coach + per call; you control connection |
| Sentry | Error monitoring | Scrubbed exception data only |

## Retention

- Coach account data — kept while your subscription is active. Deletion via
  Settings → Danger Zone → "Delete account" cascades through every coach-
  scoped table within 60 seconds.
- Lead data — kept while the lead is active. Marking a lead `do_not_contact`
  triggers a 90-day purge.
- Audit log — kept 24 months, then archived to cold storage. Cannot be
  deleted by the coach (it records administrative actions for accountability).
- Logs — Vercel: 30 days. Sentry: 90 days. Both scrubbed of PII.

## GDPR rights

If you (or one of your leads) are an EU/UK resident, you have the right to:
- **Access** — `GET /api/account/export` returns a complete JSON archive
- **Rectification** — edit any field in your dashboard
- **Erasure** — `POST /api/account/delete` with the type-to-confirm phrase
- **Portability** — the export is machine-readable JSON
- **Restriction / objection** — email privacy@theclientarchitecture.com

We respond to requests within 30 days.

## Data Processing Addendum (DPA)

We're happy to sign a DPA with any coach who needs one for B2B clients.
Template at `docs/dpa-template.md`. Email Daniel to countersign.

## International transfers

Servers are in the EU (Supabase eu-central-1, Vercel global edge). Sub-
processors located outside the EU operate under Standard Contractual Clauses.

## Children

The Client Architecture is for adult professionals. We don't knowingly
collect data about anyone under 16.

## Changes

Substantive changes to this policy will be announced in-app + via email at
least 14 days before they take effect.

## Contact

privacy@theclientarchitecture.com — Daniel (operator)
