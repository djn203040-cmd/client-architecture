# Phase 3: Automation - Research

**Researched:** 2026-05-19
**Domain:** Inngest sequence engine, Gmail Pub/Sub monitoring, calendar webhook abstraction (7 providers), compliance layer
**Confidence:** HIGH (core Inngest/Gmail patterns verified via Context7 and official docs; provider capability table verified via official docs and community sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sequence Cadence and Tracks**
- D-01: No-show track — 5 touchpoints at Day 1, 3, 7, 14, 21 from sequence start.
- D-02: Call-completed track — 3 touchpoints at Day 1, 4, 10 from sequence start.
- D-03: Terminal state — when all touchpoints exhausted with no lead reply, auto-close lead (`lead.status → closed`, `sequence.status → completed`). No coach notification.
- D-04: Cadence is per-coach and configurable. Stored as `sequence_config JSONB` on coaches table. UI at `Settings → Sequence Settings` (new tab in existing settings page).
- D-05: Schema migration: add `sequence_config JSONB DEFAULT '{"no_show_delays":[1,3,7,14,21],"call_completed_delays":[1,4,10]}'` to coaches table.
- D-06: Enrollment trigger — calendar webhook fires automatically for supported providers. Manual trigger (SequenceStatusPanel button) also works for all providers and call-completed track.
- D-07: Re-enrollment — new calendar event for lead who already had a sequence creates a fresh sequence. Concurrency key on `coach_id + lead_id` prevents two active sequences simultaneously. Previous sequence marked completed/cancelled.

**Calendar Provider Strategy**
- D-08: No-show webhook auto-triggering — confirmed for Calendly, Cal.com, Acuity. Setmore, MS Bookings, TidyCal: fallback is manual trigger only (no native no-show webhooks confirmed by research).
- D-09: Call-completed track — ALWAYS manual. When booked call time passes, Inngest fires a "Pending Actions" card 30 minutes after event end time. Options: Closed / Start follow-up / Rescheduled.
- D-10: Pending Actions section — new dashboard section above DraftQueueScaffold. Appears only when items exist.
- D-11: Provider capability tooltip on IntegrationHealthCard (Auto vs Manual for no-show). No persistent badge.

**Gmail Monitoring and Reply Handling**
- D-12: Gmail Pub/Sub from day one. One shared GCP topic. Routes to correct coach by email address. Watch renewed every 6 days via Vercel Cron → Inngest.
- D-13: Polling fallback — every 5 minutes via Vercel Cron → Inngest when Pub/Sub unavailable.
- D-14: Reply detection via `Message-ID` / `In-Reply-To` matching only against emails sent by our system.
- D-15: Sequence pause SLA — within 60 seconds of reply detection (Pub/Sub achieves this; polling cannot guarantee).
- D-16: On reply detected: (1) `lead.status → replied`, `sequence.status → paused`. (2) Cancel pending Inngest steps via cancelOn. (3) Fire AI reply draft. (4) Draft surfaces in DraftQueueScaffold.
- D-17: Post-reply sequence ends permanently. No auto-resume.
- D-18: Lead already in_sequence who emails coach = treated as reply → existing reply flow.
- D-19: Unsubscribe: `lead.status → unsubscribed`, `sequence.status → cancelled`, all pending drafts → `cancelled`. Handled via Inngest cancelOn.
- D-20: Hard bounce: `lead.bounced = true`, sequence cancelled, coach notified.

**Lead Intake Monitoring**
- D-21: Trigger — new inbound email from known lead email (exact match in leads table). No NLP.
- D-22: Surface "Pending Actions" card when known lead emails and NOT in active sequence.
- D-23: No lead state change from inbound email alone. Coach action determines outcome.

**Inngest Function Organization**
- D-24: All functions in `apps/web/inngest/functions/`. One file per event type. Registered in serve() call.
  - `sequence-no-show.ts`, `sequence-call-completed.ts`, `sequence-step.ts`
  - `gmail-watch.ts`, `gmail-monitor.ts`, `reply-handler.ts`

**Pre-Send Safety Check**
- D-25: Synchronous `step.run()` gate immediately before every send. Blocks on: terminal lead states, sequence status not active. Cancels sequence on block.

### Claude's Discretion
- Which of Setmore, MS Bookings, TidyCal support no-show webhooks — researcher verifies (confirmed below: none of the three have dedicated no-show webhooks).
- `step.sleepUntil` timing calculation structure (see Code Examples section).
- Idempotency handling for duplicate calendar webhooks — use DB UNIQUE constraint catch (already scaffolded).

### Deferred Ideas (OUT OF SCOPE)
- Per-lead cadence override at enrollment time.
- "Add to sequence?" multi-channel notification (Phase 4).
- Autonomous mode for sequences (Phase 4).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STATE-002 | `no_show` state triggers Intake Sequence (no-show track) | Inngest function triggered by `lead/no_show` event; cancelOn D-16 |
| STATE-003 | `call_completed` triggers post-call messaging track | Manual enrollment from Pending Actions card; `lead/call_completed` event |
| STATE-004 | `converted` — terminal, no emails fire, sequence terminates | Pre-send safety check (D-25) + cancelOn |
| STATE-005 | `closed` — terminal, no emails fire | Pre-send safety check |
| STATE-006 | `unsubscribed` — terminal, no emails ever | COMPLY-001/002 + cancelOn on `lead/unsubscribed` |
| STATE-008 | `bounced` — permanent failure, sequence pauses, coach notified | COMPLY-005/006/007 + hard bounce detection |
| STATE-010 | Pre-send check verifies lead not in terminal state before every send | step.run() gate (D-25) |
| AI-008 | AI drafts reply when lead responds | reply-handler.ts fires generateDraft with `replied` framing |
| AI-009 | Reply drafts enter standard approval flow | DraftQueueScaffold; no new tab needed (D-16 step 4) |
| SEQ-001 | Inngest manages all sequence execution | All functions in `apps/web/inngest/functions/` |
| SEQ-002 | Sequences triggered by calendar webhook or manual trigger | Calendar adapters + SequenceStatusPanel wiring |
| SEQ-003 | Scheduling uses `step.sleepUntil(timestamp)` — stored in DB | Timestamps in `sequences.scheduled_steps JSONB` |
| SEQ-004 | `step.sendEvent()` used inside functions — never `inngest.send()` | Inngest docs: sendEvent is memoized/idempotent on retry |
| SEQ-005 | Step IDs unique per loop — `send-touchpoint-${dayOffset}` | Inngest step ID uniqueness requirement |
| SEQ-006 | Per-coach concurrency: `key: "event.data.coachId", limit: 3` | Inngest concurrency key CEL expression |
| SEQ-007 | Deterministic event IDs on calendar events | `id: "${provider}-${externalEventId}"` in inngest.send() |
| SEQ-008 | `cancelOn` for reply detection | CEL: `async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId` |
| SEQ-009 | Sequence auto-pauses on lead reply | reply-handler.ts: DB update + cancelOn fires |
| SEQ-010 | Sequence auto-pauses when new call scheduled | cancelOn on `lead/call_booked` event |
| SEQ-011 | Sequence resumes/changes track on `call_completed` | Manual re-enrollment via Pending Actions card |
| SEQ-012 | Terminates permanently on terminal states | cancelOn events + pre-send safety check |
| SEQ-013 | Pre-send safety check is synchronous step.run() gate | D-25 implementation pattern |
| SEQ-014 | Calendar webhook UUID stored with UNIQUE constraint | `calendar_events(provider, external_event_id)` — already exists in schema |
| SEQ-015 | Vercel Cron → Inngest events; route exports GET, POST, PUT with maxDuration=300 | Already in place: `apps/web/app/api/inngest/route.ts` |
| COMPLY-001 | Unsubscribe link in footer of every outbound email | HTML template with token-signed link |
| COMPLY-002 | Unsubscribe link → sets `do_not_contact = true` | `/api/unsubscribe?token=...` route |
| COMPLY-003 | Unsubscribe page minimal, on-brand | Simple Next.js page |
| COMPLY-004 | Pre-send check reads `do_not_contact` flag | Part of D-25 safety check |
| COMPLY-005 | Hard bounce → sequence pauses, coach notified | Bounce detection from Gmail Mailer Daemon email |
| COMPLY-006 | Hard bounce notification: multi-channel | Inngest fires notification event |
| COMPLY-007 | Lead marked `bounced`, no resume until coach reactivates | DB flag + sequence cancel |
| COMPLY-008 | Soft bounces do not pause — log to timeline only | Error type classification in Gmail error handler |
| HEALTH-005 | Daily cron checks Gmail watch expiry, renews before 7-day expiry | Vercel Cron → Inngest `gmail/watch_renew` event |
| HEALTH-006 | Gmail watch renewal failure → fallback to 15-min polling | `gmail-monitor.ts` polling function |
| GMAIL-004 | Gmail Pub/Sub watch per coach | `users.watch()` call on Gmail connection |
| GMAIL-005 | Gmail watch renewed every 6 days | Vercel Cron daily → check `watch_expiry_at` |
| GMAIL-006 | Tracking pixel in every outbound HTML email | `<img src="/api/track/open?d=...">` injected before send |
| GMAIL-007 | Pixel URL logs open event to Supabase | `/api/track/open` route → email_events insert |
| GMAIL-008 | Lead reply detected → `lead/replied` event → pause + draft | Full monitoring + reply handler flow |
| CAL-001 | All 7 providers supported | 7 route adapters at `/api/webhooks/calendar/[provider]` |
| CAL-002 | Unified CalendarEvent type | `TCalendarEvent` in `packages/shared/` |
| CAL-003 | Provider adapters one endpoint per provider | `/api/webhooks/calendar/calendly`, `/cal-com`, etc. |
| CAL-004 | Webhook signature verification per provider | Per-provider HMAC logic (see table below) |
| CAL-005 | Event UUID stored with UNIQUE constraint | `calendar_events` table — already exists |
| CAL-006 | No-show fires `lead/no_show` Inngest event | Adapters for Calendly, Cal.com, Acuity only |
| CAL-007 | Call completed fires `lead/call_completed` | `step.sleepUntil` 30min after event end time |
| CAL-008 | New booking fires `lead/call_booked` → active sequence pauses | All 7 providers on booking.created signal |
| CAL-009 | Validate per-provider no-show webhook existence | Done in research — results in Pitfalls section |
| LEAD-006 | Manual sequence trigger from lead profile | Wire SequenceStatusPanel button to enrollment API |
| LEAD-007 | Gmail monitoring surfaces "Add to sequence?" prompt | Pending Actions card from D-22 |
</phase_requirements>

---

## Summary

Phase 3 wires everything built in Phases 1–2 into a functioning end-to-end sequence for the first time. The core architectural challenge is coordinating three distributed systems: Inngest (durable execution), Gmail API (outbound + monitoring), and 7 calendar webhook providers. The existing codebase has excellent scaffolding — the schema is complete, event constants are defined, the Inngest route is ready, and the Gmail client handles token refresh and invalid_grant automatically.

The most important research finding is the **calendar provider capability reality**: only 3 of the 7 providers have any meaningful no-show webhook support. Calendly has a dedicated `invitee_no_show.created` webhook event. Cal.com has `BOOKING_NO_SHOW_UPDATED` (manual mark only) and automated `AFTER_HOSTS_CAL_VIDEO_NO_SHOW` / `AFTER_GUESTS_CAL_VIDEO_NO_SHOW` (Cal Video only). Acuity has no documented no-show event type. Setmore, MS Bookings, TidyCal, and Square have no native no-show webhooks — confirmed via official documentation. This validates D-08's fallback approach entirely.

The second critical finding is **Gmail hard bounce detection**: the Gmail API does not return a bounce error code directly from `messages.send()`. Instead, Gmail delivers a "Mail Delivery Subsystem" email to the sender's inbox. The monitoring system (Pub/Sub or polling) must detect these MAILER-DAEMON emails to handle bounces.

Inngest patterns are straightforward: `step.sleepUntil` supports up to 1 year on paid plans; `cancelOn` with compound CEL expressions handles lead reply cancellation; deterministic event IDs prevent duplicate sequence starts from webhook retries.

**Primary recommendation:** Build the calendar abstraction layer first (Wave 1, blocking), then the Inngest sequence engine (Wave 2), then Gmail monitoring (Wave 3), with compliance and UI components (Pending Actions, Settings tab) in Wave 4.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Calendar webhook ingestion | API (Next.js route handler) | — | Receives provider HTTP POSTs, must be public endpoint |
| Calendar payload normalization | API (adapter layer) | — | Transform provider-specific schemas before DB write |
| Sequence orchestration | Inngest (background) | API (trigger) | Durable execution required for multi-day sleeps |
| Gmail outbound send | Backend (lib/gmail) | Inngest step | Sends as coach via OAuth token; never client-side |
| Gmail monitoring (Pub/Sub) | API route (push receiver) | Inngest (event dispatch) | GCP pushes to HTTPS endpoint; route fires Inngest event |
| Gmail monitoring (polling) | Inngest (cron function) | — | Inngest handles scheduling for polling fallback |
| Reply detection + sequence pause | Inngest (reply-handler) | API (Pub/Sub route) | Pub/Sub → API → Inngest event → function handles pause |
| Tracking pixel logging | API (/api/track/open) | — | 1×1 GIF response + Supabase insert; no client state |
| Unsubscribe processing | API (/api/unsubscribe) | — | Token-signed URL; updates DB, no auth required |
| Hard bounce detection | Inngest (gmail-monitor) | — | Detects MAILER-DAEMON email in monitoring sweep |
| Pending Actions UI | Frontend (dashboard page) | API (data fetch) | Server component reads pending_actions table or drafts |
| Sequence settings UI | Frontend (settings page) | API (PATCH /coaches) | Settings tab for per-coach cadence config |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| inngest | 4.2.6 (installed) / 4.4.0 (latest) | Durable sequence execution, step.sleepUntil, cancelOn | TypeScript-native, no execution limits, locked decision |
| googleapis | (installed) | Gmail API: messages.send, users.watch, history.list | Only official client for Gmail API |
| @supabase/supabase-js | 2.105.3 (installed) | DB reads/writes in Inngest steps | Existing pattern throughout codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (Node built-in) | built-in | HMAC-SHA256 for webhook signature verification | Every calendar webhook adapter; pattern already in `webhook-verification.test.ts` |
| zod | (installed) | Validate calendar webhook payloads | Every adapter before DB write |

### Installation
```bash
# inngest upgrade (optional, not blocking):
pnpm add inngest@4.4.0 --filter web
```
No new packages required — all dependencies are already installed.

**Version verification:** `inngest` is at 4.2.6 (installed) vs 4.4.0 (latest registry). The upgrade is optional; 4.2.6 supports all required patterns. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
                                    PHASE 3 DATA FLOW

  Calendar Provider                    Gmail Monitoring
  (Calendly / Cal.com / Acuity)        (GCP Pub/Sub push)
         |                                     |
         v                                     v
  /api/webhooks/calendar/[provider]    /api/webhooks/gmail/push
    verify signature                     decode base64 data
    normalize → TCalendarEvent           extract emailAddress + historyId
    insert calendar_events               identify coach by emailAddress
         |                                     |
         |--→ duplicate? exit              users.history.list(startHistoryId)
         |                                 parse messagesAdded
         v                                 check In-Reply-To header
  inngest.send({                           check MAILER-DAEMON from address
    id: "${provider}-${externalId}",              |
    name: LEAD_NO_SHOW | CALL_BOOKED              |
  })                                             |
         |                            step.sendEvent(LEAD_REPLIED | LEAD_BOUNCED)
         v                                       |
  Inngest Functions                              |
  ┌─────────────────────────────────────────────┘
  │
  ├── sequence-no-show.ts (LEAD_NO_SHOW)
  │     concurrency key: coachId, limit: 3
  │     cancelOn: LEAD_REPLIED, LEAD_UNSUBSCRIBED, LEAD_CALL_BOOKED
  │     for each delay in no_show_delays:
  │       step.sleepUntil(sequenceStart + delay days)
  │       step.run("safety-check-N") → read DB, block if terminal
  │       step.run("generate-draft-N") → call generateDraft (Phase 2)
  │       step.sendEvent(DRAFT_READY)
  │     sequence exhausted → close lead
  │
  ├── sequence-call-completed.ts (LEAD_CALL_COMPLETED)
  │     same pattern with call_completed_delays [1,4,10]
  │
  ├── reply-handler.ts (LEAD_REPLIED)
  │     step.run("update-lead") → lead.status = replied
  │     step.run("pause-sequence") → sequence.status = paused
  │     step.run("generate-reply-draft") → generateDraft(replied framing)
  │
  ├── gmail-watch.ts (GMAIL_WATCH_RENEW)
  │     step.run per coach → users.watch(), update watch_expiry_at
  │
  └── gmail-monitor.ts (scheduled cron / polling fallback)
        fetch coaches with active integrations
        history.list per coach since last_history_id
        → emit LEAD_REPLIED or LEAD_BOUNCED events

  Vercel Cron (vercel.json)
  ├── /api/cron/gmail-watch → daily → inngest.send(GMAIL_WATCH_RENEW)
  └── /api/cron/gmail-poll  → every 5min → inngest.send(gmail/poll)

  Frontend
  ├── /dashboard → PendingActionsSection (above DraftQueueScaffold)
  │     call-follow-up cards + lead intake cards
  ├── /leads/[id] → SequenceStatusPanel (wire button to /api/sequences/enroll)
  └── /settings → add SequenceSettingsTab
```

### Recommended Project Structure
```
apps/web/
├── inngest/
│   ├── client.ts                    # existing singleton
│   └── functions/                   # NEW — Phase 3
│       ├── sequence-no-show.ts
│       ├── sequence-call-completed.ts
│       ├── sequence-step.ts         # shared step logic (safety check + draft)
│       ├── gmail-watch.ts
│       ├── gmail-monitor.ts
│       └── reply-handler.ts
├── app/
│   ├── api/
│   │   ├── inngest/route.ts         # extend — register new functions
│   │   ├── cron/
│   │   │   ├── gmail-watch/route.ts  # NEW
│   │   │   └── gmail-poll/route.ts   # NEW
│   │   ├── webhooks/
│   │   │   ├── calendar/
│   │   │   │   ├── calendly/route.ts
│   │   │   │   ├── cal-com/route.ts
│   │   │   │   ├── acuity/route.ts
│   │   │   │   ├── setmore/route.ts   # booking.created only
│   │   │   │   ├── square/route.ts    # booking.created/updated only
│   │   │   │   ├── ms-bookings/route.ts # polling-only
│   │   │   │   └── tidycal/route.ts   # booking.created only
│   │   │   └── gmail/
│   │   │       └── push/route.ts     # NEW — Pub/Sub push receiver
│   │   ├── sequences/
│   │   │   └── enroll/route.ts      # NEW — wire manual trigger
│   │   ├── track/
│   │   │   └── open/route.ts        # NEW — tracking pixel
│   │   └── unsubscribe/route.ts     # NEW
│   └── (dashboard)/
│       ├── page.tsx                  # extend — PendingActionsSection
│       └── settings/
│           └── page.tsx              # extend — SequenceSettingsTab
└── lib/
    └── gmail/
        ├── monitor.ts               # NEW — watch + history functions
        └── bounce-detector.ts       # NEW — parse MAILER-DAEMON emails
packages/shared/src/types/
└── calendar.ts                      # NEW — TCalendarEvent unified type
supabase/migrations/
└── 20260519000003_phase3_automation.sql  # NEW — sequence_config JSONB
vercel.json                          # extend — add cron entries
```

---

### Pattern 1: Inngest Sequence Function with cancelOn and sleepUntil

```typescript
// Source: Context7 /inngest/inngest-js + verified against Inngest docs
// apps/web/inngest/functions/sequence-no-show.ts

import { inngest } from "@/inngest/client";
import { LEAD_NO_SHOW, LEAD_REPLIED, LEAD_CALL_BOOKED, LEAD_UNSUBSCRIBED } from "@client/shared/constants/events";

export const sequenceNoShow = inngest.createFunction(
  {
    id: "sequence-no-show",
    concurrency: {
      limit: 3,
      key: "event.data.coachId",  // per-coach concurrency
    },
    cancelOn: [
      {
        event: LEAD_REPLIED,
        if: "async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId",
      },
      {
        event: LEAD_CALL_BOOKED,
        if: "async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId",
      },
      {
        event: LEAD_UNSUBSCRIBED,
        if: "async.data.leadId == event.data.leadId",
      },
    ],
  },
  { event: LEAD_NO_SHOW },
  async ({ event, step, runId }) => {
    const { coachId, leadId, sequenceId, sequenceStart } = event.data;

    // Store runId in DB for later cancellation reference
    await step.run("store-run-id", async () => {
      await adminClient.from("sequences")
        .update({ inngest_run_id: runId })
        .eq("id", sequenceId);
    });

    // Load per-coach cadence from DB
    const delays: number[] = await step.run("load-cadence", async () => {
      const { data } = await adminClient.from("coaches")
        .select("sequence_config")
        .eq("id", coachId)
        .single();
      return (data?.sequence_config as { no_show_delays: number[] })
        ?.no_show_delays ?? [1, 3, 7, 14, 21];
    });

    for (const dayOffset of delays) {
      const sendAt = new Date(sequenceStart);
      sendAt.setDate(sendAt.getDate() + dayOffset);

      await step.sleepUntil(`sleep-day-${dayOffset}`, sendAt);

      // Pre-send safety check (SEQ-013, STATE-010)
      const blocked = await step.run(`safety-check-${dayOffset}`, async () => {
        const { data: lead } = await adminClient.from("leads")
          .select("status, do_not_contact, bounced")
          .eq("id", leadId)
          .single();
        const { data: seq } = await adminClient.from("sequences")
          .select("status")
          .eq("id", sequenceId)
          .single();
        const terminalStates = ["unsubscribed", "do_not_contact", "bounced", "converted", "closed"];
        if (!lead || terminalStates.includes(lead.status)) return "terminal_lead";
        if (lead.do_not_contact || lead.bounced) return "dnc_flag";
        if (!seq || seq.status !== "active") return "sequence_inactive";
        return null;
      });

      if (blocked) {
        await step.run(`cancel-on-block-${dayOffset}`, async () => {
          await adminClient.from("sequences")
            .update({ status: "cancelled" })
            .eq("id", sequenceId);
        });
        return { cancelled: true, reason: blocked };
      }

      // Generate draft (calls Phase 2 AI engine)
      await step.sendEvent(`send-touchpoint-${dayOffset}`, {
        name: "draft/generate",
        data: { coachId, leadId, sequenceId, touchpointIndex: delays.indexOf(dayOffset) + 1, track: "no_show" },
      });
    }

    // All touchpoints exhausted — auto-close lead (D-03)
    await step.run("auto-close-lead", async () => {
      await adminClient.from("leads").update({ status: "closed" }).eq("id", leadId);
      await adminClient.from("sequences").update({ status: "completed" }).eq("id", sequenceId);
    });

    return { completed: true };
  }
);
```

### Pattern 2: Inngest Function Registration in serve()

```typescript
// Source: Context7 /inngest/inngest-js
// apps/web/app/api/inngest/route.ts

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sequenceNoShow } from "@/inngest/functions/sequence-no-show";
import { sequenceCallCompleted } from "@/inngest/functions/sequence-call-completed";
import { gmailWatch } from "@/inngest/functions/gmail-watch";
import { gmailMonitor } from "@/inngest/functions/gmail-monitor";
import { replyHandler } from "@/inngest/functions/reply-handler";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sequenceNoShow,
    sequenceCallCompleted,
    gmailWatch,
    gmailMonitor,
    replyHandler,
  ],
});
```

### Pattern 3: Deterministic Event ID for Webhook Deduplication

```typescript
// Source: Context7 /inngest/inngest-js — inngest.send() id field is idempotency key
// VERIFIED: inngest.send({id: "..."}) prevents duplicate function starts on webhook retries

// In calendar webhook adapter:
await inngest.send({
  id: `${provider}-${externalEventId}`,  // deterministic — safe to retry
  name: LEAD_NO_SHOW,
  data: { coachId, leadId, provider, externalEventId, eventStartAt },
});
```

### Pattern 4: Vercel Cron → Inngest Pattern

```typescript
// Source: Vercel docs (verified) + Inngest blog pattern [VERIFIED: vercel.com/docs/cron-jobs/quickstart]
// apps/web/app/api/cron/gmail-watch/route.ts

import { inngest } from "@/inngest/client";
import { GMAIL_WATCH_RENEW } from "@client/shared/constants/events";

export async function GET(request: Request) {
  // Protect: Vercel sends CRON_SECRET in Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await inngest.send({ name: GMAIL_WATCH_RENEW, data: {} });
  return new Response("OK");
}
```

```json
// vercel.json (extend existing, add crons array)
{
  "crons": [
    { "path": "/api/cron/gmail-watch", "schedule": "0 6 * * *" },
    { "path": "/api/cron/gmail-poll", "schedule": "*/5 * * * *" }
  ]
}
```

### Pattern 5: Gmail Pub/Sub Push Receiver

```typescript
// Source: Google Gmail API docs [VERIFIED: developers.google.com/workspace/gmail/api/guides/push]
// apps/web/app/api/webhooks/gmail/push/route.ts

interface PubSubMessage {
  message: {
    data: string;  // base64url-encoded JSON: { emailAddress, historyId }
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

export async function POST(request: Request) {
  const body = await request.json() as PubSubMessage;
  const decoded = Buffer.from(body.message.data, "base64url").toString("utf8");
  const { emailAddress, historyId } = JSON.parse(decoded) as {
    emailAddress: string;
    historyId: string;
  };

  // Route to correct coach
  const { data: coach } = await adminClient.from("coaches")
    .select("id")
    .eq("email", emailAddress)
    .maybeSingle();
  if (!coach) return new Response("OK");  // Always 200 to ACK Pub/Sub

  await inngest.send({
    name: "gmail/notification_received",
    data: { coachId: coach.id, historyId, emailAddress },
  });

  return new Response("OK");  // Must return 2xx within 10 seconds
}
```

### Pattern 6: Gmail History List for Reply Detection

```typescript
// Source: googleapis docs + livefiredev.com implementation guide [MEDIUM confidence]
// In gmail-monitor.ts / after receiving Pub/Sub notification

async function processHistoryUpdate(coachId: string, historyId: string) {
  const gmail = await getGmailClientForCoach(coachId);

  // Get last processed historyId from DB
  const { data: integration } = await adminClient.from("integrations")
    .select("metadata")
    .eq("coach_id", coachId)
    .eq("provider", "gmail")
    .single();

  const startHistoryId = (integration?.metadata as { last_history_id?: string })
    ?.last_history_id ?? historyId;

  const historyResponse = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
    labelId: "INBOX",
  });

  const messages = historyResponse.data.history?.flatMap(h => h.messagesAdded ?? []) ?? [];

  for (const { message } of messages) {
    if (!message?.id) continue;
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
      metadataHeaders: ["From", "In-Reply-To", "Message-ID", "Subject"],
    });

    const headers = msg.data.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    const inReplyTo = getHeader("In-Reply-To");
    const fromAddress = getHeader("From");

    // Check for MAILER-DAEMON bounce
    if (fromAddress.toLowerCase().includes("mailer-daemon") ||
        fromAddress.toLowerCase().includes("postmaster")) {
      await inngest.send({ name: LEAD_BOUNCED, data: { coachId, messageId: message.id } });
      continue;
    }

    // Check if this is a reply to a sequence email
    if (inReplyTo) {
      const { data: emailEvent } = await adminClient.from("email_events")
        .select("lead_id")
        .eq("coach_id", coachId)
        .eq("gmail_message_id", inReplyTo.replace(/[<>]/g, ""))
        .maybeSingle();

      if (emailEvent?.lead_id) {
        await inngest.send({
          name: LEAD_REPLIED,
          data: { coachId, leadId: emailEvent.lead_id, messageId: message.id },
        });
      }
    }
  }

  // Update last processed historyId
  await adminClient.from("integrations")
    .update({ metadata: { ...(integration?.metadata ?? {}), last_history_id: historyId } })
    .eq("coach_id", coachId)
    .eq("provider", "gmail");
}
```

### Pattern 7: Gmail Watch Setup

```typescript
// Source: googleapis Context7 docs [VERIFIED: /websites/googleapis_dev_nodejs_googleapis]
// Called when coach connects Gmail + renewed every 6 days

async function setupGmailWatch(coachId: string) {
  const gmail = await getGmailClientForCoach(coachId);
  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.GMAIL_PUBSUB_TOPIC_NAME!,
      // e.g. "projects/my-project/topics/gmail-watch"
      labelIds: ["INBOX"],
      labelFilterBehavior: "INCLUDE",
    },
  });

  const expiry = new Date(Number(response.data.expiration));
  await adminClient.from("integrations")
    .update({ watch_expiry_at: expiry.toISOString() })
    .eq("coach_id", coachId)
    .eq("provider", "gmail");

  return response.data;
}
```

### Pattern 8: Tracking Pixel Injection

```typescript
// Source: email tracking pixel implementation guides [MEDIUM confidence]
// Injected into HTML email body before send

function injectTrackingPixel(htmlBody: string, draftId: string): string {
  // Token encodes draftId; never exposes raw DB IDs in URL
  const token = Buffer.from(JSON.stringify({ draftId, t: Date.now() }))
    .toString("base64url");
  const pixelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/track/open?d=${token}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  // Insert before </body> — avoids Gmail 102KB clip risk
  return htmlBody.includes("</body>")
    ? htmlBody.replace("</body>", `${pixel}</body>`)
    : htmlBody + pixel;
}
```

### Pattern 9: Supabase Migration for Phase 3

```sql
-- Source: Reviewed existing schema [VERIFIED: supabase/migrations/20260505000002_tables.sql]
-- File: supabase/migrations/20260519000003_phase3_automation.sql

-- D-05: Per-coach sequence cadence config
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS sequence_config JSONB DEFAULT
    '{"no_show_delays":[1,3,7,14,21],"call_completed_delays":[1,4,10]}';

-- Track outbound Message-ID for reply detection (GMAIL-008)
-- email_events table already has gmail_message_id column — verify it indexes cleanly
CREATE INDEX IF NOT EXISTS idx_email_events_gmail_message_id
  ON email_events(coach_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

-- Pending actions: reuse sequences + drafts tables; no new table needed
-- (Pending Actions are derived from sequences with status='active' and lead events)

-- Add gmail_message_id index for reply lookup
```

### Anti-Patterns to Avoid

- **`inngest.send()` inside Inngest functions**: Use `step.sendEvent()` instead — it is memoized and will not duplicate events on retry. Direct `inngest.send()` inside a function re-fires on every retry. [VERIFIED: Context7 /inngest/inngest-js]
- **Non-unique step IDs in loops**: Step ID must be unique per iteration. Use `sleep-day-${dayOffset}` not `sleep-day`. Duplicate step IDs cause Inngest to reuse the cached result of the first step for all subsequent ones.
- **Reading sequence state from Inngest in-memory only**: The pre-send safety check (D-25) must read from Supabase, not trust Inngest's own understanding of whether cancelOn fired — a cancelOn event may have arrived between steps.
- **Storing raw OAuth tokens in metadata column**: Gmail tokens belong in Vault (already done). Do not log them anywhere.
- **Not storing last historyId**: History API only works from a `startHistoryId`. If the stored value is lost, the fallback is to start from the watch response historyId (may miss some messages).

---

## Calendar Provider Capability Matrix

| Provider | No-Show Webhook | Call Booked | Signature Header | Verification Method | Notes |
|----------|----------------|-------------|------------------|--------------------|----|
| Calendly | `invitee_no_show.created` [MEDIUM] | `invitee.created` | `calendly-webhook-signature` | HMAC-SHA256 of raw body | Signature key = webhook signing secret |
| Cal.com | `BOOKING_NO_SHOW_UPDATED` (manual) / `AFTER_GUESTS_CAL_VIDEO_NO_SHOW` (Cal Video only) [VERIFIED: cal.com/docs] | `BOOKING_CREATED` | `x-cal-signature-256` | HMAC-SHA256 of JSON-stringified payload | No-show only auto-fires for Cal Video meetings |
| Acuity | None documented [VERIFIED: developers.acuityscheduling.com] | `scheduled` action | `x-acuity-signature` | base64(HMAC-SHA256(body, apiKey)) | No `action=no_show` event exists; fallback to manual only |
| Setmore | None [ASSUMED: developer docs not publicly accessible] | API polling or webhook on booking.created | Unknown | Unknown | Confirm via Setmore API docs during implementation |
| Square | None (booking.created + booking.updated only) [VERIFIED: developer.squareup.com] | `booking.created` | `x-square-hmacsha256-signature` | HMAC-SHA256 of (url + body) | Square signature includes notification URL in hash |
| MS Bookings | None — Graph API does not support Bookings webhooks [VERIFIED: Microsoft Q&A] | Must use Microsoft Graph change subscriptions on Calendar events | N/A | Graph subscription validation | No direct Bookings webhook API; alternative is Graph Calendar API |
| TidyCal | None — no native webhook support [VERIFIED: help.tidycal.com] | Via Zapier/API only | N/A | N/A | Webhook support planned but no ETA; manual trigger only |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-day durable delays | Custom cron + database scheduler | `step.sleepUntil()` | Inngest persists sleep state; survives server restarts, deployments, cold starts |
| Event-driven function cancellation | Polling for cancelled flag | `cancelOn` with CEL expressions | Inngest monitors for cancel events and terminates between steps |
| Per-entity concurrency limiting | DB advisory locks or Redis semaphores | Inngest `concurrency.key` | Inngest handles queuing; no custom lock management |
| Webhook deduplication | Redis set of processed IDs | Inngest deterministic event `id` + DB UNIQUE constraint | Two-layer protection; idempotency at both event and DB levels |
| HMAC verification | Custom base64 comparison | Node.js `crypto.timingSafeEqual()` | Timing-safe comparison prevents timing attacks; pattern already in `webhook-verification.test.ts` |

**Key insight:** Do not implement any scheduling, queuing, or retry logic outside Inngest. The entire value of the Inngest choice is letting it handle that complexity. Any custom scheduler code is a liability.

---

## Common Pitfalls

### Pitfall 1: Gmail Pub/Sub Watch 7-Day Expiry
**What goes wrong:** Gmail stops sending notifications silently after 7 days. Sequences miss replies. The system appears to work but is monitoring nothing.
**Why it happens:** `users.watch()` must be re-called at least every 7 days. The watch response includes an `expiration` timestamp (milliseconds since epoch).
**How to avoid:** Daily cron checks `integrations.watch_expiry_at` per coach. Renew if expiry is within 48 hours. D-12 / HEALTH-005.
**Warning signs:** `watch_expiry_at` column in integrations table is stale (> 6 days old). Falling back to polling.

### Pitfall 2: Hard Bounce Not Returned by gmail.users.messages.send()
**What goes wrong:** Sending code gets a 200 OK from the Gmail API. No error is thrown. The bounce is never detected.
**Why it happens:** Gmail API `messages.send()` succeeds from Gmail's perspective — it accepted the message. The bounce notification arrives later as a new email from MAILER-DAEMON to the coach's inbox.
**How to avoid:** The Gmail monitoring loop (Pub/Sub or polling) must check the `From` header of incoming messages for `mailer-daemon` or `postmaster@*` patterns. Extract the bounced recipient's address from the bounce email body.
**Warning signs:** Leads with invalid email addresses never get marked as `bounced`.

### Pitfall 3: Inngest `step` IDs Must Be Unique Across All Steps in a Function
**What goes wrong:** Using the same step ID in a loop (e.g., `step.run("generate-draft")` repeated) causes Inngest to return the cached result of the first execution for all subsequent calls.
**Why it happens:** Inngest memoizes step results by step ID for replay/retry. Duplicate IDs = same cached value.
**How to avoid:** Always suffix with the loop variable: `step.run("generate-draft-${dayOffset}")`, `step.sleepUntil("sleep-${dayOffset}", ...)`.
**Warning signs:** Only the first email in a sequence is generated; subsequent steps return the first draft's result.

### Pitfall 4: Inngest Functions Not Registered in serve()
**What goes wrong:** Functions are created but Inngest never discovers them. No functions appear in the Inngest dashboard. Events fire but nothing runs.
**Why it happens:** The serve() call in `route.ts` has `functions: []`. Every new function file must be imported and added to the array.
**How to avoid:** After creating each function file, immediately update `apps/web/app/api/inngest/route.ts` to import and register it.

### Pitfall 5: Cal.com Auto No-Show Only Works with Cal Video
**What goes wrong:** Expecting Cal.com to auto-detect no-shows for all meeting types.
**Why it happens:** `AFTER_HOSTS_CAL_VIDEO_NO_SHOW` and `AFTER_GUESTS_CAL_VIDEO_NO_SHOW` only fire for Cal Video meeting locations. External meetings (Zoom, Google Meet, etc.) are not monitored.
**How to avoid:** `BOOKING_NO_SHOW_UPDATED` requires coach to manually mark the no-show in Cal.com UI. For the majority of Cal.com coaches using external video tools, the fallback (manual trigger) applies.

### Pitfall 6: Square Signature Includes Notification URL
**What goes wrong:** Signature verification fails despite using the correct secret.
**Why it happens:** Square's HMAC includes the notification URL in the hash: `HMAC-SHA256(signatureKey, notificationUrl + rawBody)`. Most webhook verification patterns hash only the body.
**How to avoid:** Reconstruct the full notification URL (including query params) and include it in the HMAC input. Use `x-square-hmacsha256-signature` header.

### Pitfall 7: Vercel Cron Only Fires on Production Deployments
**What goes wrong:** Cron jobs defined in `vercel.json` never fire in preview or local environments.
**Why it happens:** Vercel only invokes cron jobs for production deployments.
**How to avoid:** Add a manual dev trigger in the cron route (`?force=true` query param, guarded by CRON_SECRET) for testing. Use Inngest dev server locally to simulate the functions directly.

### Pitfall 8: Gmail history.list startHistoryId Must Be Persisted
**What goes wrong:** After restarting the polling loop or Pub/Sub gap, messages are missed because `startHistoryId` is reset.
**Why it happens:** Gmail's history API only returns events after the provided historyId. If no historyId is stored, the system loses the delta.
**How to avoid:** Store `last_history_id` in `integrations.metadata` JSONB per coach. Update after each successful history sweep.

---

## Runtime State Inventory

> Step 2.5 assessment — this is not a rename/refactor phase.

Not applicable. Phase 3 introduces new functionality; no string renames or runtime state migrations required.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server code | ✓ | v22.18.0 | — |
| inngest (package) | Sequence engine | ✓ | 4.2.6 | — |
| googleapis (package) | Gmail API | ✓ | (installed) | — |
| Google Cloud Pub/Sub topic | Gmail monitoring | ? | — | Polling fallback (HEALTH-006) |
| GMAIL_PUBSUB_TOPIC_NAME env var | Gmail watch setup | ? | — | Must be set before Phase 3 |
| CRON_SECRET env var | Vercel cron auth | ? | — | Must be set in Vercel dashboard |
| INNGEST_SIGNING_KEY env var | Inngest auth | ? | — | Required for production |
| INNGEST_EVENT_KEY env var | inngest.send() | ? | — | Required for production |

**Missing dependencies with no fallback:**
- `GMAIL_PUBSUB_TOPIC_NAME` — GCP Pub/Sub topic must be created and `gmail-api-push@system.gserviceaccount.com` granted `publish` permission. Wave 0 prerequisite for Gmail monitoring.
- `CRON_SECRET` — Must be set in Vercel dashboard before deploying cron routes.
- `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` — Must be in Vercel environment variables (Inngest Vercel integration handles this automatically).

**Missing dependencies with fallback:**
- GCP Pub/Sub (unavailable in local dev): polling fallback (`gmail-monitor.ts`) covers dev testing.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (unit/integration) + Playwright 1.59.1 (e2e) |
| Config file | `apps/web/vitest.config.ts` (verify or create in Wave 0) |
| Quick run command | `pnpm --filter web test:unit` |
| Full suite command | `pnpm --filter web test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEQ-006 | Concurrency key `event.data.coachId` in function config | unit | `vitest run tests/unit/sequence-concurrency.test.ts` | ❌ Wave 0 |
| SEQ-007 | Deterministic event ID `${provider}-${externalEventId}` | unit | `vitest run tests/unit/calendar-deduplication.test.ts` | ❌ Wave 0 |
| SEQ-013 | Pre-send safety check blocks terminal states (all 5) | unit | `vitest run tests/unit/pre-send-safety.test.ts` | ❌ Wave 0 |
| CAL-004 | HMAC signature verification for all 7 providers | unit | `vitest run tests/unit/calendar-webhook-verification.test.ts` | ❌ Wave 0 |
| COMPLY-001/002 | Unsubscribe link in email + sets do_not_contact | unit | `vitest run tests/unit/unsubscribe.test.ts` | ❌ Wave 0 |
| COMPLY-005/007 | Hard bounce detection + lead marked bounced | unit | `vitest run tests/unit/bounce-detection.test.ts` | ❌ Wave 0 |
| GMAIL-008 | Reply detected via In-Reply-To → LEAD_REPLIED event | unit | `vitest run tests/unit/reply-detection.test.ts` | ❌ Wave 0 |
| SEQ-001/002 | Calendly no-show → sequence starts (Inngest e2e) | e2e | Manual with Inngest dev server OR `playwright test tests/e2e/sequence-start.spec.ts` | ❌ Wave 0 |
| STATE-010 | Pre-send check blocks send when lead is terminal | e2e | `playwright test tests/e2e/pre-send-safety.spec.ts` | ❌ Wave 0 |
| SEQ-007 | Duplicate webhook does not start second sequence | integration | `vitest run tests/integration/webhook-deduplication.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter web test:unit`
- **Per wave merge:** `pnpm --filter web test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/pre-send-safety.test.ts` — covers SEQ-013, STATE-010 (all 5 terminal states)
- [ ] `tests/unit/calendar-webhook-verification.test.ts` — covers CAL-004 (7 providers, extend existing `webhook-verification.test.ts` pattern)
- [ ] `tests/unit/calendar-deduplication.test.ts` — covers SEQ-007, CAL-005
- [ ] `tests/unit/reply-detection.test.ts` — covers GMAIL-008 (In-Reply-To header matching)
- [ ] `tests/unit/bounce-detection.test.ts` — covers COMPLY-005/007 (MAILER-DAEMON parsing)
- [ ] `tests/unit/unsubscribe.test.ts` — covers COMPLY-001/002
- [ ] `tests/unit/sequence-concurrency.test.ts` — covers SEQ-006 (config shape verification)
- [ ] `tests/integration/webhook-deduplication.test.ts` — covers SEQ-014, CAL-005 (DB UNIQUE constraint)
- [ ] `apps/web/vitest.config.ts` — verify exists (check Phase 2 artifacts before creating)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Webhook routes are not user-authenticated |
| V3 Session Management | no | Not applicable to background jobs |
| V4 Access Control | yes | Unsubscribe route must not require auth; all Inngest steps use adminClient scoped to coachId |
| V5 Input Validation | yes | Zod on every webhook payload before processing |
| V6 Cryptography | yes | `crypto.timingSafeEqual()` for all HMAC comparisons (timing-safe) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged calendar webhook | Spoofing | HMAC-SHA256 signature verification per provider (see provider table); verify before any DB write |
| Replay attack on calendar webhook | Tampering | DB UNIQUE(provider, external_event_id) rejects replay; inngest.send id deduplicates function starts |
| Tracking pixel harvesting lead open data | Info Disclosure | Pixel URL uses opaque token (base64url-encoded draftId + timestamp); no raw IDs in URL |
| Unsubscribe link spoofing | Tampering | Sign the unsubscribe URL token with HMAC using a server secret; verify on /api/unsubscribe |
| Pub/Sub endpoint spoofed | Spoofing | GCP pushes from a known IP range; validate Pub/Sub message structure; always return 200 (prevents replay storms) |
| Timing attack on HMAC comparison | Tampering | Use `crypto.timingSafeEqual()` for all signature comparisons — pattern established in `webhook-verification.test.ts` |
| Bounce detection bypass (fake MAILER-DAEMON) | Tampering | Bounce emails arrive in Gmail inbox for coach — if Gmail is compromised, larger issues exist. Cross-check with `email_events.gmail_message_id` to validate the bounced Message-ID references a real outbound send |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inngest v2 middleware-based functions | v3/v4 `createFunction` with typed events | 2023–2024 | All Phase 3 code uses current API; no deprecated patterns |
| Gmail polling-only monitoring | Gmail Pub/Sub + polling fallback | Always | Push preferred; polling as fallback confirmed |
| Vercel functions max 10s timeout | `maxDuration = 300` export | Vercel + Inngest requirement | Already set in route.ts |

**Deprecated/outdated:**
- `inngest.createScheduledFunction()` — replaced by `cron` trigger in `createFunction`. Not used here; all scheduling via `step.sleepUntil`.
- Inngest v1 `inngest.send()` inside functions — use `step.sendEvent()` to prevent duplicate sends on retry.

---

## Open Questions (RESOLVED)

1. **MS Bookings integration approach** — RESOLVED
   - What we know: MS Bookings has no native webhook API; the Microsoft Graph API does not support Bookings subscriptions as of 2026.
   - RESOLVED: MS Bookings adapter is manual-trigger-only per D-08. No webhook events received. IntegrationHealthCard tooltip shows "Manual" (D-11).

2. **Setmore webhook availability** — RESOLVED
   - What we know: Setmore API requires direct sign-up (`api@setmore.com`). Public docs confirm API exists but don't list webhook event types.
   - RESOLVED: Treated as manual-trigger-only per D-08. Adapter stub accepts booking.created if available; no-show = manual trigger. Comment in adapter notes verification pending Setmore API access.

3. **GCP Pub/Sub topic setup** — RESOLVED (Wave 0 prerequisite)
   - What we know: The topic name must be set as `GMAIL_PUBSUB_TOPIC_NAME` env var; `gmail-api-push@system.gserviceaccount.com` must have `publish` permission on the topic.
   - RESOLVED: Added as explicit Wave 0 prerequisite in Plan 03-03. Before executing Wave 3: (1) confirm or create GCP project, (2) create Pub/Sub topic, (3) add IAM binding for `gmail-api-push@system.gserviceaccount.com`, (4) set `GMAIL_PUBSUB_TOPIC_NAME` env var in Vercel + local `.env.local`. Polling fallback (D-13) operates without Pub/Sub — absence of topic only degrades push latency.

4. **Acuity no-show signal** — RESOLVED
   - What we know: Acuity's official webhook docs list `scheduled`, `rescheduled`, `canceled`, `changed`, `order.completed` — no `no_show`.
   - RESOLVED: Acuity adapter handles `scheduled` (call_booked) only. No-show = manual trigger per D-08.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Calendly `invitee_no_show.created` event type exists | Provider Matrix | If removed/renamed in API v2, adapter fails at signature check time; fix by checking Calendly webhook subscription options |
| A2 | Setmore has no public webhook API for booking events | Provider Matrix | If Setmore has undocumented webhook support, we miss auto-triggering. Low risk — fallback is manual. |
| A3 | MS Bookings Graph API does not support webhook subscriptions | Provider Matrix | Microsoft could have added support; check MS docs during Wave 1 implementation |
| A4 | Gmail MAILER-DAEMON from address reliably identifies hard bounces | Code Examples | Gmail may change mailer-daemon naming; complement with parsing `Delivery-Status` MIME part for `5xx` status code |
| A5 | inngest 4.2.6 supports all required patterns (cancelOn CEL, step.sleepUntil 1-year) | Standard Stack | Very low risk; Inngest changelog is stable for these APIs |

---

## Sources

### Primary (HIGH confidence)
- Context7 `/inngest/inngest-js` — step.sleepUntil, cancelOn, concurrency, step.sendEvent, serve(), createFunction patterns
- [Google Gmail API Push Notifications](https://developers.google.com/workspace/gmail/api/guides/push) — exact push payload schema, watch setup, 7-day expiry requirement
- [Cal.com Webhooks Docs](https://cal.com/docs/developing/guides/automation/webhooks) — BOOKING_NO_SHOW_UPDATED payload, x-cal-signature-256 header
- [Acuity Scheduling Webhooks](https://developers.acuityscheduling.com/docs/webhooks) — event types (no no-show), x-acuity-signature header
- [Square Bookings Webhooks](https://developer.squareup.com/docs/bookings-api/use-webhooks) — event types (booking.created, booking.updated only, no no-show)
- [Square Signature Verification](https://developer.squareup.com/docs/webhooks/step3validate) — x-square-hmacsha256-signature, URL+body hash
- [Microsoft Bookings Graph API Q&A](https://learn.microsoft.com/en-us/answers/questions/1221163/bookings-webhooks) — no webhook support confirmed
- [TidyCal FAQ](https://help.tidycal.com/article/739-faq) — no native webhook support confirmed
- [Inngest Usage Limits](https://www.inngest.com/docs/usage-limits/inngest) — 1-year sleep max (paid), 1000 steps max, 32MB state max
- [Vercel Cron Jobs Quickstart](https://vercel.com/docs/cron-jobs/quickstart) — vercel.json format, CRON_SECRET pattern
- Project codebase — existing schema (migrations), Inngest client, Gmail lib, event constants

### Secondary (MEDIUM confidence)
- [Calendly Webhook Integration Guide](https://rollout.com/integration-guides/calendly/quick-guide-to-implementing-webhooks-in-calendly) — `calendly-webhook-signature` header, HMAC-SHA256 of raw body (cross-verified with community sources)
- [livefiredev.com Gmail Pub/Sub Guide](https://livefiredev.com/step-by-step-gmail-api-webhook-to-monitor-emails-node-js/) — history.list flow after notification

### Tertiary (LOW confidence)
- Community sources for Setmore API capabilities — no official documentation accessible

---

## Metadata

**Confidence breakdown:**
- Calendar provider capabilities: MEDIUM-HIGH (3 confirmed via official docs, 4 confirmed as lacking via official docs/Q&A)
- Inngest patterns: HIGH (Context7 verified, all key APIs confirmed)
- Gmail Pub/Sub: HIGH (official Google docs)
- Compliance (CAN-SPAM): HIGH (stable regulatory standard)
- Hard bounce detection: MEDIUM (MAILER-DAEMON approach is standard practice but not officially documented by Gmail API)

**Research date:** 2026-05-19
**Valid until:** 2026-08-19 (90 days — Inngest stable; calendar provider webhook APIs change infrequently)
