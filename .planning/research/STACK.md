# Stack Research: Coaching AI Follow-Up System

**Project:** The Client Architecture — Module 1: The Intake Sequence
**Researched:** 2026-05-04
**Sources:** Context7 (Inngest JS SDK, Inngest website, Supabase, Next.js, googleapis-nodejs, Upstash ratelimit)

---

## Recommended Stack (confirmed + version/config details)

| Layer | Technology | Version/Config | Confidence |
|-------|------------|---------------|------------|
| Framework | Next.js App Router | 15.x, strict TypeScript | HIGH |
| Database + Auth | Supabase | Postgres 15, EU region | HIGH |
| Workflow engine | Inngest JS SDK | v3+ (inngest/next serve) | HIGH |
| AI drafts | Anthropic claude-sonnet-4-6 | Server-side only, never client | HIGH |
| Email delivery | Gmail API (googleapis) | v1, OAuth2 per-coach | HIGH |
| Notifications | Twilio + Resend | WhatsApp/SMS + email fallback | HIGH |
| Rate limiting | Upstash Redis (@upstash/ratelimit) | Sliding window, HTTP-based | HIGH |
| Styling | Tailwind v4 + shadcn/ui + Framer Motion | — | HIGH |
| Hosting | Vercel | maxDuration: 300 on Inngest route | HIGH |
| Scheduling bridge | Vercel Cron Jobs → Inngest events | — | HIGH |

**Key package versions to pin:**
```bash
npm install inngest                    # v3+ for App Router serve() pattern
npm install googleapis                 # Gmail API node client
npm install @upstash/ratelimit @upstash/redis
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install twilio
npm install resend
```

---

## Inngest Patterns

### Setup: App Router Route Handler

The Inngest serve handler exports `GET`, `POST`, and `PUT` — all three are required. Set `maxDuration: 300` on this route because Inngest uses HTTP long-polling and Vercel's default 10s timeout will break function execution.

```typescript
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { allFunctions } from "@/inngest/functions";

export const maxDuration = 300; // REQUIRED — default 10s breaks long-running steps

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
```

### Multi-Tenant Concurrency (per-coach fairness)

Use `concurrency.key` scoped to `event.data.coach_id`. This gives every coach their own virtual queue — one coach flooding the system cannot delay another coach's sequences. This is the single most important Inngest config for this product.

```typescript
export const intakeSequence = inngest.createFunction(
  {
    id: "intake-sequence",
    concurrency: {
      scope: "fn",
      key: "event.data.coach_id",  // per-coach virtual queue
      limit: 3,                     // max 3 concurrent runs per coach
    },
    cancelOn: [
      {
        event: "lead/replied",
        if: "async.data.lead_id == event.data.lead_id",
        // No timeout — cancel anytime a reply comes in
      },
    ],
  },
  { event: "lead/sequence.started" },
  async ({ event, step }) => { /* ... */ }
);
```

### Email Sequence Pattern (step.sleep + step.waitForEvent)

The canonical pattern for this product: send a draft, wait for coach approval or timeout, then send or hold. Each `step.run` is independently retried and never re-executed on replay.

```typescript
export const intakeSequence = inngest.createFunction(
  { id: "intake-sequence", /* concurrency config above */ },
  { event: "lead/sequence.started" },
  async ({ event, step }) => {
    const { lead_id, coach_id } = event.data;

    // Step 1: Generate AI draft
    const draft = await step.run("generate-draft", async () => {
      return await generateAIDraft({ lead_id, coach_id });
    });

    // Step 2: Surface draft to coach (24h before intended send)
    await step.run("notify-coach", async () => {
      await notifyCoachAllChannels({ coach_id, draft_id: draft.id });
    });

    // Step 3: Wait for approval event OR timeout after 24h
    const approvalEvent = await step.waitForEvent("wait-for-approval", {
      event: "draft/approved",
      if: `async.data.draft_id == "${draft.id}"`,
      timeout: "24h",
    });

    if (!approvalEvent) {
      // No action in 24h — send follow-up CTA, then wait another 24h
      await step.run("send-reminder-cta", async () => {
        await sendApprovalReminderCTA({ coach_id, draft_id: draft.id });
      });

      const secondChance = await step.waitForEvent("wait-for-approval-final", {
        event: "draft/approved",
        if: `async.data.draft_id == "${draft.id}"`,
        timeout: "24h",
      });

      if (!secondChance) {
        // Still no action — move to HOLD
        await step.run("move-to-hold", async () => {
          await setDraftStatus(draft.id, "HOLD");
        });
        return { status: "held" };
      }
    }

    // Pre-send safety check (runs immediately before send, catching last-minute replies)
    await step.run("pre-send-safety-check", async () => {
      const safe = await runPreSendSafetyCheck({ lead_id });
      if (!safe) throw new Error("Safety check failed — lead replied or sequence cancelled");
    });

    // Send email via Gmail API
    await step.run("send-email", async () => {
      await sendGmailAsCoach({ coach_id, draft_id: draft.id });
    });

    // Schedule next message in sequence
    await step.sleep("delay-before-next", "3 days");
    await step.sendEvent("trigger-next-message", {
      name: "lead/sequence.next",
      data: { lead_id, coach_id, sequence_step: 2 },
    });
  }
);
```

### Fan-Out Pattern (Vercel Cron → Inngest)

Vercel Cron hits a Next.js route handler that triggers one Inngest event per coach. Inngest fans out from there. The cron route should be protected with a shared secret (`CRON_SECRET`).

```typescript
// src/app/api/cron/check-sequences/route.ts
// vercel.json: { "crons": [{ "path": "/api/cron/check-sequences", "schedule": "0 * * * *" }] }
export const GET = async (req: Request) => {
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coaches = await getActiveCoaches(); // server-side Supabase call
  const events = coaches.map((coach) => ({
    name: "cron/sequence-check",
    data: { coach_id: coach.id },
  }));

  await inngest.send(events); // one event per coach, fans out in Inngest
  return Response.json({ triggered: events.length });
};
```

### step.sendEvent vs inngest.send

**Critical distinction:** Inside a running function, always use `step.sendEvent()`, never `inngest.send()`. The step version is committed atomically with the step — `inngest.send()` inside a step will duplicate-send on retries.

### cancelOn for Reply Detection

When a lead replies, emit a `lead/replied` event. Any in-flight sequence function for that lead_id cancels automatically — no manual state-checking needed, no orphaned sequences.

```typescript
cancelOn: [
  {
    event: "lead/replied",
    if: "async.data.lead_id == event.data.lead_id",
  },
  {
    event: "lead/closed",
    if: "async.data.lead_id == event.data.lead_id",
  },
],
```

### Rate Limiting / Throttle for Gmail Quota

Gmail API limits: 250 quota units/user/second, 1 billion/day. Wrap Gmail sends in Inngest throttle to smooth bursts across coaches:

```typescript
throttle: {
  limit: 5,
  period: "1s",
  key: "event.data.coach_id",  // per coach
},
```

---

## Gmail API Patterns

### OAuth2 Token Storage Architecture

Store tokens in Supabase Vault (not plain columns). Retrieve via server-side service role client only. Never expose refresh tokens to client code or route handler responses.

```
Coach onboarding:
1. Coach clicks "Connect Gmail" → /api/auth/gmail/authorize
2. Route generates OAuth URL with access_type: 'offline', prompt: 'consent'
3. Coach completes Google consent → /api/auth/gmail/callback
4. Server exchanges code → { access_token, refresh_token, expiry_date }
5. Store refresh_token in Supabase Vault (encrypted at rest)
6. Store access_token + expiry_date in coaches table (short-lived, okay plaintext)
```

```typescript
// src/lib/gmail/auth.ts — server-side only
import { google } from "googleapis";

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export async function getOAuth2ClientForCoach(coachId: string) {
  const oauth2Client = createOAuth2Client();

  // Fetch refresh token from Vault (server-side service role only)
  const { refreshToken, accessToken, expiryDate } = await getCoachTokens(coachId);

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: accessToken,
    expiry_date: expiryDate,
  });

  // Listen for new tokens on auto-refresh and persist them
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      await updateVaultRefreshToken(coachId, tokens.refresh_token);
    }
    await updateCoachAccessToken(coachId, tokens.access_token, tokens.expiry_date);
  });

  return oauth2Client;
}
```

### Send Email As Coach (MIME construction)

Gmail API sends raw RFC 2822 messages. Build MIME manually or use `mailcomposer` / `nodemailer` for the encoding. The `userId: 'me'` parameter means "as the authenticated user" — this is the send-as-coach mechanism.

```typescript
import { google } from "googleapis";

export async function sendGmailAsCoach({
  coachId,
  to,
  subject,
  bodyHtml,
  threadId, // for reply threading
}: SendParams) {
  const auth = await getOAuth2ClientForCoach(coachId);
  const gmail = google.gmail({ version: "v1", auth });

  const rawMessage = buildRawMimeMessage({ to, subject, bodyHtml });

  await gmail.users.messages.send({
    userId: "me", // sends as the authenticated coach
    requestBody: {
      raw: rawMessage,
      threadId, // preserves email thread if replying
    },
  });
}
```

### Gmail OAuth Scopes

Request minimum required scopes at consent:
```
https://www.googleapis.com/auth/gmail.send          (send email)
https://www.googleapis.com/auth/gmail.readonly       (monitor inbox for replies/opens)
https://www.googleapis.com/auth/gmail.modify         (mark as read, label management)
```

Do not request `https://mail.google.com/` (full access) — it triggers stricter Google app review and scares coaches.

### Token Refresh: Key Gotcha

The googleapis library auto-refreshes access tokens when expired AND fires a `tokens` event. You MUST persist new tokens from this event — if you don't, the next cold-start will use a stale access_token and fail. The refresh_token is only returned once (at first authorization) unless you pass `prompt: 'consent'` again.

**Second critical gotcha:** If a coach revokes access from their Google account settings, the refresh token becomes invalid immediately. Wrap every Gmail API call in try/catch and detect `invalid_grant` errors — surface them to the coach dashboard as "Gmail disconnected" immediately, and stop all sequences for that coach.

```typescript
try {
  await gmail.users.messages.send(/* ... */);
} catch (err: any) {
  if (err.message?.includes("invalid_grant") || err.code === 401) {
    await markCoachGmailDisconnected(coachId);
    throw new Error("Gmail authorization revoked — sequences paused");
  }
  throw err;
}
```

### Gmail API Quota

- **Sending quota:** Google Workspace accounts: 2,000 emails/day. Free Gmail: 500/day.
- **Rate limit:** 250 quota units/second/user. `users.messages.send` = 100 units. So ~2.5 sends/second max per coach.
- **Monitoring:** Set up Gmail API quota alerts in Google Cloud Console. At 5–10 coaches, quota is not a concern. At 50+ coaches, implement per-coach daily send counters in Redis.

### Gmail Watch for Reply Detection

To detect lead replies, use `gmail.users.watch()` + Google Pub/Sub → webhook. This is more reliable than polling. Set up one watch per coach Gmail account; watches expire every 7 days and must be renewed.

```typescript
// Renew via Inngest cron every 6 days to avoid expiry gaps
await gmail.users.watch({
  userId: "me",
  requestBody: {
    topicName: `projects/${PROJECT_ID}/topics/gmail-notifications`,
    labelIds: ["INBOX"],
  },
});
```

---

## Supabase Patterns

### RLS: The Core Pattern

Every table that belongs to a coach must have RLS enabled and a `coach_id` column. The base policy pattern:

```sql
-- Enable RLS (always)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Coaches can only see their own leads
CREATE POLICY "coaches_own_leads" ON leads
  FOR ALL USING (coach_id = auth.uid());

-- Service role (Inngest functions, server-side workers) bypasses RLS automatically
-- Do NOT add service role to policies — it bypasses by design
```

**Note on `auth.uid()`:** In Supabase with App Router, use the `@supabase/ssr` package to create a server client from cookies. The `supabase.auth.getUser()` call verifies the JWT server-side. Do not trust `getSession()` in server code — it doesn't verify signatures.

### Admin (Daniel) Access Pattern

Daniel needs cross-coach visibility. Two approaches; use option B:

- Option A: Give Daniel's user `bypassrls` privilege — dangerous, not revocable per-route
- **Option B (recommended):** Daniel's user has `role: 'admin'` in `users` metadata. Server-side checks `session.user.app_metadata.role === 'admin'` before executing admin queries via service role client. The service role client is never sent to the browser.

```typescript
// src/lib/supabase/admin.ts — server-side only, never import in client components
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // never expose this
);
```

### Supabase Vault: OAuth Token Storage

Vault uses pgsodium under the hood for AES-256-GCM encryption. Access is via SQL only (no REST API surface for secrets).

```sql
-- Store a coach's refresh token (run server-side via service role)
SELECT vault.create_secret(
  'the_refresh_token_value',      -- secret
  'gmail_refresh_coach_abc123',   -- name (unique identifier)
  'Gmail refresh token for coach' -- description
);

-- Retrieve and decrypt (returns plaintext only to service role)
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'gmail_refresh_coach_abc123';
```

In TypeScript, call these via `supabaseAdmin.rpc()`:

```typescript
// Store
await supabaseAdmin.rpc("vault_create_secret", {
  secret: refreshToken,
  name: `gmail_refresh_${coachId}`,
});

// Retrieve (create a Postgres function that returns the decrypted value)
const { data } = await supabaseAdmin.rpc("get_coach_gmail_token", {
  p_coach_id: coachId,
});
```

**Important:** Create a Postgres function (SECURITY DEFINER) that encapsulates the Vault read — this avoids granting the application role direct access to `vault.decrypted_secrets`.

### Realtime for Dashboard Updates

Use `postgres_changes` in a client component for the draft approval queue and lead list. Supabase Realtime respects RLS — coaches only receive changes for their own records.

```typescript
"use client";

useEffect(() => {
  const channel = supabase
    .channel("draft-queue")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drafts",
        filter: `coach_id=eq.${coachId}`, // belt-and-suspenders filter (RLS is the actual security)
      },
      (payload) => {
        // Update local draft queue state
        setDrafts((prev) => reconcileDrafts(prev, payload));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [coachId]);
```

**Realtime publication setup (run once in migration):**
```sql
-- Add tables to realtime publication as you create them
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_events;
```

### Key Schema Design Points

```sql
-- All tables: coach_id is the tenant boundary
-- Use uuid references, not serial IDs
-- Timestamp columns: created_at, updated_at with DEFAULT now()

-- leads table state machine column
CREATE TYPE lead_status AS ENUM (
  'identified', 'call_booked', 'no_show',
  'in_sequence', 'replied', 'closed'
);

-- drafts table approval flow
CREATE TYPE draft_status AS ENUM (
  'pending', 'approved', 'edited', 'hold', 'sent', 'cancelled'
);
```

---

## Next.js 15 Patterns

### Server/Client Split Rule

Default everything to Server Components. Add `"use client"` only when you need:
- `useState`, `useEffect`, `useReducer`
- Browser APIs
- Event handlers directly on elements
- Supabase Realtime subscriptions

**Dashboard architecture:**
```
app/dashboard/
  layout.tsx         — Server (auth check, coach data fetch)
  page.tsx           — Server (lead list initial data)
  leads/
    [id]/page.tsx    — Server (lead detail initial fetch)
  drafts/
    page.tsx         — Server (initial draft queue)
    DraftQueue.tsx   — Client (realtime updates, optimistic approval)
  settings/
    page.tsx         — Server
```

### Data Fetching Pattern

Fetch in Server Components, pass as props or stream via Suspense. For the dashboard, pass initial data from server and hydrate realtime client-side:

```typescript
// Server Component
export default async function DraftsPage() {
  const supabase = createServerClient(/* cookies */);
  const { data: initialDrafts } = await supabase
    .from("drafts")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return <DraftQueue initialDrafts={initialDrafts ?? []} />;
}
```

```typescript
// Client Component — handles realtime + optimistic updates
"use client";
export function DraftQueue({ initialDrafts }: { initialDrafts: TDraft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  // ... realtime subscription
}
```

### Streaming with Suspense

For lead profiles (heavy data load), stream sections independently:

```typescript
export default function LeadPage({ params }: { params: { id: string } }) {
  const timelinePromise = getLeadTimeline(params.id); // don't await

  return (
    <>
      <LeadHeader leadId={params.id} />  {/* instant */}
      <Suspense fallback={<TimelineSkeleton />}>
        <LeadTimeline dataPromise={timelinePromise} />
      </Suspense>
    </>
  );
}
```

### Admin Route Protection

Use Next.js `forbidden()` (15.x built-in) in Server Components for admin routes. Protect at both middleware level AND component level (defense in depth):

```typescript
// app/admin/layout.tsx
import { forbidden } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifyAdminSession();
  if (!session) forbidden();
  return <>{children}</>;
}
```

### Route Handlers for Webhooks

All incoming webhooks (calendar providers, Gmail Pub/Sub, Inngest) go through `app/api/` route handlers. Always verify signatures before processing. Return 200 immediately for async processing — use Inngest events to queue work.

```typescript
// app/api/webhooks/calendly/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("calendly-webhook-signature") ?? "";

  if (!verifyCalendlySignature(body, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body);
  await inngest.send({ name: "calendly/event.received", data: payload });

  return new Response("OK", { status: 200 }); // acknowledge immediately
}
```

---

## Calendar Webhook Unification

### Unified Abstraction Layer

All 7 calendar providers emit different payloads but map to the same internal events. Create a single `CalendarEvent` type and a provider-specific adapter per integration. The webhook route per provider normalizes → emits a unified Inngest event.

```
Incoming webhook per provider → normalize to CalendarEvent → emit lead/call.status.changed
```

```typescript
// src/lib/calendar/types.ts
export type TCalendarEvent = {
  provider: "calendly" | "cal_com" | "acuity" | "setmore" | "square" | "ms_bookings" | "tidycal";
  eventType: "booking_created" | "booking_cancelled" | "no_show";
  coachId: string;          // resolved by webhook secret/API key per coach
  leadEmail: string;
  scheduledAt: Date;
  rawPayload: unknown;      // store original for debugging
};
```

```typescript
// src/lib/calendar/adapters/calendly.ts
export function normalizeCalendlyWebhook(payload: CalendlyPayload): TCalendarEvent {
  return {
    provider: "calendly",
    eventType: mapCalendlyEventType(payload.event),
    coachId: resolveCoachFromCalendlyUri(payload.payload.event_memberships),
    leadEmail: payload.payload.email,
    scheduledAt: new Date(payload.payload.scheduled_event.start_time),
    rawPayload: payload,
  };
}
```

### Webhook Security Per Provider

| Provider | Signature Method |
|----------|-----------------|
| Calendly | HMAC-SHA256 header `calendly-webhook-signature` |
| Cal.com | HMAC-SHA256 header `X-Cal-Signature-256` |
| Acuity | HMAC-SHA256 header `X-Acuity-Signature` |
| Setmore | API key validation in payload |
| Square | HMAC-SHA256 header `x-square-hmacsha256-signature` |
| MS Bookings | Azure AD validation token handshake |
| TidyCal | Basic auth or shared secret in payload |

Each coach connects their calendar provider during onboarding. Store the webhook signing secret in Supabase Vault per coach per provider. On webhook receipt, look up the coach from a provider-specific identifier (e.g., Calendly organization URI), retrieve their signing secret, verify.

### No-Show Detection

No-show logic sits in Inngest, not in the webhook handler. The webhook fires `calendly/event.received`. An Inngest function listens, checks if the call start_time has passed without a `booking_completed` event, and emits `lead/no_show.detected` if confirmed.

```typescript
// Wait for confirmation that the call happened
const callCompleted = await step.waitForEvent("wait-for-call-completion", {
  event: "calendly/invitee.completed",
  if: `async.data.booking_id == event.data.booking_id`,
  timeout: "2h", // 2h past scheduled start = confirmed no-show
});

if (!callCompleted) {
  await step.sendEvent("trigger-noshowsequence", {
    name: "lead/no_show.detected",
    data: { lead_id, coach_id },
  });
}
```

---

## Email Open Tracking

### Tracking Pixel Implementation

A 1x1 transparent GIF served from a Next.js route handler. The URL encodes a signed token (not plain lead_id — prevents enumeration).

```typescript
// app/api/track/open/[token]/route.ts
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const { leadId, draftId, coachId } = verifyTrackingToken(params.token);
  
  if (leadId && draftId) {
    // Fire and forget — don't await (we're about to return the image)
    trackEmailOpen({ leadId, draftId, coachId }).catch(console.error);
  }

  return new Response(TRANSPARENT_1PX_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Content-Length": TRANSPARENT_1PX_GIF.byteLength.toString(),
    },
  });
}
```

Token signing: use `@/lib/crypto` with HMAC-SHA256 and a `TRACKING_SECRET` env var. Include expiry (30 days). Never include PII in the URL directly.

**Privacy consideration:** Apple MPP (Mail Privacy Protection) pre-fetches tracking pixels, giving false opens for any Apple Mail user. Record opens but weight them lower in lead scoring logic — flag as `open_source: 'proxy'` when the user agent contains `Apple-Mail` or `bot`.

---

## Upstash Rate Limiting

### Webhook Endpoint Protection

Use sliding-window rate limiting on all incoming webhook and API routes. Identify by `coach_id` (from validated session) not by IP for authenticated routes.

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1m"), // 20 requests/minute
  prefix: "@intake/draft-approve",
});

// In route handler:
const identifier = `coach:${session.coachId}`;
const { success, pending } = await ratelimit.limit(identifier);

if (!success) {
  return new Response("Rate limit exceeded", { status: 429 });
}
// context.waitUntil(pending); // in Edge functions
```

### Gmail Send Rate Protection

Wrap the Gmail send Inngest step with an additional Redis check to enforce the per-coach daily send limit (don't rely solely on Inngest throttle):

```typescript
const dailyCount = await redis.incr(`gmail:daily:${coachId}:${todayKey}`);
await redis.expire(`gmail:daily:${coachId}:${todayKey}`, 86400);

if (dailyCount > 450) { // conservative limit below 500 free/2000 workspace
  throw new Error(`Gmail daily limit approached for coach ${coachId}`);
}
```

---

## Confidence Levels

| Area | Confidence | Basis |
|------|------------|-------|
| Inngest multi-tenant concurrency | HIGH | Official Context7 docs, multiple code examples verified |
| Inngest step.sleep / waitForEvent / cancelOn | HIGH | Official Context7 docs, canonical patterns |
| Inngest + Vercel fan-out pattern | HIGH | Official Inngest deployment docs |
| Gmail OAuth2 token lifecycle | HIGH | googleapis Node.js official docs |
| Gmail send-as-coach (userId: 'me') | HIGH | Official API docs |
| Gmail quota limits | MEDIUM | Verified from Google docs (may change per Workspace tier) |
| Gmail Watch / Pub/Sub reply detection | MEDIUM | Documented but implementation complexity HIGH |
| Supabase RLS coach_id scoping | HIGH | Official docs, multiple examples |
| Supabase Vault for token storage | HIGH | Official vault.create_secret / decrypted_secrets docs |
| Supabase Realtime with RLS | HIGH | Confirmed: Postgres Changes respect RLS policies |
| Next.js 15 server/client split | HIGH | Official App Router docs |
| Next.js forbidden() for admin | HIGH | Official docs (15.x feature) |
| Upstash sliding-window rate limit | HIGH | Official docs |
| Calendar webhook unification | MEDIUM | Pattern is sound; per-provider signature verification needs validation against each provider's current docs |
| Tracking pixel / Apple MPP mitigation | MEDIUM | Apple MPP behavior is well-documented; scoring approach is engineering judgment |

---

## Non-Obvious Gotchas Summary

1. **Inngest maxDuration:** Must set `export const maxDuration = 300` on the Inngest route. Default Vercel timeout (10s) will terminate long-running step executions.

2. **step.sendEvent not inngest.send:** Inside Inngest functions, always `step.sendEvent()` — using `inngest.send()` inside a step body duplicates events on retry.

3. **Gmail refresh_token one-time delivery:** Google only returns `refresh_token` on the first OAuth consent. If you forget to persist it, the coach must re-authorize. Always pass `access_type: 'offline'` AND `prompt: 'consent'` on the authorization URL.

4. **Gmail invalid_grant = revoked:** When a coach revokes Gmail access, the `googleapis` library throws an error containing `invalid_grant`. Catch this specifically, mark the coach's Gmail as disconnected in Supabase, and halt their sequences — or you'll generate noise errors in Inngest.

5. **Supabase Realtime RLS:** Postgres Changes respect RLS automatically (unlike older Realtime behavior). Still add a `filter` in the client subscription as belt-and-suspenders.

6. **Vault via SECURITY DEFINER function:** Don't grant the application Postgres role direct access to `vault.decrypted_secrets`. Wrap it in a `SECURITY DEFINER` function callable via `supabaseAdmin.rpc()`.

7. **Apple MPP false opens:** Apple pre-fetches tracking pixels for all emails in Apple Mail. User-agent will contain `Apple-Mail` or known Apple proxy strings. Record but flag separately.

8. **Calendly webhook verification:** Calendly uses a `t` timestamp in the signature header. Verify the timestamp is within 5 minutes to prevent replay attacks — don't just verify the HMAC.

9. **Supabase `getUser()` vs `getSession()` in server code:** In Next.js App Router, `getSession()` does NOT verify JWT signatures server-side — it trusts cookie contents. Always use `supabase.auth.getUser()` in server code for security-critical paths.

10. **Inngest function IDs must be stable:** The `id` field in `createFunction` is used for idempotency and run history. Never change it after deploy — it creates orphaned runs in Inngest's system.
