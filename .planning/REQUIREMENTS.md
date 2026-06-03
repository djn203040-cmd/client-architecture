# Requirements — The Client Architecture

> REQ-IDs are stable references. Never renumber. If a requirement is removed, mark it `[REMOVED]` with a reason.

---

## LEAD — Lead Management

| ID | Requirement | Phase |
|----|-------------|-------|
| LEAD-001 | Coach can manually add a lead (name, email, phone, source, notes) | 1 |
| LEAD-002 | Lead profile shows: contact details, source, current state, sequence status, activity timeline | 1 |
| LEAD-003 | Activity timeline is chronological, typed events with distinct icons (call booked, no-show, email sent, email opened, replied, draft approved, draft held, unsubscribed, bounced) | 1 |
| LEAD-004 | Coach can add private notes to a lead profile — injected into every AI draft for this lead | 1 |
| LEAD-005 | Lead list with search, filter by state, and status tabs (active, replied, completed, held, closed) | 1 |
| LEAD-006 | Manual sequence trigger — coach can enroll any lead in the Intake Sequence from their profile | 3 |
| LEAD-007 | When monitoring detects a new lead signal (Gmail, Instagram), system surfaces "Add [name] to a sequence?" prompt to coach | 3 |
| LEAD-008 | Lead source tracked (Calendly, Cal.com, manual, Gmail detected, Instagram detected, referral) | 1 |
| LEAD-009 | Coach can manually override lead state at any time | 1 |

---

## STATE — Lead State Machine

| ID | Requirement | Phase |
|----|-------------|-------|
| STATE-001 | Lead states: `identified` → `call_booked` → `no_show` \| `call_completed` → `in_sequence` → `replied` \| `converted` \| `closed` \| `unsubscribed` \| `do_not_contact` \| `bounced` | 1 |
| STATE-002 | `no_show` — lead booked a call and did not attend. Triggers Intake Sequence with no-show messaging track | 3 |
| STATE-003 | `call_completed` — lead attended the call but did not buy. Triggers Intake Sequence with post-call messaging track (distinct from no-show) | 3 |
| STATE-004 | `converted` — lead became a client. Terminal state. No emails fire. Sequence terminates immediately | 3 |
| STATE-005 | `closed` — lead will not convert. Terminal state. No emails fire. Sequence terminates immediately | 3 |
| STATE-006 | `unsubscribed` — lead clicked unsubscribe link. Terminal state. No emails ever fire again | 3 |
| STATE-007 | `do_not_contact` — manually set by coach or triggered by hard bounce. Terminal state. No emails fire | 1 |
| STATE-008 | `bounced` — permanent email delivery failure detected. Sequence pauses. Coach notified | 3 |
| STATE-009 | State transitions logged to activity timeline with timestamp and trigger source | 1 |
| STATE-010 | Pre-send check verifies lead is not in a terminal state immediately before every send | 3 |

---

## AI — Draft Engine

| ID | Requirement | Phase |
|----|-------------|-------|
| AI-001 | AI draft generated using: voice model (Layer 1 + Layer 2) + lead profile + coach notes + call transcripts + sequence position + prior emails sent | 2 |
| AI-002 | Draft generation uses `claude-sonnet-4-6` server-side only — never in client code | 2 |
| AI-003 | All lead-supplied content wrapped in XML delimiters in prompts. System instruction: only reference facts present in context | 2 |
| AI-004 | Token count checked via `client.messages.countTokens()` before every generation. If over 150K tokens, trim oldest conversation history. Target 8K total input | 2 |
| AI-005 | Drafts are stage-aware: `no_show` track and `call_completed` track produce different messaging | 2 |
| AI-006 | Each draft knows its position in the sequence and references prior messages sent | 2 |
| AI-007 | Confidence indicator shown on draft when voice model context is thin (fewer than 8 examples) | 2 |
| AI-008 | When a lead replies to a follow-up, AI drafts a reply using same context + the lead's reply text | 3 |
| AI-009 | Reply drafts enter the standard approval flow (24h window, same notification channels) | 3 |
| AI-010 | Draft regeneration: coach can request a new draft for the same lead/touchpoint with one click | 2 |
| AI-011 | Draft regeneration reuses same context, makes a fresh Anthropic call, replaces current draft | 2 |
| AI-012 | Draft editing: coach can edit draft text inline before approving | 1 |

---

## VOICE — Voice Model

| ID | Requirement | Phase |
|----|-------------|-------|
| VOICE-001 | Layer 1: structured profile per coach — tone adjectives, formality level, sentence length, emoji habits, opener phrases, closer phrases, never-say list | 2 |
| VOICE-002 | Layer 2: 10–15 curated real message examples per coach as few-shot context, injected into every Claude prompt | 2 |
| VOICE-003 | Voice model built from: Gmail exports, LinkedIn CSV (manual, with onboarding tutorial), WhatsApp .txt exports, Instagram DMs | 2 |
| VOICE-004 | Minimum 8 voice examples required before AI draft generation is activated for a coach | 2 |
| VOICE-005 | Voice model builder UI guides coach through uploading and curating examples during onboarding | 5 |
| VOICE-006 | `draft_edits` table scaffolded in Phase 1 — records every manual coach edit to a draft (for future voice model feedback loop) | 1 |

---

## TRANS — Transcript Integration

| ID | Requirement | Phase |
|----|-------------|-------|
| TRANS-001 | Webhook listener for new call transcripts from Fireflies.ai | 2 |
| TRANS-002 | Webhook listener for new call transcripts from Zoom (cloud recordings with transcript) | 2 |
| TRANS-003 | Transcripts matched to lead by email address or name + call timestamp | 2 |
| TRANS-004 | Transcript stored against lead record in full — accessible in lead profile | 2 |
| TRANS-005 | Transcript content injected into AI context for all drafts related to this lead | 2 |
| TRANS-006 | Manual transcript upload fallback (paste or file upload) for coaches on other platforms | 2 |
| TRANS-007 | Webhook signatures verified for all transcript provider webhooks | 2 |
| TRANS-008 | If multiple transcripts exist for a lead, all are included in context (oldest-first, trimmed by token limit) | 2 |

---

## SEQ — Sequence Automation

| ID | Requirement | Phase |
|----|-------------|-------|
| SEQ-001 | Inngest manages all sequence execution — per-coach concurrency key, no execution limits | 3 |
| SEQ-002 | Sequences triggered by: calendar webhook (no-show / call_completed), manual trigger by coach | 3 |
| SEQ-003 | Sequence scheduling uses `step.sleepUntil(timestamp)` — timestamps stored in DB for visibility | 3 |
| SEQ-004 | `step.sendEvent()` used inside all Inngest functions — never `inngest.send()` | 3 |
| SEQ-005 | Step IDs unique per loop iteration — `send-touchpoint-${dayOffset}` pattern | 3 |
| SEQ-006 | Per-coach concurrency: `concurrency: { key: "event.data.coachId", limit: 3 }` | 3 |
| SEQ-007 | Deterministic Inngest event IDs on calendar events — prevents duplicate sequences from webhook retries | 3 |
| SEQ-008 | `cancelOn` used for reply detection — `lead/replied` event cancels in-flight sequence for that lead automatically | 3 |
| SEQ-009 | Sequence auto-pauses when lead replies to any email | 3 |
| SEQ-010 | Sequence auto-pauses when new call is scheduled with this lead | 3 |
| SEQ-011 | Sequence resumes/changes track when call outcome is set (`call_completed`) | 3 |
| SEQ-012 | Sequence terminates permanently on `converted`, `closed`, `unsubscribed`, `do_not_contact` | 3 |
| SEQ-013 | Pre-send safety check is a hard synchronous `step.run()` gate immediately before every send — verifies lead state, unsubscribe flag, do-not-contact flag | 3 |
| SEQ-014 | Calendar webhook event UUID stored with unique constraint — prevents duplicate processing | 3 |
| SEQ-015 | Vercel Cron Jobs emit Inngest events for time-based triggers — Inngest route handler exports `GET`, `POST`, `PUT` with `maxDuration = 300` | 3 |

---

## DRAFT — Draft Approval Flow

| ID | Requirement | Phase |
|----|-------------|-------|
| DRAFT-001 | Draft surfaces to coach 24 hours before intended send | 4 |
| DRAFT-002 | Coach notified on all connected channels when draft is ready for review | 4 |
| DRAFT-003 | Coach can: approve, edit + approve, regenerate, hold draft | 1 |
| DRAFT-004 | Inline editing of draft text — not in a modal | 1 |
| DRAFT-005 | Keyboard shortcuts in approval queue: A = approve, S = skip, H = hold | 1 |
| DRAFT-006 | Approve + Next flow — advances to next draft without returning to list | 1 |
| DRAFT-007 | If no action after 24h: follow-up CTA sent to coach, another 24h window opens | 4 |
| DRAFT-008 | If no action after second 24h window: draft moves to HOLD (waits indefinitely) | 4 |
| DRAFT-009 | Autonomous Mode A: auto-sends without any review (toggle, not default, framed as non-recommended) | 4 |
| DRAFT-010 | Autonomous Mode B: 24h window, auto-sends on timeout if not approved (toggle, not default) | 4 |
| DRAFT-011 | Draft status transitions use Postgres-level lock to prevent race conditions in autonomous mode | 4 |
| DRAFT-012 | Supabase Realtime on `drafts` table filtered by `coach_id` powers the live approval queue | 1 |
| DRAFT-013 | Draft full text visible immediately in queue — never truncated | 1 |
| DRAFT-014 | Draft shows: lead name, touchpoint number, intended send time, confidence indicator | 1 |

---

## COMPLY — Compliance & Safety

| ID | Requirement | Phase |
|----|-------------|-------|
| COMPLY-001 | Unsubscribe link in footer of every outbound email (CAN-SPAM) | 3 |
| COMPLY-002 | Unsubscribe link hits Next.js API route → sets `do_not_contact = true` on lead | 3 |
| COMPLY-003 | Unsubscribe page is minimal and on-brand — not a public Mailchimp-style page | 3 |
| COMPLY-004 | Inngest pre-send check reads `do_not_contact` flag before every send | 3 |
| COMPLY-005 | Hard bounce (permanent delivery failure from Gmail API) → sequence pauses, coach notified | 3 |
| COMPLY-006 | Hard bounce notification: multi-channel (dashboard + WhatsApp/SMS + Slack) with lead name, email, and CTA to update email address | 3 |
| COMPLY-007 | Lead marked `bounced` on hard bounce — sequence does not resume until coach updates email and manually reactivates | 3 |
| COMPLY-008 | Soft bounces (transient failures) do not pause sequence — log event to timeline only | 3 |
| COMPLY-009 | No sensitive data in `console.log` anywhere in codebase | 1 |
| COMPLY-010 | Webhook signature verification on every incoming webhook (calendar providers, transcript providers, Twilio) | 1 |

---

## HEALTH — Integration Health

| ID | Requirement | Phase |
|----|-------------|-------|
| HEALTH-001 | Integration health card in dashboard — small, unobtrusive when all connections are healthy | 1 |
| HEALTH-002 | Health card lights red with clear error message when any connection breaks (Gmail, calendar, Twilio) | 1 |
| HEALTH-003 | One-click reconnect flow from health card for each broken integration | 1 |
| HEALTH-004 | Gmail OAuth `invalid_grant` detected → integration marked disconnected, sequences halted, coach notified immediately | 1 |
| HEALTH-005 | Daily cron checks Gmail watch expiry (`watch_expiry_at` per coach) and renews before expiry | 3 |
| HEALTH-006 | If Gmail watch renewal fails, system falls back to polling Gmail history API every 15 minutes | 3 |
| HEALTH-007 | OAuth scopes validated after token exchange — under-scoped token blocks coach connection | 1 |
| HEALTH-008 | Google OAuth app must exit "Testing" mode before launch (7-day token expiry in Testing mode breaks sequences) — review process initiated in Phase 1 | 1 |

---

## GMAIL — Gmail Integration

| ID | Requirement | Phase |
|----|-------------|-------|
| GMAIL-001 | Coach connects Gmail account via OAuth 2.0 — system sends emails AS the coach | 1 |
| GMAIL-002 | OAuth auth URL includes `access_type: 'offline'` and `prompt: 'consent'` — refresh token persisted immediately on `tokens` event | 1 |
| GMAIL-003 | OAuth tokens stored in Supabase Vault (encrypted) — `integrations` table stores only Vault UUID reference | 1 |
| GMAIL-004 | Gmail Pub/Sub watch established per coach (`users.watch()`) for real-time monitoring | 3 |
| GMAIL-005 | Gmail watch renewed every 6 days via daily cron (expiry is 7 days) | 3 |
| GMAIL-006 | Tracking pixel injected into every outbound HTML email body | 3 |
| GMAIL-007 | Pixel URL hits Next.js API route, logs open event to Supabase — treated as delivery confirmation only, not behaviour signal | 3 |
| GMAIL-008 | Lead reply detected via Gmail monitoring → `lead/replied` event fired → sequence paused → AI reply draft generated | 3 |
| GMAIL-009 | Email thread view in dashboard — full back-and-forth conversation with a lead via Gmail API | 2 |

---

## NOTIFY — Notification Channels

| ID | Requirement | Phase |
|----|-------------|-------|
| NOTIFY-001 | Dashboard notification: draft ready, lead replied, integration broken, bounce detected | 4 |
| NOTIFY-002 | Email notification via Resend: draft ready for review with direct link | 4 |
| NOTIFY-003 | Slack webhook: draft notification with full text + Approve / Hold buttons | 4 |
| NOTIFY-004 | Twilio WhatsApp: draft notification to coach's WhatsApp | 4 |
| NOTIFY-005 | Twilio SMS: fallback if WhatsApp delivery fails | 4 |
| NOTIFY-006 | Coach receives notification on all connected channels simultaneously | 4 |
| NOTIFY-007 | Notification delivery tracked — failed delivery logged, fallback attempted | 4 |
| NOTIFY-008 | Approve-from-Slack: coach can approve draft directly in Slack without opening dashboard | 4 |

---

## CAL — Calendar Integrations

| ID | Requirement | Phase |
|----|-------------|-------|
| CAL-001 | All 7 calendar providers supported: Calendly, Cal.com, Acuity Scheduling, Setmore, Square Appointments, Microsoft Bookings, TidyCal | 3 |
| CAL-002 | Unified calendar abstraction layer — all providers normalize to single `CalendarEvent` type | 3 |
| CAL-003 | Provider adapters at `/api/webhooks/calendar/[provider]` — one endpoint per provider | 3 |
| CAL-004 | Webhook signature verification per provider before processing | 3 |
| CAL-005 | Event UUID stored with unique constraint — prevents duplicate processing from webhook retries | 3 |
| CAL-006 | No-show detection fires `lead/no_show` Inngest event → sequence starts | 3 |
| CAL-007 | Call completed detection fires `lead/call_completed` Inngest event → post-call sequence track starts | 3 |
| CAL-008 | New call booking for existing lead fires `lead/call_booked` Inngest event → active sequence pauses | 3 |
| CAL-009 | Validate per-provider whether dedicated no-show webhook exists before Phase 3 (Setmore, MS Bookings, TidyCal may lack it) | 3 |

---

## ADMIN — Admin Dashboard

| ID | Requirement | Phase |
|----|-------------|-------|
| ADMIN-001 | Admin dashboard at `/admin` — Daniel-only, protected at middleware and component level | 1 |
| ADMIN-002 | Admin sees: all coach accounts, integration health per coach, sequence activity, approval rates | 1 |
| ADMIN-003 | Admin can view any coach's lead list (read-only) | 1 |
| ADMIN-004 | Admin can create and manage coach accounts (invite-only — no public signup) | 1 |
| ADMIN-005 | Admin queries use service role server-side only — cross-coach RLS bypass is intentional and contained | 1 |
| ADMIN-006 | System health view: Inngest queue depth, Gmail watch status per coach, cron health | 1 |

---

## MODULE — Locked Modules (Sell Screens)

| ID | Requirement | Phase |
|----|-------------|-------|
| MODULE-001 | Module 2 visible in dashboard at launch as locked sell screen: "The Threshold Experience — your client's first 48 hours, built from your sales call. [Book a call]" | 5 |
| MODULE-002 | Module 3 visible in dashboard at launch as locked sell screen: "The Continuation — thirty days before they leave, we remind them why they stayed. [Book a call]" | 5 |
| MODULE-003 | Locked modules show compelling description, not a generic placeholder — premium copy throughout | 5 |

---

## CALL — Call Outcome Capture (Phase 7)

| ID | Requirement | Phase |
|----|-------------|-------|
| CALL-001 | Every calendar booking (all 7 providers) is monitored: if no lead matches, a lead is created; if one matches, it is updated. Lead set to `call_booked`; `call_booked` written to the activity timeline | 7 |
| CALL-002 | A `call_outcomes` record is created on every `booking_created` event (lifecycle `scheduled`), linked to the lead and the `calendar_events` row, deduped on `(coach_id, external_event_id)` | 7 |
| CALL-003 | 30 minutes after the call's scheduled end (buffer configurable per coach), the outcome flips to `awaiting_outcome` and the coach is prompted on every enabled notification channel | 7 |
| CALL-004 | Dedicated `/calls` queue page (Awaiting / Upcoming / History tabs) mirroring the drafts queue — SSR + Supabase realtime, glass cards, empty/loading states | 7 |
| CALL-005 | The lead profile surfaces any call awaiting an outcome, with the three outcome actions inline | 7 |
| CALL-006 | Slack interactive prompt with three buttons; a click records the outcome and retires the buttons via `chat.update`; the message is kept in sync when the outcome is chosen on another surface | 7 |
| CALL-007 | The coach picks exactly one of three manual outcomes: No Show, Call Completed, Converted | 7 |
| CALL-008 | No Show fires `lead/no_show` → no-show sequence; Call Completed fires `lead/call_completed` → follow-up sequence; Converted marks the lead won and cancels nurture | 7 |
| CALL-009 | The outcome decision is atomic (advisory-lock CAS on `awaiting_outcome`) and idempotent against duplicate or late provider webhooks | 7 |
| CALL-010 | Provider-sent no-show webhooks (Calendly, Cal.com) auto-resolve the outcome as No Show, fire `lead/no_show`, and retire the prompt — the coach is not asked | 7 |
| CALL-011 | Bookings with no email create a placeholder lead (dedup by phone, flagged for email enrichment) and still receive an outcome prompt | 7 |
| CALL-012 | Rescheduled events re-arm the monitor and update the call window; cancelled events cancel the outcome and any active sequences | 7 |
| CALL-013 | Converted is non-terminal for monitoring: the lead stays live in the reply handler and transcript ingestion; only nurture sequences stop; a quiet Module 2 CTA is shown on the lead | 7 |
| CALL-014 | A resilience poller cron flips stranded `scheduled` outcomes whose end time has passed (no sole reliance on Inngest `sleepUntil`) | 7 |
| CALL-015 | Every outcome is tracked in the activity timeline (`call_booked`, `no_show`, `call_completed`, `call_converted`) | 7 |
| CALL-016 | `call_outcomes` has RLS scoped to `coach_id`, is added to the realtime publication, and every API boundary is Zod-validated | 7 |

---

## INFRA — Infrastructure & Security

| ID | Requirement | Phase |
|----|-------------|-------|
| INFRA-001 | RLS on every Supabase table, always scoped to `coach_id` | 1 |
| INFRA-002 | `SUPABASE_SERVICE_ROLE_KEY` never gets `NEXT_PUBLIC_` prefix — CI check enforces this | 1 |
| INFRA-003 | All `SECURITY DEFINER` functions live in `private` schema, not `public` (not exposed by PostgREST) | 1 |
| INFRA-004 | Supavisor connection string (port 6543, transaction mode) for all Vercel function connections | 1 |
| INFRA-005 | Zod validation on every API boundary | 1 |
| INFRA-006 | TypeScript strict mode, no `any`, shared types in `packages/shared/` | 1 |
| INFRA-007 | Turborepo monorepo: `apps/web`, `packages/shared`, `packages/database`, `packages/ai-engine` | 1 |
| INFRA-008 | `packages/ai-engine` is server-side only — never imported in client code | 1 |
| INFRA-009 | Upstash Redis for rate limiting on all public-facing API routes | 1 |
| INFRA-010 | Instagram API scaffolded early for Meta app review timeline — functionality is Phase 2+ | 1 |

---

*Requirements version: 1.1 — 2026-06-03 (added CALL — Call Outcome Capture, Phase 7)*
*Next update: after Phase 1 execution*
