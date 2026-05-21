# Terms of Service

**Last updated: 2026-05-21**

These are the terms under which Sonorous Digital ("we", "us") provides The
Client Architecture ("the service") to you ("the coach"). By using the
service you agree to these terms.

## 1. What we provide

- A dashboard for managing your coaching leads
- AI-drafted follow-up messages in your voice
- Multi-channel approval (dashboard, email, Slack, WhatsApp, SMS)
- Calendar webhook integrations and call-transcript ingestion
- Operator-managed onboarding, key rotation, and incident response

The service is a managed product. Daniel operates the system on your behalf;
you do not self-host or manage infrastructure.

## 2. Your responsibilities

- Use the service to follow up with leads who have opted in to contact from
  you (post-call, post-inquiry, post-purchase). Never use it for cold
  outbound to people who haven't expressed interest.
- Maintain accurate billing information.
- Keep your account credentials secret. If you suspect compromise, email
  Daniel immediately.
- Comply with applicable laws — CAN-SPAM (US), CASL (Canada), GDPR (EU/UK),
  PECR (UK), and any local equivalents.
- Honour unsubscribes immediately. Every outbound email includes an
  unsubscribe link; once a lead unsubscribes, the system blocks further sends.

## 3. What you keep, what we keep

- **Your data is yours.** Leads, transcripts, voice corpus, drafts — all
  belong to you. You can export them any time via Settings → Danger Zone.
- **Our system is ours.** Source code, dashboards, the operator-side
  tooling — proprietary to Sonorous Digital.
- We may anonymously aggregate usage metrics (number of drafts approved per
  week, channel mix) to improve the product. No identifiable data is
  shared with anyone.

## 4. AI drafts

- Drafts are starting points. You are responsible for what you send.
- Voice modeling uses your provided examples. Output is approximate, never
  identical to a sample. We never train external models on your data.
- We do not send a draft without your approval, unless you have explicitly
  enabled Autonomous Mode A (auto-send, no review) or Mode B (auto-send
  after 24h timeout) in Settings.

## 5. Acceptable use

You may not use the service to:
- Send spam, phishing, or unsolicited bulk messages
- Impersonate someone you are not authorised to represent
- Process special categories of data (health, biometric, etc.) without
  obtaining the appropriate consent
- Bypass rate limits, authentication, or RLS by any technical means
- Reverse-engineer the dashboard or our operator tools

Breach of acceptable use can result in immediate suspension. Egregious cases
(coordinated spam, credential theft) result in permanent ban without refund.

## 6. Availability

We aim for 99.5% monthly availability. Scheduled maintenance is announced
24h in advance. Unscheduled incidents are status-posted within 30 minutes.
Outages do not pause billing unless cumulative monthly downtime exceeds 4
hours, in which case a pro-rated credit is issued automatically.

## 7. Fees

- Monthly subscription billed in advance. Cancel any time; we do not pro-
  rate refunds for partial months.
- Anthropic / Twilio / Resend / Inngest usage above the included quota is
  billed pass-through with no markup. Limits are surfaced in your dashboard.

## 8. Termination

- You can terminate any time via Settings → Danger Zone → "Delete account".
  Deletion cascades through every coach-scoped table; the corresponding
  Supabase Auth user is revoked.
- We may terminate for repeated acceptable-use violations, non-payment after
  30 days, or court order. We will give 7 days written notice except where
  immediate suspension is required.

## 9. Warranty disclaimer

The service is provided "as is". We do not warrant that AI drafts will be
free of errors, that every webhook delivery will succeed on first attempt,
or that the service is fit for any specific business outcome. You use the
service at your own discretion.

## 10. Limitation of liability

To the maximum extent permitted by law, Sonorous Digital's total liability
for any claim arising from the service is limited to the amount you paid in
the 12 months preceding the claim.

## 11. Governing law

These terms are governed by the laws of Denmark. Disputes go to the courts
of Copenhagen unless another jurisdiction is required by your local consumer
protection law.

## 12. Changes

Material changes to these terms take effect 14 days after we email you. You
may terminate the service at any time if you don't agree.

## Contact

Daniel — operator — djn203040@gmail.com
Sonorous Digital — billing + contracts — billing@theclientarchitecture.com
