# Phase 3: Automation - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 22 new/modified files
**Analogs found:** 19 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/web/inngest/functions/sequence-no-show.ts` | service | event-driven | `apps/web/app/api/drafts/generate/route.ts` (DB reads + state) | role-match |
| `apps/web/inngest/functions/sequence-call-completed.ts` | service | event-driven | `apps/web/app/api/drafts/generate/route.ts` | role-match |
| `apps/web/inngest/functions/sequence-step.ts` | utility | event-driven | `packages/shared/src/lib/state-machine.ts` + `app/api/drafts/generate/route.ts` | partial |
| `apps/web/inngest/functions/gmail-watch.ts` | service | request-response | `apps/web/lib/gmail/client.ts` | role-match |
| `apps/web/inngest/functions/gmail-monitor.ts` | service | batch | `apps/web/lib/gmail/thread.ts` + `apps/web/lib/gmail/error-handler.ts` | role-match |
| `apps/web/inngest/functions/reply-handler.ts` | service | event-driven | `apps/web/app/api/leads/[id]/route.ts` (PATCH pattern) | role-match |
| `apps/web/app/api/inngest/route.ts` *(extend)* | config | — | itself (lines 1–7) | exact |
| `apps/web/app/api/webhooks/calendar/[provider]/route.ts` | middleware | request-response | `apps/web/app/api/webhooks/transcripts/fireflies/route.ts` | exact |
| `apps/web/app/api/webhooks/gmail/push/route.ts` | middleware | request-response | `apps/web/app/api/webhooks/transcripts/zoom/route.ts` | exact |
| `apps/web/app/api/sequences/enroll/route.ts` | controller | request-response | `apps/web/app/api/leads/[id]/route.ts` (PATCH) | role-match |
| `apps/web/app/api/cron/gmail-watch/route.ts` | controller | request-response | `apps/web/app/api/webhooks/instagram/route.ts` (GET handler shape) | role-match |
| `apps/web/app/api/cron/gmail-poll/route.ts` | controller | request-response | `apps/web/app/api/cron/gmail-watch/route.ts` | exact |
| `apps/web/app/api/track/open/route.ts` | controller | request-response | `apps/web/app/api/leads/[id]/thread/route.ts` | role-match |
| `apps/web/app/api/unsubscribe/route.ts` | controller | request-response | `apps/web/app/api/leads/[id]/route.ts` (PATCH + no-auth) | role-match |
| `apps/web/lib/calendar/index.ts` *(adapter abstraction)* | utility | transform | `apps/web/lib/transcripts/lead-matching.ts` | role-match |
| `apps/web/lib/gmail/monitor.ts` | service | batch | `apps/web/lib/gmail/thread.ts` | exact |
| `apps/web/lib/gmail/bounce-detector.ts` | utility | transform | `apps/web/lib/gmail/error-handler.ts` | role-match |
| `packages/shared/src/types/calendar.ts` | model | — | `packages/shared/src/types/index.ts` | exact |
| `supabase/migrations/20260519000003_phase3_automation.sql` | migration | — | `supabase/migrations/20260519000001_phase2_intelligence.sql` | exact |
| `apps/web/app/(dashboard)/dashboard/page.tsx` *(extend)* | component | request-response | itself | exact |
| `apps/web/app/(dashboard)/settings/page.tsx` *(extend — add Sequence tab)* | component | CRUD | `apps/web/app/(dashboard)/settings/voice/page.tsx` | exact |
| `apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx` *(wire button)* | component | request-response | `apps/web/app/(dashboard)/leads/[id]/manual-state-override.tsx` | exact |

---

## Pattern Assignments

### `apps/web/inngest/functions/sequence-no-show.ts` (service, event-driven)

**Analog:** `apps/web/app/api/drafts/generate/route.ts` (DB patterns) + RESEARCH.md Pattern 1

**Imports pattern** — copy from RESEARCH.md Pattern 1 and combine with existing adminClient import:
```typescript
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import {
  LEAD_NO_SHOW, LEAD_REPLIED, LEAD_CALL_BOOKED, LEAD_UNSUBSCRIBED
} from "@client/shared/constants/events";
import { TERMINAL_STATES } from "@client/shared";
```

**Inngest function shell** — RESEARCH.md Pattern 1 (lines 309–399). Key structural points:
- `id: "sequence-no-show"` (kebab-case, matches file name)
- `concurrency: { limit: 3, key: "event.data.coachId" }`
- `cancelOn` array with CEL: `"async.data.leadId == event.data.leadId && async.data.coachId == event.data.coachId"`
- Trigger: `{ event: LEAD_NO_SHOW }`
- Function signature: `async ({ event, step, runId }) => {`

**Per-coach cadence load** — step.run reading `coaches.sequence_config` JSONB:
```typescript
const delays: number[] = await step.run("load-cadence", async () => {
  const { data } = await adminClient.from("coaches")
    .select("sequence_config")
    .eq("id", coachId)
    .single();
  return (data?.sequence_config as { no_show_delays: number[] })
    ?.no_show_delays ?? [1, 3, 7, 14, 21];
});
```

**Pre-send safety check** — synchronous step.run gate (D-25). Uses `TERMINAL_STATES` from `packages/shared/src/lib/state-machine.ts` (lines 3–9):
```typescript
const blocked = await step.run(`safety-check-${dayOffset}`, async () => {
  const { data: lead } = await adminClient.from("leads")
    .select("status, do_not_contact, bounced")
    .eq("id", leadId).single();
  const { data: seq } = await adminClient.from("sequences")
    .select("status").eq("id", sequenceId).single();
  if (!lead || (TERMINAL_STATES as readonly string[]).includes(lead.status)) return "terminal_lead";
  if (lead.do_not_contact || lead.bounced) return "dnc_flag";
  if (!seq || seq.status !== "active") return "sequence_inactive";
  return null;
});
if (blocked) {
  await step.run(`cancel-on-block-${dayOffset}`, async () => {
    await adminClient.from("sequences").update({ status: "cancelled" }).eq("id", sequenceId);
  });
  return { cancelled: true, reason: blocked };
}
```

**Step ID uniqueness** — suffix every step with loop variable (RESEARCH.md Pitfall 3):
```typescript
await step.sleepUntil(`sleep-day-${dayOffset}`, sendAt);       // unique per iteration
await step.run(`safety-check-${dayOffset}`, async () => { …  }); // unique per iteration
await step.sendEvent(`send-touchpoint-${dayOffset}`, { … });   // unique per iteration
```

**draft generation call** — use `step.sendEvent` not `inngest.send` (RESEARCH.md anti-pattern note):
```typescript
await step.sendEvent(`send-touchpoint-${dayOffset}`, {
  name: "draft/generate",
  data: { coachId, leadId, sequenceId, touchpointIndex: delays.indexOf(dayOffset) + 1, track: "no_show" },
});
```

**Terminal close** — after loop exhaustion (D-03):
```typescript
await step.run("auto-close-lead", async () => {
  await adminClient.from("leads").update({ status: "closed" }).eq("id", leadId);
  await adminClient.from("sequences").update({ status: "completed" }).eq("id", sequenceId);
});
```

---

### `apps/web/inngest/functions/sequence-call-completed.ts` (service, event-driven)

**Analog:** `apps/web/inngest/functions/sequence-no-show.ts` (once written — identical structure, different delays + track name)

**Differences from sequence-no-show.ts:**
- `id: "sequence-call-completed"`
- Trigger: `{ event: LEAD_CALL_COMPLETED }`
- Cadence key: `call_completed_delays` (default `[1, 4, 10]`)
- `track: "call_completed"` in the step.sendEvent payload
- cancelOn: same events (LEAD_REPLIED, LEAD_CALL_BOOKED, LEAD_UNSUBSCRIBED)

**Pending Actions card creation** (D-09) — fires before the loop, 30min after event end:
```typescript
const callEndTime = new Date(event.data.eventEndAt);
callEndTime.setMinutes(callEndTime.getMinutes() + 30);
await step.sleepUntil("wait-for-call-end", callEndTime);

await step.run("create-pending-action-card", async () => {
  await adminClient.from("pending_actions").insert({
    coach_id: coachId,
    lead_id: leadId,
    type: "call_follow_up",
    payload: { leadName: event.data.leadName, eventId: event.data.calendarEventId },
  });
});
// Function pauses here — coach action (Closed/Start follow-up/Rescheduled) fires LEAD_CALL_COMPLETED
// with action field to resume or complete
```

---

### `apps/web/inngest/functions/sequence-step.ts` (utility, event-driven)

**Analog:** `apps/web/app/api/drafts/generate/route.ts` (lines 107–207) — the generateDraft call pattern

This file contains shared step logic extracted from sequence-no-show and sequence-call-completed. It is a helper module (not an Inngest function itself) unless the planner decides to make it a separate triggered function.

**Core pattern** — mirrors fire-and-forget draft generation from `apps/web/app/api/drafts/generate/route.ts`:
```typescript
// Import pattern (lines 1-6 of drafts/generate/route.ts)
import { isHardBlocked } from '@client/ai-engine';
import { VoiceProfileSchema } from '@client/shared/validators';
import type { TLeadStatus } from '@client/shared/types';
```

**generateDraft call** — copy exact argument shape from `apps/web/app/api/drafts/generate/route.ts` lines 138–152.

---

### `apps/web/inngest/functions/gmail-watch.ts` (service, request-response)

**Analog:** `apps/web/lib/gmail/client.ts` (lines 1–60) — pattern for getting Gmail client per coach

**Imports:**
```typescript
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { getGmailClientForCoach } from "@/lib/gmail/client";
import { GMAIL_WATCH_RENEW } from "@client/shared/constants/events";
```

**Function shell:**
```typescript
export const gmailWatch = inngest.createFunction(
  { id: "gmail-watch" },
  { event: GMAIL_WATCH_RENEW },
  async ({ step }) => {
    const coaches = await step.run("fetch-coaches-with-gmail", async () => {
      const { data } = await adminClient.from("integrations")
        .select("coach_id, watch_expiry_at")
        .eq("provider", "gmail")
        .eq("status", "connected");
      return data ?? [];
    });

    for (const { coach_id, watch_expiry_at } of coaches) {
      const expiresAt = watch_expiry_at ? new Date(watch_expiry_at) : null;
      const renewalThreshold = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h
      if (expiresAt && expiresAt > renewalThreshold) continue;

      await step.run(`renew-watch-${coach_id}`, async () => {
        const gmail = await getGmailClientForCoach(coach_id);
        const response = await gmail.users.watch({
          userId: "me",
          requestBody: {
            topicName: process.env.GMAIL_PUBSUB_TOPIC_NAME!,
            labelIds: ["INBOX"],
            labelFilterBehavior: "INCLUDE",
          },
        });
        const expiry = new Date(Number(response.data.expiration));
        await adminClient.from("integrations")
          .update({ watch_expiry_at: expiry.toISOString() })
          .eq("coach_id", coach_id).eq("provider", "gmail");
      });
    }
  }
);
```

**Token retrieval** — use `getGmailClientForCoach(coachId)` from `apps/web/lib/gmail/client.ts` (line 6). Never retrieve tokens directly — the client handles Vault retrieval and auto-refresh.

---

### `apps/web/inngest/functions/gmail-monitor.ts` (service, batch)

**Analog:** `apps/web/lib/gmail/thread.ts` (lines 38–64) — pattern for Gmail API calls per coach; `apps/web/lib/gmail/error-handler.ts` (lines 19–39) — pattern for reacting to Gmail errors

**Function shell** — polling fallback, triggered by cron event:
```typescript
export const gmailMonitor = inngest.createFunction(
  { id: "gmail-monitor" },
  { event: "gmail/poll" },
  async ({ step }) => { … }
);
```

**History list pattern** — from RESEARCH.md Pattern 6. Key points:
- Read `last_history_id` from `integrations.metadata` JSONB per coach
- Call `gmail.users.history.list({ userId: "me", startHistoryId, historyTypes: ["messageAdded"], labelId: "INBOX" })`
- For each message: fetch headers with `format: "metadata"`, `metadataHeaders: ["From", "In-Reply-To", "Message-ID"]`
- Use `extractHeader` helper from `apps/web/lib/gmail/thread.ts` (lines 31–36)

**Reply detection** — check `In-Reply-To` header against `email_events.gmail_message_id`:
```typescript
const { data: emailEvent } = await adminClient.from("email_events")
  .select("lead_id")
  .eq("coach_id", coachId)
  .eq("gmail_message_id", inReplyTo.replace(/[<>]/g, ""))
  .maybeSingle();
if (emailEvent?.lead_id) {
  await step.sendEvent("fire-replied", { name: LEAD_REPLIED, data: { coachId, leadId: emailEvent.lead_id, messageId: message.id } });
}
```

**MAILER-DAEMON detection** — check `From` header:
```typescript
if (fromAddress.toLowerCase().includes("mailer-daemon") || fromAddress.toLowerCase().includes("postmaster")) {
  await step.sendEvent("fire-bounced", { name: LEAD_BOUNCED, data: { coachId, messageId: message.id } });
}
```

**historyId persistence** — after each sweep (RESEARCH.md Pitfall 8):
```typescript
await adminClient.from("integrations")
  .update({ metadata: { ...(existing?.metadata ?? {}), last_history_id: latestHistoryId } })
  .eq("coach_id", coachId).eq("provider", "gmail");
```

---

### `apps/web/inngest/functions/reply-handler.ts` (service, event-driven)

**Analog:** `apps/web/app/api/leads/[id]/route.ts` (PATCH, lines 16–69) — DB update + lead_event insert pattern; `apps/web/lib/gmail/error-handler.ts` (lines 19–39) — multi-step sequential DB updates

**Imports:**
```typescript
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { LEAD_REPLIED } from "@client/shared/constants/events";
```

**Core pattern** — sequential step.run calls for D-16 (four actions):
```typescript
export const replyHandler = inngest.createFunction(
  { id: "reply-handler" },
  { event: LEAD_REPLIED },
  async ({ event, step }) => {
    const { coachId, leadId, messageId } = event.data;

    await step.run("update-lead-status", async () => {
      await adminClient.from("leads").update({ status: "replied" }).eq("id", leadId);
      await adminClient.from("lead_events").insert({
        lead_id: leadId, coach_id: coachId,
        event_type: "state_changed",
        payload: { from: "in_sequence", to: "replied" },
        triggered_by: "system",
      });
    });

    await step.run("pause-sequence", async () => {
      await adminClient.from("sequences")
        .update({ status: "paused" })
        .eq("lead_id", leadId).eq("coach_id", coachId).eq("status", "active");
    });

    await step.run("cancel-pending-drafts", async () => {
      await adminClient.from("drafts")
        .update({ status: "cancelled" })
        .eq("lead_id", leadId).eq("coach_id", coachId).eq("status", "pending");
    });

    // step.sendEvent fires reply draft generation — use step.sendEvent not inngest.send
    await step.sendEvent("fire-reply-draft", {
      name: "draft/generate",
      data: { coachId, leadId, track: "replied", messageId },
    });
  }
);
```

---

### `apps/web/app/api/inngest/route.ts` *(extend)*

**Analog:** itself — current file is lines 1–7

**Extension pattern** — add each new function import and register it:
```typescript
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
// Add one import per new function file:
import { sequenceNoShow } from "@/inngest/functions/sequence-no-show";
import { sequenceCallCompleted } from "@/inngest/functions/sequence-call-completed";
import { gmailWatch } from "@/inngest/functions/gmail-watch";
import { gmailMonitor } from "@/inngest/functions/gmail-monitor";
import { replyHandler } from "@/inngest/functions/reply-handler";

export const maxDuration = 300; // unchanged

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

---

### `apps/web/app/api/webhooks/calendar/[provider]/route.ts` (middleware, request-response)

**Analog:** `apps/web/app/api/webhooks/transcripts/fireflies/route.ts` (all 109 lines) — this is the canonical pattern to follow exactly.

**Canonical webhook structure** (from fireflies/route.ts):
1. `const rawBody = await request.text()` — read raw body FIRST before parsing
2. Call verify function with `timingSafeEqual` (from `apps/web/lib/transcripts/lead-matching.ts` lines 4–15)
3. `if (!valid) return new Response("Unauthorized", { status: 401 })`
4. Parse JSON: `const payload = JSON.parse(rawBody) as ProviderPayload`
5. Deduplication check against `calendar_events` table (UNIQUE constraint on provider + external_event_id)
6. `if (existing) return new Response("OK", { status: 200 })` — silent dedup
7. Insert into `calendar_events`
8. `await inngest.send({ id: \`${provider}-${externalEventId}\`, name: EVENT_NAME, data: { … } })`
9. `return new Response("OK", { status: 200 })`

**Signature verification** — per-provider HMAC using `createHmac` + `timingSafeEqual` from `apps/web/lib/transcripts/lead-matching.ts` lines 1–15:
```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifyCalendlySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

**Deterministic event ID** (SEQ-007, RESEARCH.md Pattern 3):
```typescript
await inngest.send({
  id: `${provider}-${externalEventId}`,  // prevents duplicate sequence starts on webhook retries
  name: LEAD_NO_SHOW,
  data: { coachId, leadId, provider, externalEventId, eventStartAt },
});
```

**Provider routing** — the `[provider]` dynamic segment selects which adapter function to call. Each provider is a separate adapter function in `apps/web/lib/calendar/`:
```typescript
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  // …
}
```

**Webhook secret from Vault** — retrieve from `integrations.webhook_secret_vault_id` using adminClient (same as Zoom route does for vault_secret_id, lines 76–93 of zoom/route.ts).

---

### `apps/web/app/api/webhooks/gmail/push/route.ts` (middleware, request-response)

**Analog:** `apps/web/app/api/webhooks/transcripts/zoom/route.ts` (lines 32–54) — multi-event type handling pattern; RESEARCH.md Pattern 5

**Core pattern:**
```typescript
export async function POST(request: Request) {
  const body = await request.json() as PubSubMessage;
  // base64url-decode payload — same as thread.ts decodeBody() at line 14
  const decoded = Buffer.from(body.message.data, "base64url").toString("utf8");
  const { emailAddress, historyId } = JSON.parse(decoded);

  // Route to coach (same coach lookup as zoom/route.ts lines 62–69)
  const { data: coach } = await adminClient.from("coaches")
    .select("id").eq("email", emailAddress).maybeSingle();
  if (!coach) return new Response("OK");  // Always 200 — ACK Pub/Sub; never 4xx

  await inngest.send({
    name: "gmail/notification_received",
    data: { coachId: coach.id, historyId, emailAddress },
  });
  return new Response("OK");  // Must respond within 10 seconds
}
```

**No signature verification needed** — GCP pushes from known service account. Always return 200 to prevent Pub/Sub replay storms (RESEARCH.md Security section).

---

### `apps/web/app/api/sequences/enroll/route.ts` (controller, request-response)

**Analog:** `apps/web/app/api/leads/[id]/route.ts` (PATCH handler, lines 16–69) — auth + Zod + DB update + Inngest fire pattern

**Imports:**
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { LEAD_NO_SHOW, LEAD_MANUALLY_ENROLLED } from "@client/shared/constants/events";
```

**Auth + Zod pattern** — exact shape from `apps/web/app/api/leads/[id]/route.ts` lines 16–32:
```typescript
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = EnrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }
  // …verify lead belongs to coach before firing Inngest event…
  await inngest.send({
    id: `manual-${leadId}-${Date.now()}`,
    name: LEAD_MANUALLY_ENROLLED,
    data: { coachId: user.id, leadId, track: parsed.data.track },
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}
```

---

### `apps/web/app/api/cron/gmail-watch/route.ts` (controller, request-response)

**Analog:** RESEARCH.md Pattern 4 — no direct codebase analog exists, but the shape matches the `instagram/route.ts` GET handler (lines 4–15)

**CRON_SECRET guard pattern** (Vercel cron auth):
```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await inngest.send({ name: GMAIL_WATCH_RENEW, data: {} });
  return new Response("OK");
}
```

**Note:** `vercel.json` at project root — add `"crons"` array with `{ "path": "/api/cron/gmail-watch", "schedule": "0 6 * * *" }` and `{ "path": "/api/cron/gmail-poll", "schedule": "*/5 * * * *" }`. Check if vercel.json already exists before creating.

---

### `apps/web/app/api/cron/gmail-poll/route.ts` (controller, request-response)

**Analog:** `apps/web/app/api/cron/gmail-watch/route.ts` — identical structure, different event name

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await inngest.send({ name: "gmail/poll", data: {} });
  return new Response("OK");
}
```

---

### `apps/web/app/api/track/open/route.ts` (controller, request-response)

**Analog:** `apps/web/app/api/leads/[id]/route.ts` (adminClient insert pattern) — no-auth route, logs to DB

**Pattern** — no auth (tracking pixels are anonymous), return 1×1 GIF, insert email_event:
```typescript
// 1x1 transparent GIF bytes
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("d");
  if (token) {
    try {
      const { draftId } = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
      // adminClient — no auth needed for pixel tracking
      await adminClient.from("email_events").insert({
        draft_id: draftId, event_type: "opened",
        open_source: "direct", coach_id: /* resolved from draft */,
        lead_id: /* resolved from draft */,
      });
    } catch { /* ignore malformed tokens */ }
  }
  return new Response(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache" },
  });
}
```

---

### `apps/web/app/api/unsubscribe/route.ts` (controller, request-response)

**Analog:** `apps/web/app/api/leads/[id]/route.ts` PATCH (lines 16–69) — DB update without session auth

**Key differences from standard API routes:**
- No `createClient()` auth — unsubscribe links must work without a session
- Use `adminClient` directly (service role), scoped by the signed token
- Validate HMAC token before any DB write (same `timingSafeEqual` pattern as webhook verification)
- Return a minimal HTML page (not JSON): `new Response(html, { headers: { "Content-Type": "text/html" } })`

**DB updates pattern** — mirrors `apps/web/lib/gmail/error-handler.ts` lines 19–39 (multi-table sequential update):
```typescript
await adminClient.from("leads").update({ status: "unsubscribed", do_not_contact: true }).eq("id", leadId);
await adminClient.from("sequences")
  .update({ status: "cancelled" })
  .eq("lead_id", leadId).eq("status", "active");
await adminClient.from("drafts")
  .update({ status: "cancelled" })
  .eq("lead_id", leadId).eq("status", "pending");
await adminClient.from("lead_events").insert({
  lead_id: leadId, coach_id: coachId,
  event_type: "state_changed",
  payload: { to: "unsubscribed" }, triggered_by: "system",
});
```

**Fire Inngest cancelOn event** — so any sleeping Inngest function also cancels:
```typescript
await inngest.send({ name: LEAD_UNSUBSCRIBED, data: { coachId, leadId } });
```

---

### `apps/web/lib/calendar/index.ts` (utility, transform)

**Analog:** `apps/web/lib/transcripts/lead-matching.ts` (lines 32–105) — utility module pattern: exported functions + shared types, no default export

**Module structure:**
```typescript
// Shared normalized type for all 7 providers
export interface TCalendarEvent {
  provider: TIntegrationProvider;
  externalEventId: string;
  coachId: string;
  leadEmail?: string;
  eventType: "booking_created" | "no_show" | "rescheduled" | "cancelled";
  eventStartAt: string;  // ISO 8601
  eventEndAt: string;    // ISO 8601
  rawPayload: unknown;
}

// One normalize function per provider, all return TCalendarEvent | null
export function normalizeCalendlyPayload(raw: unknown, coachId: string): TCalendarEvent | null { … }
export function normalizeCalComPayload(raw: unknown, coachId: string): TCalendarEvent | null { … }
// etc.
```

**Shared type** also goes in `packages/shared/src/types/calendar.ts` — see below.

---

### `apps/web/lib/gmail/monitor.ts` (service, batch)

**Analog:** `apps/web/lib/gmail/thread.ts` (all 64 lines) — `server-only` directive, named exports, uses `getGmailClientForCoach`

**File header pattern** — copy from `apps/web/lib/gmail/thread.ts` lines 1–4:
```typescript
import "server-only";
import { getGmailClientForCoach } from "./client";
import type { gmail_v1 } from "googleapis";
import { adminClient } from "@/lib/supabase/admin";
```

**Header extraction** — reuse `extractHeader` from `apps/web/lib/gmail/thread.ts` lines 31–36. Import it rather than duplicating.

**Core exports:**
```typescript
export async function setupGmailWatch(coachId: string): Promise<void> { … }
export async function processHistoryUpdate(coachId: string, startHistoryId: string): Promise<void> { … }
```

---

### `apps/web/lib/gmail/bounce-detector.ts` (utility, transform)

**Analog:** `apps/web/lib/gmail/error-handler.ts` (all 39 lines) — same module shape: named exports, typed error classes

**Pattern:**
```typescript
import "server-only";
import type { gmail_v1 } from "googleapis";

export function isBounceMessage(headers: gmail_v1.Schema$MessagePartHeader[]): boolean {
  const from = headers.find(h => h.name?.toLowerCase() === "from")?.value ?? "";
  return from.toLowerCase().includes("mailer-daemon") || from.toLowerCase().includes("postmaster");
}

export function extractBouncedEmail(snippet: string, subject: string): string | null {
  // Parse "Delivery Status Notification" for the failed recipient
  // Match pattern: "Your message to <email@example.com> couldn't be delivered"
  const match = subject.match(/<([^>]+)>/) ?? snippet.match(/to\s+([^\s,]+@[^\s,]+)/i);
  return match?.[1] ?? null;
}
```

---

### `packages/shared/src/types/calendar.ts` (model)

**Analog:** `packages/shared/src/types/index.ts` (all 22 lines) — named type exports, no default export, uses Database type or standalone interfaces

**Pattern:**
```typescript
import type { TIntegrationProvider } from "./index";

export interface TCalendarEvent {
  provider: TIntegrationProvider;
  externalEventId: string;
  coachId: string;
  leadEmail?: string;
  eventType: "booking_created" | "no_show" | "rescheduled" | "cancelled";
  eventStartAt: string;
  eventEndAt: string;
  rawPayload: unknown;
}

export type TCalendarEventType = TCalendarEvent["eventType"];
```

**Register in barrel** — add `export * from "./calendar"` to `packages/shared/src/types/index.ts`.

---

### `supabase/migrations/20260519000003_phase3_automation.sql` (migration)

**Analog:** `supabase/migrations/20260519000001_phase2_intelligence.sql` (all 12 lines) — `ALTER TABLE … ADD COLUMN IF NOT EXISTS` pattern with comment header

**Pattern:**
```sql
-- Phase 3 Automation: sequence config per coach, email event index
-- D-05: Per-coach sequence cadence config
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS sequence_config JSONB DEFAULT
    '{"no_show_delays":[1,3,7,14,21],"call_completed_delays":[1,4,10]}';

-- GMAIL-008: Index for reply detection via In-Reply-To header matching
CREATE INDEX IF NOT EXISTS idx_email_events_gmail_message_id
  ON email_events(coach_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;
```

**RLS note:** `sequence_config` is a column on `coaches`, which already has `"coaches_self_update"` policy in `20260505000004_rls.sql`. No new RLS policy needed.

---

### `apps/web/app/(dashboard)/dashboard/page.tsx` *(extend — add PendingActionsSection)*

**Analog:** itself (lines 1–56) — server component, parallel data fetches with `Promise.all`, conditional render

**Extension pattern** — add pending actions query to existing `Promise.all` block, render new section above existing grid:
```typescript
// Add to existing Promise.all (lines 9–19):
supabase.from("pending_actions")
  .select("*", { count: "exact", head: true })
  .eq("coach_id", user!.id)

// Render conditionally above the existing metric grid (line 22):
{(pendingCount ?? 0) > 0 && (
  <PendingActionsSection coachId={user!.id} />
)}
```

**PendingActionsSection** — new component in `apps/web/components/dashboard/PendingActionsSection.tsx`. Uses glass card pattern from dashboard page lines 26–35:
```typescript
<div className="rounded-2xl backdrop-blur-md bg-accent/5 dark:bg-accent/10 border border-accent/20 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
```

**Card action buttons** — copy 3-button pattern from `apps/web/app/(dashboard)/leads/[id]/manual-state-override.tsx` (lines 103–118): variant="outline" for neutral, variant="destructive" for Closed.

---

### `apps/web/app/(dashboard)/settings/page.tsx` *(extend — Sequence Settings tab)*

**Analog:** `apps/web/app/(dashboard)/settings/voice/page.tsx` (all 31 lines) — server component → client component delegation pattern; `apps/web/app/(dashboard)/leads/[id]/page.tsx` (Tabs pattern, lines 48–70)

**Tab structure** — copy Tabs/TabsList/TabsTrigger pattern from `apps/web/app/(dashboard)/leads/[id]/page.tsx` lines 48–50:
```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
```

**Sequence settings card** — same glass card as existing settings page (lines 35–36):
```typescript
<div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
```

**Data fetch pattern** — add `sequence_config` to the existing coach select:
```typescript
const { data: coach } = await supabase.from("coaches")
  .select("sequence_config")
  .eq("id", user!.id).single();
```

**Client component** — create `SequenceSettingsClient.tsx` following `VoiceBuilderClient.tsx` pattern (lines 1–53): `"use client"` directive, `useState` for form state, `fetch` to `PATCH /api/coaches` (or dedicated endpoint).

---

### `apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx` *(wire button)*

**Analog:** `apps/web/app/(dashboard)/leads/[id]/manual-state-override.tsx` (all 120 lines) — client component with `fetch` call + `router.refresh()` + toast

**Wiring pattern** — add `"use client"` + onClick handler to the existing Button (currently lines 27–33):
```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// In onClick:
async function startSequence() {
  const r = await fetch("/api/sequences/enroll", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadId, track: "no_show" }),
  });
  if (!r.ok) { toast.error("Couldn't start sequence."); return; }
  toast.success("Intake sequence started.");
  router.refresh();
}
```

---

## Shared Patterns

### HMAC Webhook Signature Verification
**Source:** `apps/web/lib/transcripts/lead-matching.ts` lines 1–29
**Apply to:** All 7 calendar webhook adapters, any new webhook route
```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);  // timing-safe — required (RESEARCH.md Security)
}
```
Note: Zoom uses `v0:${timestamp}:${rawBody}` as the HMAC input. Square uses `notificationUrl + rawBody`. Cal.com hashes the JSON-stringified payload. Adjust the message construction per provider; the `timingSafeEqual` call stays identical.

### adminClient — Server-Side Only DB Access
**Source:** `apps/web/lib/supabase/admin.ts` (all 9 lines)
**Apply to:** All Inngest functions, all webhook routes, cron routes, unsubscribe route, track/open route
```typescript
import { adminClient } from "@/lib/supabase/admin";
// SERVICE ROLE — never import in client components
// RLS is bypassed; always scope queries by coach_id explicitly
```

### Auth Guard for Dashboard API Routes
**Source:** `apps/web/app/api/leads/[id]/route.ts` lines 16–20
**Apply to:** `sequences/enroll/route.ts`, any route called from the dashboard UI
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Zod Validation on Every API Boundary
**Source:** `apps/web/app/api/leads/[id]/route.ts` lines 22–27
**Apply to:** `sequences/enroll/route.ts`, `unsubscribe/route.ts`
```typescript
const parsed = SomeSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
}
```

### step.sendEvent Inside Inngest Functions (not inngest.send)
**Source:** RESEARCH.md Anti-Patterns section
**Apply to:** All Inngest function files — any event emission inside a function body
```typescript
// CORRECT — memoized, idempotent on retry:
await step.sendEvent("step-id", { name: EVENT_NAME, data: { … } });

// WRONG — re-fires on every Inngest replay/retry:
await inngest.send({ name: EVENT_NAME, data: { … } });
```

### Lead Event Logging on State Change
**Source:** `apps/web/app/api/leads/[id]/route.ts` lines 47–57; `apps/web/app/(dashboard)/leads/[id]/state-override-action.ts` lines 20–28
**Apply to:** `reply-handler.ts`, `unsubscribe/route.ts`, any Inngest step that changes lead.status
```typescript
await adminClient.from("lead_events").insert({
  lead_id: leadId,
  coach_id: coachId,
  event_type: "state_changed",
  payload: { from: previousStatus, to: newStatus },
  triggered_by: "system",  // not "coach" for automated changes
});
```

### TERMINAL_STATES from State Machine
**Source:** `packages/shared/src/lib/state-machine.ts` lines 3–13
**Apply to:** Pre-send safety check in `sequence-step.ts`, `sequence-no-show.ts`, `sequence-call-completed.ts`
```typescript
import { TERMINAL_STATES, isTerminalState, blocksOutboundEmail } from "@client/shared";
// TERMINAL_STATES = ["converted", "closed", "unsubscribed", "do_not_contact", "bounced"]
```

### Glass Card UI Pattern
**Source:** `apps/web/app/(dashboard)/settings/page.tsx` lines 35–36; `apps/web/app/(dashboard)/leads/[id]/sequence-status-panel.tsx` lines 15–16
**Apply to:** PendingActionsSection, SequenceSettingsClient, all new dashboard UI components
```typescript
className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
```

### toast + router.refresh() for Client Mutations
**Source:** `apps/web/app/(dashboard)/leads/[id]/manual-state-override.tsx` lines 58–70
**Apply to:** SequenceStatusPanel wire-up, PendingActionsSection action buttons, SequenceSettingsClient save
```typescript
import { toast } from "sonner";
import { useRouter } from "next/navigation";
// After successful mutation:
toast.success("Action completed.");
router.refresh();
// On error:
toast.error("Something went wrong. Try again.");
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Inngest function bodies with `step.sleepUntil` | service | event-driven | No durable multi-day sleep pattern exists in codebase yet; use RESEARCH.md Pattern 1 directly |
| `vercel.json` cron entries | config | — | No `vercel.json` file found in codebase; create fresh from RESEARCH.md Pattern 4 template |
| Pending Actions DB table (if needed) | migration | — | No `pending_actions` table in schema; may derive from sequences/lead_events instead — planner to decide |

---

## Metadata

**Analog search scope:** `apps/web/`, `packages/shared/`, `supabase/migrations/`
**Files scanned:** 35
**Key insight:** The fireflies webhook route (`apps/web/app/api/webhooks/transcripts/fireflies/route.ts`) is the single most reusable analog in the codebase — its structure of raw body read → HMAC verify → dedup check → DB insert → Inngest event fire is exactly the pattern every calendar webhook adapter must follow. The HMAC verification helper in `apps/web/lib/transcripts/lead-matching.ts` is the timing-safe comparison to copy for all 7 providers.
**Pattern extraction date:** 2026-05-19
