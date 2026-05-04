# Architecture Research: Coaching AI Follow-Up System

**Researched:** 2026-05-04
**Confidence:** HIGH — all major claims verified against Context7 official docs (Inngest, Turborepo, Supabase, googleapis)

---

## Monorepo Structure

Use Turborepo with pnpm workspaces. The `apps/` directory holds deployable units; `packages/` holds shared, importable code. Next.js internal packages are linked via `workspace:*` and transpiled with `transpilePackages` in `next.config.ts`.

```
client-architecture/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                    # root — private, minimal deps, turbo devDep
├── apps/
│   └── web/                        # Next.js 15 App Router — the only deployable
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   └── onboarding/     # invite-only wizard
│       │   ├── (dashboard)/
│       │   │   ├── leads/          # lead list + profile
│       │   │   ├── approvals/      # draft review queue
│       │   │   ├── sequences/      # active sequence view
│       │   │   ├── settings/       # integrations, voice model, autonomous toggle
│       │   │   └── modules/        # locked module sell screens (M2, M3)
│       │   ├── admin/              # Daniel-only — all coaches + system health
│       │   └── api/
│       │       ├── inngest/        # route.ts — Inngest serve handler (GET, POST, PUT)
│       │       ├── webhooks/
│       │       │   ├── calendly/   # no-show trigger
│       │       │   ├── cal-com/
│       │       │   ├── acuity/
│       │       │   ├── setmore/
│       │       │   ├── square/
│       │       │   ├── ms-bookings/
│       │       │   └── tidycal/
│       │       ├── gmail/
│       │       │   ├── oauth/      # OAuth callback handler
│       │       │   └── pubsub/     # Gmail push notification receiver
│       │       ├── drafts/         # approve / edit / hold
│       │       └── leads/          # CRUD + stage transitions
│       ├── components/
│       │   ├── ui/                 # shadcn primitives
│       │   ├── leads/
│       │   ├── approvals/
│       │   └── onboarding/
│       ├── lib/
│       │   ├── supabase/           # createClient (browser), createServerClient, middleware
│       │   ├── gmail/              # GmailClient class — per-coach OAuth2 instantiation
│       │   ├── scheduler/          # send-time logic
│       │   └── security/           # Zod schemas, webhook signature verification
│       └── inngest/
│           ├── client.ts           # Inngest client singleton
│           └── functions/          # one file per function group
│               ├── intake-sequence.ts
│               ├── draft-approval.ts
│               ├── gmail-monitor.ts
│               └── pre-send-check.ts
├── packages/
│   ├── shared/                     # @client/shared — types, validators, constants
│   │   ├── src/
│   │   │   ├── types/              # TLead, TDraft, TSequence, TCoach, TIntegration
│   │   │   ├── validators/         # Zod schemas (shared across API boundaries)
│   │   │   └── constants/          # lead stages, event names, channel names
│   │   └── package.json
│   ├── database/                   # @client/database — Supabase types + migrations
│   │   ├── src/
│   │   │   └── types.ts            # Generated from supabase gen types typescript
│   │   ├── migrations/             # .sql files — run via supabase db push
│   │   └── package.json
│   └── ai-engine/                  # @client/ai-engine — voice model + draft generation
│       ├── src/
│       │   ├── context-assembler.ts # assembleContext() — builds the prompt package
│       │   ├── draft-generator.ts   # generateDraft() — calls Anthropic API
│       │   ├── voice-model.ts       # buildVoiceModel(), updateVoiceModel()
│       │   └── safety-checker.ts    # preSendSafetyCheck()
│       └── package.json
└── tests/
    ├── e2e/                         # Playwright
    └── integration/                 # Vitest
```

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "type-check": { "dependsOn": ["^build"] }
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**apps/web/next.config.ts** must include:
```typescript
transpilePackages: ["@client/shared", "@client/database", "@client/ai-engine"]
```

---

## Component Map

| Component | Responsibility | Talks To |
|-----------|---------------|----------|
| `apps/web` Next.js | UI, API routes, Inngest serve endpoint, webhook receivers | Supabase, Inngest, `@client/*` packages |
| `apps/web/inngest/functions/` | Durable workflow logic — sequences, approvals, sends | Supabase (via service role), `@client/ai-engine`, Gmail, Twilio, Resend, Slack |
| `packages/shared` | Canonical TypeScript types, Zod schemas, event name constants | Consumed by `apps/web` and `packages/ai-engine` |
| `packages/database` | Supabase-generated types, SQL migrations, RLS policy files | Consumed by `apps/web` and Inngest functions |
| `packages/ai-engine` | Context assembly, Anthropic API calls, voice model operations | Consumed server-side only by Inngest functions and API routes |
| Supabase | Postgres + Auth + RLS + Vault + Realtime | `apps/web` server components, Inngest functions |
| Inngest cloud | Durable function execution, scheduling, event fan-out | Invoked via `apps/web/api/inngest/route.ts` |
| Gmail API (per-coach) | Send email as coach, watch inbox for events | Called from `apps/web/lib/gmail/` — server-side only |
| Anthropic API | LLM draft generation | Called from `packages/ai-engine` — server-side only |
| Upstash Redis | Rate limiting, idempotency keys for webhooks | Called from API route middleware |

**What must never cross the client boundary:**
- Supabase service role key
- Anthropic API key
- Gmail OAuth access/refresh tokens
- Any call to `packages/ai-engine`

---

## Data Flow

### Primary flow: calendar no-show → sequence → draft → approval → send

```
1. Calendar webhook arrives at /api/webhooks/[provider]
   → Signature verified (HMAC or provider-specific)
   → Upstash Redis idempotency check (deduplicate replays)
   → Normalized into CalendarEvent shape (unified abstraction)
   → inngest.send("calendar/appointment.no-show", { coachId, leadId, appointmentId })

2. Inngest: intake-sequence function wakes
   → step.run: load lead + coach context from Supabase (service role)
   → step.run: update lead stage to "in_sequence"
   → step.run: create sequence record

3. For each touchpoint (e.g., touchpoints 1, 3, 7, 14 days):
   → step.run: assembleContext(leadId, coachId) → builds prompt package
   → step.run: generateDraft() → Anthropic call → returns content
   → step.run: persist draft to drafts table (status: "pending", scheduled_send_at set)
   → step.run: notify coach on all channels (dashboard Realtime + Resend + Slack + Twilio)
   → step.sleepUntil: draft.scheduled_send_at minus 24h (surfaces to coach)
   → step.waitForEvent("draft/coach.action", { timeout: "24h", match: "data.draftId" })
     - If approved: proceed to pre-send check step
     - If timeout: move draft to HOLD status, stop
   → step.run: preSendSafetyCheck() — abort if lead replied, coach emailed, stage wrong
   → step.run: send via Gmail API using coach's OAuth token
   → step.run: log email_event, update draft status to "sent"

4. cancelOn listening throughout:
   → "lead/replied" event cancels running sequence for that leadId
   → "sequence/cancelled" event cancels by sequenceId
   → "coach/manually-emailed-lead" event pauses sequence
```

### Gmail monitoring flow (inbox watch):

```
Gmail Pub/Sub push → /api/gmail/pubsub
  → parse notification (coachId from subscription metadata)
  → inngest.send("gmail/message.received", { coachId, historyId })
  → Inngest function: fetch history from Gmail API with coach token
    → if reply from lead: inngest.send("lead/replied", { coachId, leadId })
    → if coach sent email: inngest.send("coach/manually-emailed-lead", { coachId, leadId })
    → if open event: update lead timeline
```

---

## Inngest Architecture

### Client setup (singleton)

```typescript
// apps/web/inngest/client.ts
import { Inngest } from "inngest";
import { INNGEST_EVENTS } from "@client/shared/constants";

export const inngest = new Inngest({ id: "client-architecture" });
```

### Serve endpoint (App Router)

```typescript
// apps/web/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { intakeSequenceFn } from "../../inngest/functions/intake-sequence";
import { draftApprovalFn } from "../../inngest/functions/draft-approval";
import { gmailMonitorFn } from "../../inngest/functions/gmail-monitor";
import { preSendCheckFn } from "../../inngest/functions/pre-send-check";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [intakeSequenceFn, draftApprovalFn, gmailMonitorFn, preSendCheckFn],
});
```

### Event naming convention

Format: `domain/noun.verb` — all lowercase, hyphen-separated multi-word nouns.

```
calendar/appointment.no-show
calendar/appointment.completed
lead/replied
lead/stage-changed
lead/created
sequence/started
sequence/paused
sequence/cancelled
sequence/completed
draft/created
draft/coach-approved
draft/coach-edited
draft/sent
draft/held
draft/pre-send-failed
gmail/message-received
gmail/watch-renewed
coach/manually-emailed-lead
coach/token-refreshed
```

### Multi-tenant isolation pattern

Concurrency key on `event.data.coachId` prevents one coach's volume from starving others (verified: Inngest's "virtual queue per key" pattern, HIGH confidence):

```typescript
export const intakeSequenceFn = inngest.createFunction(
  {
    id: "intake-sequence",
    concurrency: {
      limit: 3,                           // max 3 concurrent runs per coach
      key: "event.data.coachId",          // virtual queue per coach — no noisy neighbor
    },
    cancelOn: [
      {
        event: "sequence/cancelled",
        if: "async.data.sequenceId == event.data.sequenceId",
      },
      {
        event: "lead/replied",
        if: "async.data.leadId == event.data.leadId",
      },
    ],
  },
  { event: "calendar/appointment.no-show" },
  async ({ event, step }) => {
    const { coachId, leadId } = event.data;

    const [lead, coach] = await step.run("load-context", async () => {
      // service role client — bypasses RLS intentionally here
      return Promise.all([loadLead(leadId), loadCoach(coachId)]);
    });

    await step.run("update-lead-stage", () => updateLeadStage(leadId, "in_sequence"));

    const sequenceId = await step.run("create-sequence", () =>
      createSequence({ leadId, coachId, module: 1 })
    );

    // Touchpoint schedule: days 1, 3, 7, 14
    const touchpoints = [1, 3, 7, 14];
    for (const dayOffset of touchpoints) {
      const sendAt = computeSendTime(lead, dayOffset);
      const notifyAt = new Date(sendAt.getTime() - 24 * 60 * 60 * 1000);

      const draft = await step.run(`generate-draft-day-${dayOffset}`, () =>
        generateAndPersistDraft({ sequenceId, coachId, leadId, touchpointIndex: dayOffset, sendAt })
      );

      await step.sleepUntil(`sleep-until-notify-${dayOffset}`, notifyAt);

      await step.run(`notify-coach-${dayOffset}`, () =>
        notifyCoachAllChannels({ coachId, draftId: draft.id })
      );

      const coachAction = await step.waitForEvent(`wait-for-coach-${dayOffset}`, {
        event: "draft/coach-approved",
        timeout: "24h",
        if: `async.data.draftId == event.data.draftId`,
      });

      if (!coachAction) {
        // Timeout: move to HOLD
        await step.run(`hold-draft-${dayOffset}`, () => holdDraft(draft.id));
        break; // Do not proceed to next touchpoint
      }

      const safeToSend = await step.run(`pre-send-check-${dayOffset}`, () =>
        preSendSafetyCheck({ leadId, coachId, draftId: draft.id })
      );

      if (!safeToSend) {
        await step.run(`cancel-draft-${dayOffset}`, () => cancelDraft(draft.id, safeToSend.reason));
        break;
      }

      await step.sleepUntil(`sleep-until-send-${dayOffset}`, sendAt);

      await step.run(`send-draft-${dayOffset}`, () =>
        sendViaGmail({ coachId, draftId: draft.id })
      );
    }
  }
);
```

### Vercel Cron → Inngest (for Gmail watch renewal and scheduled checks)

```typescript
// apps/web/app/api/cron/gmail-watch-renew/route.ts
// Called by Vercel Cron (vercel.json cron config), fires daily
export async function GET() {
  await inngest.send({ name: "gmail/watch-renewal-requested", data: {} });
  return Response.json({ ok: true });
}
```

---

## Gmail Integration Architecture

### Problem: one OAuth2 client per coach, tokens in Vault

Each coach has their own Gmail OAuth token pair stored in Supabase Vault. The system must reconstruct a per-coach `OAuth2Client` instance at runtime from stored tokens.

### Token storage pattern

On OAuth callback completion, store tokens in Vault and save only the Vault UUID in the `integrations` table — never the raw token:

```typescript
// On OAuth callback
const vaultUuid = await supabase.rpc("vault_store_tokens", {
  p_coach_id: coachId,
  p_tokens: JSON.stringify({ access_token, refresh_token, expiry_date }),
});
// Store only the vault UUID reference
await supabase.from("integrations").upsert({
  coach_id: coachId,
  provider: "gmail",
  vault_secret_id: vaultUuid,   // UUID pointing to vault.secrets row
  scopes: ["gmail.send", "gmail.readonly"],
  status: "connected",
});
```

Vault SQL functions (HIGH confidence — verified against Supabase docs):
```sql
-- Store
SELECT vault.create_secret(
  '{"access_token":"...","refresh_token":"...","expiry_date":123}',
  'gmail_tokens_' || coach_id::text,
  'Gmail OAuth tokens for coach'
) AS vault_uuid;

-- Retrieve (server-side, service role only)
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'gmail_tokens_' || coach_id::text;

-- Update on token refresh
SELECT vault.update_secret(vault_uuid, '{"access_token":"new...","refresh_token":"..."}');
```

### Per-coach Gmail client factory

```typescript
// apps/web/lib/gmail/GmailClient.ts
import { google } from "googleapis";

export async function getGmailClientForCoach(coachId: string) {
  // server-side only — uses service role
  const tokens = await retrieveGmailTokensFromVault(coachId);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials(tokens);

  // Auto-refresh: listen for new tokens and persist back to Vault
  oauth2Client.on("tokens", async (newTokens) => {
    await updateGmailTokensInVault(coachId, newTokens);
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
```

### Gmail inbox monitoring: push over polling

Gmail's `users.watch()` API registers a Google Pub/Sub topic. Google pushes a notification to our endpoint when history changes. This is far more efficient than polling (which would require per-coach cron jobs every minute).

```
Setup per coach:
gmail.users.watch({ userId: "me", requestBody: { topicName: "projects/PROJECT_ID/topics/gmail-notifications" } })
→ Returns historyId, expiration (7 days max)
→ Must be renewed before expiry — Vercel Cron → Inngest handles this daily

On push notification:
POST /api/gmail/pubsub
→ Base64-decode message data to get { emailAddress, historyId }
→ Look up coachId by emailAddress (coaches table)
→ inngest.send("gmail/message-received", { coachId, historyId })
→ Inngest function calls gmail.users.history.list({ startHistoryId })
  → Check for: messageAdded (new emails from leads), labelAdded (coach sent from Gmail)
```

**Watch renewal:** Must happen every 7 days or less. Vercel Cron fires daily, Inngest loops through all active Gmail integrations and renews each watch.

### Send-as coach

```typescript
const gmail = await getGmailClientForCoach(coachId);
const raw = createMimeMessage({ to, from: coachEmail, subject, body });
await gmail.users.messages.send({
  userId: "me",
  requestBody: { raw: Buffer.from(raw).toString("base64url") },
});
```

The email originates from the coach's Gmail account — it appears in their Sent folder, carries their email address, and has full Gmail deliverability. This is the critical trust mechanism.

---

## AI Context Assembly

Context assembly is the most expensive and most important operation in the system. Do it wrong and drafts are generic. Do it right and every draft earns trust.

### Input package per draft (verified against PROJECT.md spec)

The `assembleContext` function in `packages/ai-engine/src/context-assembler.ts` pulls seven distinct data sources and packs them into a structured object:

```typescript
export interface DraftContext {
  // Layer 1: Coach identity
  coachVoiceModel: {
    structured: CoachVoiceProfile;    // tone, formality, sentence length, openers, never-say
    examples: string[];               // 10-15 real message examples (few-shot)
  };
  coachServiceInfo: CoachServiceInfo; // offer, program, outcomes, pricing

  // Layer 2: Lead intelligence
  lead: LeadProfile;                  // name, email, source, current stage
  leadTimeline: TimelineEvent[];       // chronological events with types and dates
  conversationHistory: Message[];      // full email + DM thread, chronologically ordered
  callTranscripts: Transcript[];       // all transcripts for this lead

  // Layer 3: Sequence state
  previousMessages: SentMessage[];    // what the system already sent in this sequence
  touchpointIndex: number;            // 1st, 2nd, 3rd follow-up etc.
  touchpointType: string;             // "no-show-follow-up" | "post-call-follow-up" | "re-engagement"
}
```

### Assembly strategy

Pull only what is needed. Truncate intelligently. Most coaches have ≤20 messages with a given lead.

```typescript
export async function assembleContext(
  leadId: string,
  coachId: string,
  sequenceId: string,
  touchpointIndex: number
): Promise<DraftContext> {
  // Parallel fetch — all queries are indexed on coach_id + lead_id
  const [lead, coach, timeline, conversation, transcripts, previousMessages] =
    await Promise.all([
      fetchLead(leadId),
      fetchCoachWithVoiceModel(coachId),
      fetchLeadTimeline(leadId),
      fetchConversationHistory(leadId, { limit: 30 }), // last 30 messages
      fetchCallTranscripts(leadId, { maxTokens: 4000 }), // truncate oldest if needed
      fetchPreviousSequenceMessages(sequenceId),
    ]);

  return {
    coachVoiceModel: coach.voice_model,
    coachServiceInfo: coach.service_info,
    lead,
    leadTimeline: timeline,
    conversationHistory: conversation,
    callTranscripts: transcripts,
    previousMessages,
    touchpointIndex,
    touchpointType: deriveType(timeline),
  };
}
```

### Prompt structure

```typescript
export async function generateDraft(ctx: DraftContext): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: buildSystemPrompt(ctx.coachVoiceModel),  // voice profile + instructions
    messages: [
      // Few-shot examples injected as user/assistant pairs
      ...ctx.coachVoiceModel.examples.map((ex) => fewShotPair(ex)),
      // Actual task
      {
        role: "user",
        content: buildTaskPrompt(ctx),
      },
    ],
  });
  return response.content[0].text;
}

function buildSystemPrompt(voiceModel: CoachVoiceModel): string {
  return `You write follow-up messages for ${voiceModel.coachName}. 
Write in their exact voice. 

Voice characteristics:
- Tone: ${voiceModel.structured.tone.join(", ")}
- Formality: ${voiceModel.structured.formality}
- Sentence length: ${voiceModel.structured.sentenceLength}
- Opener patterns: ${voiceModel.structured.openerPhrases.join(" | ")}
- Never say: ${voiceModel.structured.neverSayList.join(", ")}

The following examples show real messages ${voiceModel.coachName} has written:`;
}

function buildTaskPrompt(ctx: DraftContext): string {
  return `Write touchpoint #${ctx.touchpointIndex} for this lead:

LEAD: ${ctx.lead.name} (${ctx.lead.email})
SOURCE: ${ctx.lead.source}
STAGE: ${ctx.lead.stage}

TIMELINE:
${formatTimeline(ctx.leadTimeline)}

CONVERSATION HISTORY:
${formatConversation(ctx.conversationHistory)}

${ctx.callTranscripts.length > 0 ? `CALL TRANSCRIPT:\n${formatTranscripts(ctx.callTranscripts)}` : "No transcript available."}

${ctx.previousMessages.length > 0 ? `PREVIOUS SYSTEM MESSAGES:\n${formatPreviousMessages(ctx.previousMessages)}` : "First message in sequence."}

SERVICE INFO:
${formatServiceInfo(ctx.coachServiceInfo)}

Write the ${ctx.touchpointType} message. Reference what was actually discussed. Do not use templates.`;
}
```

### Token budget management

- System prompt + few-shot examples: ~1,500–2,000 tokens (fixed cost per coach)
- Timeline + conversation: ~500–1,500 tokens (trim oldest if >2,000)
- Transcripts: cap at 4,000 tokens, summarize if longer
- Total input budget: ~8,000 tokens (leaves ample room within claude-sonnet-4-6 context)
- Output: 400–800 tokens per draft (email length)

Implement `truncateToTokenBudget(text, maxTokens)` using Anthropic's token counting endpoint or a rough character-based heuristic (1 token ≈ 4 chars). Apply before assembly, not after.

---

## Webhook Fan-Out Architecture

### Unified calendar abstraction

All 7 calendar providers (Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal) send webhooks to provider-specific endpoints, but all normalize to a single internal event type.

```
/api/webhooks/calendly    ─┐
/api/webhooks/cal-com     ─┤
/api/webhooks/acuity      ─┤  → normalizeCalendarEvent() → CalendarEvent
/api/webhooks/setmore     ─┤     → inngest.send("calendar/appointment.no-show", ...)
/api/webhooks/square      ─┤
/api/webhooks/ms-bookings ─┤
/api/webhooks/tidycal     ─┘
```

```typescript
// packages/shared/src/types/calendar.ts
export interface CalendarEvent {
  coachId: string;
  leadId: string | null;      // may need to resolve from email
  leadEmail: string;
  appointmentId: string;
  appointmentAt: string;      // ISO 8601
  type: "no_show" | "completed" | "cancelled" | "rescheduled";
  provider: CalendarProvider;
  rawPayload: unknown;        // kept for debugging
}
```

Each provider handler:
1. Verifies signature (provider-specific HMAC — Zod validates shape, custom fn verifies sig)
2. Calls Upstash Redis `SET NX` for idempotency (key = `webhook:{provider}:{eventId}`, TTL 24h)
3. Normalizes to `CalendarEvent`
4. Resolves `leadId` from email (look up or create lead)
5. Sends Inngest event

### Fan-out for multi-coach webhook endpoints

Some providers use a single webhook URL for all coaches. The handler resolves `coachId` from the webhook payload metadata (Calendly includes the user's webhook token, Acuity includes the apiKey in the subscription setup). Store a `webhook_secrets` mapping per coach per provider.

```typescript
// integrations table has: provider, coach_id, webhook_secret (Vault reference)
// On webhook arrival: extract provider identifier → look up coach_id
const coachId = await resolveCoachFromWebhookPayload(provider, payload, signature);
```

---

## RLS + Vault Architecture

### RLS policy pattern (all tables)

Every table follows this exact pattern (verified against Supabase docs, HIGH confidence):

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_leads" ON leads
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
```

The `FORCE ROW LEVEL SECURITY` clause ensures the policy applies even to the table owner — critical for defense in depth.

### Service role isolation

Inngest functions and internal API routes that need cross-coach access (e.g., admin dashboard, Vercel Cron tasks) use the Supabase service role client. This client bypasses RLS entirely and must never leave the server:

```typescript
// apps/web/lib/supabase/server-admin.ts
// This file MUST only be imported by server-side code (Inngest functions, API routes)
import { createClient } from "@supabase/supabase-js";
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // never exposed to client
);
```

Regular coach-facing server components and API routes use the authenticated client (respects RLS):

```typescript
// apps/web/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
// Uses cookies — automatically scopes to auth.uid() via RLS
```

### Vault access pattern

Vault operations require the service role. They are never called from client components.

```typescript
// Retrieve tokens from Vault (server-side only)
async function retrieveGmailTokensFromVault(coachId: string) {
  const { data } = await adminClient
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", `gmail_tokens_${coachId}`)
    .single();
  return JSON.parse(data.decrypted_secret);
}
```

The `integrations` table stores only `vault_secret_id` (a UUID reference). Raw tokens never appear in application columns.

---

## Real-Time Dashboard Updates

### Recommendation: Supabase Realtime for the approval queue

The draft approval queue is the highest-stakes real-time surface. Use Supabase Realtime `postgres_changes` subscriptions filtered to the coach's own drafts. This gives instant push when Inngest creates a new draft — no polling, no page refresh.

```typescript
// apps/web/components/approvals/ApprovalQueue.tsx (client component)
"use client";
useEffect(() => {
  const channel = supabase
    .channel("coach-drafts")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "drafts",
      filter: `coach_id=eq.${coachId}`,   // Supabase RLS also enforces this server-side
    }, (payload) => {
      setDrafts((prev) => [payload.new as TDraft, ...prev]);
    })
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "drafts",
      filter: `coach_id=eq.${coachId}`,
    }, (payload) => {
      setDrafts((prev) => prev.map((d) => d.id === payload.new.id ? payload.new as TDraft : d));
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [coachId]);
```

RLS on the Realtime subscription is enforced server-side — a coach cannot subscribe to another coach's changes even if they modify the filter.

### Polling as fallback

Lead list and sequence status (less time-critical) can use React's `revalidatePath` / `router.refresh()` on approval actions, plus a 30-second polling interval as belt-and-suspenders. No need for Realtime on every table.

### Admin dashboard

Admin at `/admin` uses the service role client server-side — fetches all coaches, all sequence activity. No Realtime needed — page refresh on demand.

---

## Build Order Implications

Dependencies flow strictly downward. Each phase unblocks the next.

```
Phase 1 — Foundation (must exist before anything else)
  Supabase project + all migrations (coaches, leads, sequences, drafts, integrations, email_events)
  RLS policies + Vault configured
  packages/shared — TLead, TDraft, TSequence, TCoach, Zod validators, event name constants
  packages/database — generated types
  apps/web scaffolding — Next.js 15, Tailwind v4, shadcn
  Auth — invite-only (Daniel creates coach accounts via admin)
  Lead CRUD + state machine (stage transitions)
  Basic dashboard — lead list + lead profile
  Admin at /admin
  Gmail OAuth flow — connect + store tokens in Vault
  UNLOCKS: Phase 2 (voice model builder needs lead data structure), Phase 3 (sequences need leads + OAuth)

Phase 2 — Intelligence (needs Phase 1 complete)
  packages/ai-engine — context assembler, draft generator, voice model builder
  Voice model ingestion (Gmail export, LinkedIn CSV, WhatsApp .txt parsers)
  Transcript integrations (Fathom, Fireflies, Otter APIs)
  Draft generation endpoint (server-side only, Zod-validated)
  UNLOCKS: Phase 3 (sequences call ai-engine to generate drafts)

Phase 3 — Automation (needs Phase 1 + Phase 2)
  Inngest functions — intake-sequence, gmail-monitor, pre-send-check
  Inngest serve endpoint (apps/web/api/inngest/route.ts)
  Calendar webhook handlers — all 7 providers (unified abstraction first, then provider adapters)
  Gmail Pub/Sub watch setup + renewal cron
  Smart scheduler logic
  UNLOCKS: Phase 4 (approval channels need drafts surfacing)

Phase 4 — Approval Channels (needs Phase 3)
  Dashboard approval queue (Realtime subscription)
  Resend email notifications
  Slack webhook notifications
  Twilio WhatsApp + SMS notifications
  Autonomous mode logic (settings toggle → Inngest behavior change)
  UNLOCKS: Phase 5 (everything functional, now polish)

Phase 5 — Polish (needs Phase 4)
  Module 2 + 3 locked sell screens
  Full onboarding wizard
  Settings page (integrations, voice model review, autonomous toggle)
  Playwright E2E test suite
  Impeccable audit pass — all coach-facing components
```

**Critical path:** The Supabase schema must be finalized in Phase 1 before any Inngest functions are written in Phase 3, because functions depend on `packages/database` types. Running migrations after Inngest functions exist creates painful type regeneration cycles.

---

## Key Interfaces

### Event payloads (shared constants in packages/shared)

```typescript
// packages/shared/src/constants/events.ts
export const EVENTS = {
  CALENDAR_NO_SHOW: "calendar/appointment.no-show",
  LEAD_REPLIED: "lead/replied",
  SEQUENCE_CANCELLED: "sequence/cancelled",
  DRAFT_COACH_APPROVED: "draft/coach-approved",
  DRAFT_COACH_EDITED: "draft/coach-edited",
  GMAIL_MESSAGE_RECEIVED: "gmail/message-received",
  COACH_MANUALLY_EMAILED_LEAD: "coach/manually-emailed-lead",
} as const;

// Event data shapes — typed at the Inngest client level
export interface CalendarNoShowEvent {
  coachId: string;
  leadId: string;
  appointmentId: string;
  provider: CalendarProvider;
}

export interface DraftCoachApprovedEvent {
  draftId: string;
  coachId: string;
  sequenceId: string;
}
```

### Calendar normalization interface

```typescript
// packages/shared/src/types/calendar.ts
export type CalendarProvider =
  | "calendly" | "cal-com" | "acuity" | "setmore"
  | "square" | "ms-bookings" | "tidycal";

export interface ICalendarWebhookAdapter {
  verifySignature(payload: string, signature: string, secret: string): boolean;
  normalize(rawPayload: unknown): CalendarEvent | null;
}
```

### AI engine public API

```typescript
// packages/ai-engine/src/index.ts — the only surface area exposed to apps/web
export { assembleContext } from "./context-assembler";
export { generateDraft } from "./draft-generator";
export { buildVoiceModel, updateVoiceModel } from "./voice-model";
export { preSendSafetyCheck } from "./safety-checker";
export type { DraftContext, CoachVoiceModel, SafetyCheckResult };
```

### Gmail client interface

```typescript
// apps/web/lib/gmail/types.ts
export interface IGmailSendOptions {
  to: string;
  subject: string;
  body: string;                 // HTML allowed
  coachEmail: string;           // From address
  draftId: string;              // For tracking/idempotency
}

export interface IGmailWatchResult {
  historyId: string;
  expiration: string;           // Unix timestamp ms
}
```

### Pre-send safety check

```typescript
// packages/ai-engine/src/safety-checker.ts
export interface SafetyCheckResult {
  safe: boolean;
  reason?: "lead-replied" | "coach-sent-email" | "stage-mismatch" | "lead-unsubscribed";
}

export async function preSendSafetyCheck(
  leadId: string,
  coachId: string,
  draftId: string
): Promise<SafetyCheckResult>
```

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Turborepo monorepo structure | HIGH | Context7 / vercel/turborepo official docs |
| Inngest multi-tenant concurrency keys | HIGH | Context7 / inngest/website official docs |
| Inngest cancelOn + waitForEvent patterns | HIGH | Context7 / inngest/website official docs |
| Inngest sleepUntil for scheduled sends | HIGH | Context7 / inngest/website official docs |
| Gmail OAuth per-coach token management | HIGH | Context7 / googleapis official docs |
| Gmail users.watch Pub/Sub push model | HIGH | Context7 / googleapis official docs |
| Supabase Vault create_secret / decrypted_secrets | HIGH | Context7 / supabase/supabase official docs |
| Supabase RLS FORCE ROW LEVEL SECURITY | HIGH | Context7 / supabase/supabase official docs |
| Supabase Realtime postgres_changes filter | HIGH | Context7 / supabase/supabase official docs |
| AI context assembly token budgeting | MEDIUM | Architecture inference from Anthropic model specs + project spec |
| Webhook fan-out normalization pattern | MEDIUM | Standard industry pattern, not library-specific |
| Phase build order dependencies | HIGH | Derived from technical dependency graph |
