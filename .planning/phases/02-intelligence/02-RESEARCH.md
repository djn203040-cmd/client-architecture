# Phase 2: Intelligence - Research

**Researched:** 2026-05-19
**Domain:** AI draft generation, voice model, transcript webhooks, Gmail thread view
**Confidence:** HIGH (SDK verified via Context7; schema verified from codebase; webhook payloads verified via official docs)

---

## Summary

Phase 2 delivers the intelligence layer: a voice model builder that analyzes a multi-channel message corpus and extracts a structured profile + example set, two transcript webhook integrations (Fireflies + Zoom), an AI draft engine powered by the Anthropic TypeScript SDK, and a Gmail email thread view in the lead profile.

The existing codebase provides solid infrastructure to build on. The `packages/ai-engine` package is scaffolded with a server-only guard. The `transcripts`, `drafts`, `coaches.voice_model` and `draft_edits` tables are already live in Supabase. The only schema addition Phase 2 requires is an `ai_summary TEXT` column on the `leads` table, added via a new migration. The Realtime subscription pattern is already established in `draft-realtime.tsx` and can be replicated for new subscriptions. The Gmail API client pattern (`getGmailClientForCoach`) handles OAuth token management, so the thread view is a thin read-only call on top of the existing auth plumbing.

The most complex plan is the AI draft engine, which requires careful prompt engineering, context assembly with token budgeting, and a state machine covering 8 distinct lead states. The confidence indicator and draft regeneration patterns are extensions of what DraftCard already scaffolds.

**Primary recommendation:** Fill `packages/ai-engine/src/` in Wave 3 (AI engine) only after Wave 1 (voice model builder) and Wave 2 (transcript integration) are complete — the engine depends on voice model data being loadable and transcript content being stored.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Voice Model Builder (02-01)**
- D-01: Import method — Labeled per channel with separate sections for Gmail, LinkedIn, Instagram, WhatsApp. Each section: paste textarea + optional `.txt` file upload. Coach can populate any or all channels.
- D-02: Layer 2 examples — Raw text only. No per-example labels or metadata. Coach does not manually curate examples.
- D-03: AI role — AI analyzes the full imported corpus to produce: (1) Layer 1 structured profile (tone adjectives, formality level, emoji habits, opener phrases, closer phrases, never-say list), and (2) best 10–15 examples selected as Layer 2.
- D-04: Coach reviews Layer 1 via AI-generated profile card with editable chips/tags. Coach can remove, add, or confirm each element. Never-say list is AI-recommended — coach can extend or confirm.
- D-05: Coach reviews Layer 2 as a visible list of selected examples (truncated previews). Coach can remove or swap individual examples.
- D-06: Re-analysis — Coach can trigger re-analysis at any time after adding more data. New analysis merges with or replaces the current profile; coach re-confirms.
- D-07: Location — `Settings → My Voice` for Phase 2.
- D-08: Confidence indicator — Warning badge/banner on the draft when fewer than 8 voice examples exist. Does not block draft generation.

**Transcript Integration (02-02)**
- D-09: Unmatched transcript handling — "Unmatched" tab in the existing `DraftQueueScaffold`.
- D-10: Unmatched queue assignment UI — Shows call date, duration, ~200-char transcript preview. Below: searchable lead picker. One-click assign.
- D-11: Fuzzy matching — name + timestamp fuzzy match before routing to unmatched queue. High confidence → auto-assign. Low confidence → surface with suggestion.
- D-12: Post-match action — Successful match auto-triggers AI draft generation.
- D-13: Manual upload — Lives in the lead profile. Stored as `provider='manual'`, `matched_by='manual'`. Auto-triggers draft.

**AI Draft Engine + Stage-Aware Prompts (02-03)**
- D-14: All lead states have distinct prompt framing (see state framing guide in CONTEXT.md).
- D-15: Manual "Generate" button on each lead profile reads the current state and generates a draft accordingly. Also auto-triggered on transcript match.
- D-16: Hard block states — `unsubscribed`, `do_not_contact`, `bounced` — no drafts ever generated. Generate button hidden/disabled.

**AI Lead Description (02-03)**
- D-17: New `ai_summary TEXT` column on `leads` table — requires a Supabase migration.
- D-18: AI writes a free-form plain-text paragraph describing the lead: pain points, stated/implied goals, relevant life context, emotional state signals.
- D-19: Auto-updated whenever new data arrives: new transcript ingested, new replied email received.
- D-20: Injected as primary context layer into every draft generation call.
- D-21: Displayed in the lead profile as a pinned card above the Thread/Timeline/Notes tabs.
- D-22: Coach can annotate or override inline. Coach edits are preserved from AI overwrites.

**Draft Regeneration + Confidence (02-04)**
- D-23: One-click regen on any draft. Confidence indicator as per D-08.

**Email Thread View (02-05)**
- D-24: Lives as the first tab in the lead profile tab bar: `Thread | Timeline | Notes`.
- D-25: Individual emails collapsed by default. Click to expand. Most recent expanded by default.

### Claude's Discretion
- Token budget priority when context exceeds limits — planner determines truncation order. Per AI-SPEC.md Section 4b: transcript body → prior messages → coach notes → Layer 2 examples (minimum 8 kept).
- XML delimiter structure for AI prompts — per AI-SPEC.md: `<voice_profile>`, `<voice_examples>`, `<lead_context>`, `<transcript>`, `<conversation_history>`, `<instruction>`.

### Deferred Ideas (OUT OF SCOPE)
- Voice model builder as onboarding wizard step — Phase 5 only.
- Converted state → onboarding module trigger — future phase.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-001 | AI draft generated using: voice model (Layer 1 + Layer 2) + lead profile + coach notes + call transcripts + sequence position + prior emails sent | Context assembly pattern verified in AI-SPEC.md + SDK docs |
| AI-002 | Draft generation uses `claude-sonnet-4-6` server-side only — never in client code | SDK verified; server-only guard already scaffolded |
| AI-003 | All lead-supplied content wrapped in XML delimiters. System instruction: only reference facts in context | XML delimiter structure defined in AI-SPEC.md |
| AI-004 | Token count checked via `client.messages.countTokens()` before every generation. If over 150K, trim oldest history. Target 8K input | `countTokens()` API verified via Context7 |
| AI-005 | Drafts are stage-aware: `no_show` and `call_completed` tracks produce different messaging | State framing table in CONTEXT.md D-14 |
| AI-006 | Each draft knows its position in the sequence and references prior messages sent | Context assembler includes `touchpoint_index` from drafts table |
| AI-007 | Confidence indicator shown when voice model context is thin (fewer than 8 examples) | `confidence_level` column already on `drafts` table |
| AI-010 | Draft regeneration: coach can request a new draft for the same lead/touchpoint with one click | Extends DraftCard — `PATCH /api/drafts/[id]/regenerate` pattern |
| AI-011 | Draft regeneration reuses same context, fresh Anthropic call, replaces current draft | Regeneration flow defined in AI-SPEC.md |
| VOICE-001 | Layer 1: structured profile per coach — tone adjectives, formality level, sentence length, emoji habits, opener phrases, closer phrases, never-say list | Zod schema defined in AI-SPEC.md; `coaches.voice_model JSONB` column exists |
| VOICE-002 | Layer 2: 10–15 curated real message examples per coach as few-shot context | `coaches.voice_model JSONB` stores both layers |
| VOICE-003 | Voice model built from: Gmail exports, LinkedIn CSV, WhatsApp .txt, Instagram DMs | Multi-channel textarea + file upload UI (D-01) |
| VOICE-004 | Minimum 8 voice examples required before AI draft generation is activated | Block guard in `generateDraft()` + UI empty state |
| VOICE-005 | Voice model builder UI guides coach through uploading and curating examples | Phase 2: Settings → My Voice; Phase 5: onboarding wizard |
| TRANS-001 | Webhook listener for Fireflies.ai transcripts | Fireflies payload shape + auth verified |
| TRANS-002 | Webhook listener for Zoom transcripts | Zoom signature verification pattern verified |
| TRANS-003 | Transcripts matched to lead by email or name + call timestamp | Fuzzy matching decision (D-11) |
| TRANS-004 | Transcript stored against lead record in full | `transcripts` table already exists |
| TRANS-005 | Transcript content injected into AI context | Context assembler reads `transcripts` table |
| TRANS-006 | Manual transcript upload fallback (paste or file upload) | Lead profile upload UI (D-13) |
| TRANS-007 | Webhook signatures verified for all transcript provider webhooks | HMAC-SHA256 for both Fireflies and Zoom |
| TRANS-008 | If multiple transcripts exist, all included in context (oldest-first, trimmed by token limit) | Context assembler strategy defined |
| GMAIL-009 | Email thread view — full back-and-forth conversation with a lead via Gmail API | `threads.get` with `format:'full'` — existing `getGmailClientForCoach` handles auth |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Voice corpus analysis (AI call) | API/Backend (`packages/ai-engine`) | — | Server-only; ANTHROPIC_API_KEY never in client |
| Draft generation (AI call) | API/Backend (`packages/ai-engine`) | — | Server-only; must check hard-block states before API call |
| Voice model storage/retrieval | Database (Supabase `coaches.voice_model`) | API/Backend | JSONB read at generation time; RLS scoped to coach |
| Webhook ingestion (Fireflies, Zoom) | API/Backend (Next.js route handlers) | — | Signature verification + adminClient writes; no auth cookie available |
| Transcript matching + lead assignment | API/Backend | — | Requires cross-table query; adminClient for webhook context |
| AI lead description (ai_summary) | API/Backend | Database | Written by AI engine; stored in `leads.ai_summary`; displayed in UI |
| Email thread view | API/Backend (route reads Gmail) | Frontend Server | `getGmailClientForCoach` fetches thread; RSC renders it |
| Voice model builder UI | Frontend (client component) | API/Backend | Coach interaction (chips, file paste, re-analyze); writes via API |
| Unmatched transcript queue | Frontend (client component, extends DraftQueueScaffold) | API/Backend | Reuses existing queue infrastructure |
| Confidence indicator | Frontend (extends DraftCard) | — | Reads `confidence_level` column already on `drafts` table |
| Draft regeneration | Frontend trigger → API/Backend | AI Engine | DraftCard button → `POST /api/drafts/[id]/regenerate` → ai-engine |
| Token counting | API/Backend (`token-counter.ts` in ai-engine) | — | `countTokens()` is itself an API call — server only |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `0.97.0` | Anthropic API client — `messages.create`, `messages.countTokens` | Locked by CLAUDE.md; only official SDK; no abstraction overhead |
| `zod` | already installed | Structured output parsing + API boundary validation | Required by CLAUDE.md on every API boundary |
| `googleapis` | already installed | Gmail `threads.get` for thread view | Already used in `lib/gmail/client.ts` |
| `langfuse` | `3.38.20` | Production AI call tracing | Specified in AI-SPEC.md; lightweight wrapper |
| `promptfoo` | `0.121.11` | CI/CD prompt regression eval | Specified in AI-SPEC.md; runs against eval YAML |

[VERIFIED: npm registry — `@anthropic-ai/sdk@0.97.0` published 2026-05-19]
[VERIFIED: npm registry — `langfuse@3.38.20`, `promptfoo@0.121.11`]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto` (Node built-in) | Node 22 built-in | HMAC-SHA256 for webhook signature verification | Fireflies `x-hub-signature` + Zoom `x-zm-signature` verification |
| `@supabase/supabase-js` | already installed | adminClient for webhook route writes (bypasses RLS intentionally) | All webhook handlers write transcripts as system, not as coach user |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `@anthropic-ai/sdk` | LangChain TS | LangChain adds abstraction + latency; not justified for discrete parametric calls |
| Direct `@anthropic-ai/sdk` | Vercel AI SDK | Vercel AI SDK targets streaming chat UIs; async background generation does not need it |

**Installation (new packages only):**
```bash
pnpm add @anthropic-ai/sdk langfuse --filter @client/ai-engine
pnpm add -D promptfoo --filter @client/ai-engine
```

---

## Architecture Patterns

### System Architecture Diagram

```
Coach browser (Settings → My Voice)
  │  POST /api/voice/analyze
  ▼
Next.js API route handler
  │  calls packages/ai-engine → analyzeVoiceCorpus()
  ▼
Anthropic API (claude-sonnet-4-6)
  │  returns Layer 1 JSON + selected Layer 2 examples
  ▼
coaches.voice_model JSONB (Supabase)

─────────────────────────────────────────

Fireflies / Zoom webhook POST
  │  /api/webhooks/transcripts/fireflies
  │  /api/webhooks/transcripts/zoom
  ▼
Signature verification (HMAC-SHA256)
  │
  ▼
Fetch full transcript content (Fireflies GraphQL / Zoom recordings API)
  │
  ▼
Lead matching (email → name+timestamp fuzzy → unmatched queue)
  │  match found
  ▼
transcripts table (Supabase)
  │  trigger
  ▼
POST /api/drafts/generate → ai-engine → drafts table
  │
  ▼
Supabase Realtime → DraftQueueScaffold (coach browser)

─────────────────────────────────────────

Lead profile (coach browser) → Thread tab
  │  GET /api/leads/[id]/thread
  ▼
getGmailClientForCoach() — reads Vault tokens
  │
  ▼
gmail.users.threads.get({ id: threadId, format: 'full' })
  │
  ▼
Rendered EmailThreadView component (server component → client display)
```

### Recommended Project Structure

```
packages/ai-engine/src/
├── index.ts                  # Public API: generateDraft, analyzeVoiceCorpus, updateLeadDescription
├── client.ts                 # Single Anthropic instance (server-only)
├── prompts/
│   ├── system.ts             # buildSystemPrompt (voice model → system string)
│   ├── draft.ts              # buildDraftUserPrompt (state-aware context assembly)
│   ├── voice-analysis.ts     # buildVoiceAnalysisPrompt (corpus → Layer 1 + Layer 2)
│   └── lead-description.ts  # buildLeadDescriptionPrompt (synthesize lead context)
├── context-assembler.ts      # assembleContext — orders + truncates context layers
├── token-counter.ts          # countTokens — calls countTokens API (budget check)
├── guardrails.ts             # isHardBlocked, scanNeverSayList, assertCoachIdScope
└── types.ts                  # DraftGenerationParams, VoiceAnalysisResult, etc.

apps/web/app/api/
├── voice/
│   └── analyze/route.ts      # POST — triggers voice corpus analysis
├── drafts/
│   ├── generate/route.ts     # POST — manual "Generate" button
│   └── [id]/
│       └── regenerate/route.ts  # POST — one-click regen
├── leads/
│   └── [id]/
│       └── thread/route.ts   # GET — Gmail thread for lead
├── webhooks/
│   └── transcripts/
│       ├── fireflies/route.ts  # POST — Fireflies webhook
│       └── zoom/route.ts       # POST — Zoom webhook

apps/web/app/(dashboard)/
├── settings/
│   └── voice/                # Settings → My Voice page
└── leads/[id]/
    └── components/
        ├── LeadAISummaryCard.tsx   # Pinned AI description card (D-21)
        ├── EmailThreadView.tsx     # Thread tab (D-24)
        └── ManualTranscriptUpload.tsx  # Paste/upload in lead profile (D-13)

apps/web/components/drafts/
└── UnmatchedTranscriptQueue.tsx  # New tab in DraftQueueScaffold (D-09)
```

### Pattern 1: Anthropic SDK Server-Only Call

```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript
// packages/ai-engine/src/client.ts
import Anthropic from '@anthropic-ai/sdk';
import 'server-only';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3, // auto-retries 429, 500, 502, 503 with exponential backoff
});
```

```typescript
// packages/ai-engine/src/index.ts
import 'server-only';
import { anthropic } from './client';

export async function generateDraft(params: DraftGenerationParams): Promise<string> {
  // 1. Hard-block check BEFORE any API call
  if (isHardBlocked(params.leadStatus)) return null;

  // 2. Token count check
  const context = await assembleContext(params);
  const tokenCheck = await anthropic.messages.countTokens({
    model: 'claude-sonnet-4-6',
    system: context.systemPrompt,
    messages: [{ role: 'user', content: context.userPrompt }],
  });
  // If over budget, context-assembler already truncated — log which layers

  // 3. Generate
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: context.systemPrompt,
    messages: [{ role: 'user', content: context.userPrompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected content block type');
  return block.text;
}
```

### Pattern 2: Fireflies Webhook Signature Verification

```typescript
// Source: docs.fireflies.ai/graphql-api/webhooks [VERIFIED: official docs]
// apps/web/app/api/webhooks/transcripts/fireflies/route.ts
import { createHmac, timingSafeEqual } from 'crypto';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature');
  if (!signature) return new Response('Missing signature', { status: 401 });

  const secret = process.env.FIREFLIES_WEBHOOK_SECRET!;
  const computed = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!timingSafeEqual(Buffer.from(computed), Buffer.from(signature))) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { meetingId: string; eventType: string; clientReferenceId?: string };
  // Fetch full transcript via Fireflies GraphQL API
  // POST https://api.fireflies.ai/graphql with Bearer token
  // Query: transcript(id: $meetingId) { sentences { speaker_name text } meeting_attendees { email } }
}
```

### Pattern 3: Zoom Webhook Signature Verification

```typescript
// Source: developers.zoom.us/docs/api/webhooks/ [VERIFIED: official Zoom docs]
// apps/web/app/api/webhooks/transcripts/zoom/route.ts
import { createHmac, timingSafeEqual } from 'crypto';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-zm-signature');
  const timestamp = request.headers.get('x-zm-request-timestamp');

  const message = `v0:${timestamp}:${rawBody}`;
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN!;
  const hash = createHmac('sha256', secret).update(message).digest('hex');
  const computed = `v0=${hash}`;

  if (!timingSafeEqual(Buffer.from(computed), Buffer.from(signature ?? ''))) {
    return new Response('Invalid signature', { status: 401 });
  }
  // ... process recording.transcript_completed or recording.completed
}
```

### Pattern 4: Gmail Thread Fetch

```typescript
// Source: developers.google.com/gmail/api/reference/rest/v1/users.threads/get [VERIFIED]
// apps/web/app/api/leads/[id]/thread/route.ts
import 'server-only';
import { getGmailClientForCoach } from '@/lib/gmail/client';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  // ... auth check ...
  const gmail = await getGmailClientForCoach(coachId);
  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',  // Returns full message data with payload.body
  });
  // thread.data.messages is Message[] — each has payload.body.data (base64url)
  // Decode: Buffer.from(bodyData, 'base64url').toString('utf8')
}
```

### Pattern 5: Voice Profile Zod Schema

```typescript
// Source: AI-SPEC.md Section 4b [CITED]
import { z } from 'zod';

export const VoiceProfileSchema = z.object({
  tone_adjectives: z.array(z.string()).min(3).max(8),
  formality_level: z.enum(['casual', 'conversational', 'professional', 'formal']),
  sentence_length: z.enum(['short', 'medium', 'long', 'varied']),
  emoji_usage: z.enum(['none', 'rare', 'occasional', 'frequent']),
  opener_phrases: z.array(z.string()).min(2).max(5),
  closer_phrases: z.array(z.string()).min(2).max(5),
  never_say_list: z.array(z.string()),
  selected_examples: z.array(z.string()).min(8).max(15),
});

export type TVoiceProfile = z.infer<typeof VoiceProfileSchema>;
```

### Pattern 6: Async Draft Generation (Fire-and-Forget)

```typescript
// Source: AI-SPEC.md Section 4b [CITED]
export async function POST(request: Request) {
  const { leadId } = await request.json();
  // Create draft row immediately with status = 'generating'
  const draft = await createDraftRecord(leadId, 'generating');
  // Fire-and-forget — catches internally, updates to 'error' on failure
  generateDraftAsync(leadId, draft.id).catch(handleGenerationError);
  return NextResponse.json({ draftId: draft.id, status: 'generating' });
}
// Client subscribes to drafts table via Supabase Realtime to see status update
```

### Anti-Patterns to Avoid

- **Anthropic client in client component or shared utils:** The `apiKey` leaks to the browser bundle. `packages/ai-engine` already has the server-only guard — never import it from a `"use client"` file.
- **Trusting `message.content` as a string:** The SDK returns `ContentBlock[]`. Always check `block.type === 'text'` before accessing `.text`.
- **Webhook handler using cookie-based Supabase client:** Webhook POSTs have no auth cookie. Use `adminClient` (service role) for all database writes in webhook handlers.
- **Blocking route handler waiting for AI generation:** AI calls take 4–8 seconds. Always fire-and-forget, return `draft.id` immediately, and let Realtime notify the client.
- **Assuming `ai_summary` migration is not needed:** The `leads` table does NOT have an `ai_summary` column in the current deployed schema (confirmed from `20260505000002_tables.sql`). A migration is required.
- **Storing Fireflies API key in plain env as coach-scoped:** Fireflies uses a single workspace API key for fetching transcripts via GraphQL, not per-coach OAuth. One env var for the workspace.
- **Zoom transcript via `recording.completed` file_type='TRANSCRIPT':** The recording.completed event payload includes recording_files with file_type "TRANSCRIPT" and a download_url. You must download the VTT file with a Bearer access token. It is NOT embedded in the webhook payload — requires a second API call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC signature verification | Custom crypto comparison | Node `crypto.createHmac` + `timingSafeEqual` | Timing attacks on naive `===` comparison |
| AI call retries | Custom sleep/retry loop | `maxRetries: 3` on `new Anthropic()` | SDK retries 429/500/502/503 with exponential backoff already |
| Token estimation | Character-counting heuristic | `anthropic.messages.countTokens()` | Character estimation at 3.5 chars/token is a rough approximation; `countTokens()` is exact and is itself just a lightweight API call |
| JSON parsing of AI output | Regex string parsing | Zod `.safeParse()` after XML extraction | Validates schema, provides typed result, catches partial outputs |
| Cross-coach voice model mixing | Runtime assertions | Pre-call `assertCoachIdScope()` guard in `guardrails.ts` | Schema bug or test data bleed produces drafts that destroy trust |

---

## Schema State — What Exists Before Phase 2

**Confirmed from `supabase/migrations/20260505000002_tables.sql`:** [VERIFIED: codebase]

| Table / Column | Exists? | Notes |
|----------------|---------|-------|
| `coaches.voice_model JSONB` | YES | Default `'{}'`; Phase 2 populates it |
| `transcripts` table | YES | Full schema with `provider`, `content`, `matched_by`, `token_count` |
| `drafts.confidence_level TEXT` | YES | `'high'` or `'low'` |
| `drafts.generation_context JSONB` | YES | Stores truncation metadata |
| `leads.ai_summary TEXT` | **NO** | **Required migration** — add in Phase 2 Wave 1 |
| `leads.coach_notes TEXT` | YES | Already injected into AI context |

**Migration required for Phase 2:**
```sql
-- Phase 2: AI lead description
ALTER TABLE leads ADD COLUMN ai_summary TEXT;
ALTER TABLE leads ADD COLUMN ai_summary_protected BOOLEAN NOT NULL DEFAULT false;
-- ai_summary_protected: true when coach has manually annotated (D-22 — preserves edits from AI overwrites)
```

**RLS note:** `leads` table already has `ENABLE ROW LEVEL SECURITY` + `coaches_own_leads` policy scoped to `coach_id = auth.uid()`. The migration requires no new policies — the existing policy covers the new column. [VERIFIED: 20260505000004_rls.sql]

---

## Fireflies Integration Details

[VERIFIED: docs.fireflies.ai/graphql-api/webhooks + docs.fireflies.ai/graphql-api/query/transcript]

**Webhook payload (POST to your endpoint):**
```json
{
  "meetingId": "ASxwZxCstx",
  "eventType": "Transcription completed",
  "clientReferenceId": "optional-custom-id"
}
```

**Signature header:** `x-hub-signature: sha256=<hex>` — HMAC-SHA256 of raw request body using shared secret.

**Fetching the transcript (second API call required):**
```
POST https://api.fireflies.ai/graphql
Authorization: Bearer <FIREFLIES_API_KEY>
Content-Type: application/json

{
  "query": "query Transcript($id: String!) { transcript(id: $id) { id title date meeting_attendees { email displayName } speakers { name } sentences { speaker_name text start_time end_time } } }",
  "variables": { "id": "<meetingId>" }
}
```

**Lead matching strategy:** Use `meeting_attendees[].email` to match against `leads.email` within `leads` scoped to the webhook's target coach. If email match fails, fall back to `meeting_attendees[].displayName` + `call_at` timestamp fuzzy match.

**Coach identification challenge:** Fireflies webhooks are workspace-level, not per-coach. The webhook payload does not include a coach identifier. Resolution: register the webhook with a `clientReferenceId` or use a per-coach webhook URL (`/api/webhooks/transcripts/fireflies?coachId=<uuid>`) and verify coachId against the database.

---

## Zoom Integration Details

[VERIFIED: developers.zoom.us/docs/api/webhooks/ + devforum.zoom.us evidence]

**Event to subscribe:** `recording.transcript_completed` (requires cloud recording + paid Zoom plan for the host).

**Signature verification:**
```
message = "v0:" + x-zm-request-timestamp + ":" + raw_body
computed = "v0=" + HMAC-SHA256(secret_token, message).hex()
compare with x-zm-signature header (timingSafeEqual)
```

**Transcript download (two-step):**
1. Receive webhook — payload contains `payload.object.recording_files[]` with `file_type: "TRANSCRIPT"` and a `download_url`.
2. Fetch the VTT file: `GET <download_url>` with `Authorization: Bearer <zoom_access_token>`.
3. Parse VTT format: strip WEBVTT header, extract cue text blocks.

**Per-coach OAuth:** Zoom transcripts require coach-specific OAuth (the recording is under the coach's Zoom account). Use the same Vault pattern as Gmail: store Zoom OAuth tokens in Supabase Vault, read via `get_zoom_tokens` RPC. Coach connects Zoom in Settings (Phase 2 integration point).

**Important:** `recording.transcript_completed` only fires if cloud recording is active AND "Audio transcript" is enabled in the host's Zoom account settings. The webhook will silently not fire for coaches who don't have this enabled — manual upload fallback (D-13) covers this gap.

---

## Gmail Thread View Details

[VERIFIED: developers.google.com/gmail/api/reference/rest/v1/users.threads/get]

**Method:** `gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' })`

**Response structure:**
```typescript
{
  id: string,
  messages: Array<{
    id: string,
    threadId: string,
    internalDate: string, // Unix ms timestamp as string
    payload: {
      headers: Array<{ name: string, value: string }>,  // From, To, Subject, Date
      body: { data?: string },  // base64url encoded; may be empty for multipart
      parts?: Array<{ mimeType: string, body: { data?: string } }>  // multipart
    }
  }>
}
```

**Decoding body:** `Buffer.from(bodyData, 'base64url').toString('utf8')`

**Multipart handling:** For `multipart/alternative` messages, the `payload.body.data` is empty — iterate `payload.parts` to find `text/plain` or `text/html` part.

**Linking thread to lead:** The `email_events` table already has `gmail_thread_id TEXT` — this is the join column to find the thread ID for a given lead.

**Rate limits:** Gmail API uses per-user quota (250 quota units per second per user). `threads.get` costs 5 quota units. At the scale of 5–10 coaches with occasional lead profile views, rate limits are not a concern. [ASSUMED — exact quota not verified from rate limit docs page]

---

## Supabase Realtime Pattern (Existing)

[VERIFIED: codebase `draft-realtime.tsx` + supabase.com/docs/guides/realtime/postgres-changes]

The existing `useDraftRealtime` hook in `draft-realtime.tsx` establishes the exact pattern to follow for any new table subscriptions. For Phase 2, no new Realtime subscriptions are needed — the `drafts` table is already subscribed. The `transcripts` table does NOT need Realtime; the unmatched queue is a page refresh or API poll pattern.

**Key constraint:** `filter: 'coach_id=eq.${coachId}'` requires the column to be indexed. The `transcripts` table has `coach_id` but may not have an index — verify in `20260505000003_indexes.sql` before relying on filtered subscriptions.

---

## token-counter.ts Strategy

[VERIFIED: Context7 /anthropics/anthropic-sdk-typescript countTokens]

`client.messages.countTokens()` is a real API call to `POST /v1/messages/count_tokens`. It returns `{ input_tokens: number }` synchronously once resolved. It does NOT count output tokens (those are unknown until generation).

The AI-SPEC recommends calling `countTokens()` before every draft generation call. The practical approach: call it on the fully assembled context — if input exceeds 8,000 tokens, apply the truncation hierarchy (defined in AI-SPEC.md Section 4) and call `countTokens()` again before proceeding.

Character-based estimation (3.5 chars/token) is used only for fast pre-assembly estimates to avoid unnecessary truncation iterations — the actual countTokens call is the gate before the real API call.

---

## Context Assembly Token Budget

[CITED: AI-SPEC.md Section 4 — Implementation Guidance]

| Layer | Max Tokens | Truncation Strategy |
|-------|-----------|---------------------|
| Voice model Layer 1 (structured profile) | ~400 | Never truncate |
| Voice model Layer 2 (10–15 examples) | ~1,500 | Drop weakest examples; keep minimum 8 |
| Lead description (ai_summary) | ~300 | Never truncate |
| State-specific instructions | ~200 | Never truncate |
| Transcript (most recent) | ~2,000 | First 300 + last 200 tokens if over |
| Conversation history | ~1,500 | Drop oldest; keep most recent 3 always |
| Coach notes | ~400 | Most recent note if over |
| Instruction + output budget | ~1,200 | Fixed |
| **Total target** | **~7,700** | — |

Truncation order: transcript body → prior messages → coach notes → Layer 2 examples (minimum 8).

---

## Common Pitfalls

### Pitfall 1: Webhook Handler Using Authenticated Supabase Client
**What goes wrong:** Route handlers that receive Fireflies/Zoom webhooks have no session cookie. Using `createClient()` (cookie-based) returns an unauthenticated client, silently failing all database writes.
**Why it happens:** Easy to copy the wrong Supabase client import.
**How to avoid:** Webhook handlers MUST use `adminClient` (service role) for writes. Never `createClient()` in a webhook handler.
**Warning signs:** Database inserts appear to succeed (no thrown error) but rows don't appear — RLS silently rejects anonymous inserts.

### Pitfall 2: ai_summary Column Migration Not Applied Before Draft Engine
**What goes wrong:** `generateDraft()` tries to read `leads.ai_summary` but the column doesn't exist — runtime error at the SELECT query.
**Why it happens:** The existing schema (confirmed) does not have `ai_summary`.
**How to avoid:** The migration adding `ai_summary TEXT` to `leads` must be in Wave 1 (before any AI engine work).
**Warning signs:** Supabase TypeScript types will be stale after migration until `pnpm db:gen-types` is re-run.

### Pitfall 3: Fireflies Webhook Has No Built-In Coach Identifier
**What goes wrong:** Multiple coaches use the system. A Fireflies webhook arrives but the handler doesn't know which coach's lead pool to match against.
**Why it happens:** Fireflies webhooks are workspace-scoped, not per-user.
**How to avoid:** Use a coach-scoped webhook URL path: `/api/webhooks/transcripts/fireflies?coachId=<uuid>` — or if Fireflies supports custom headers/clientReferenceId, embed the coach ID there at registration time. Each coach registers their own webhook URL in Fireflies settings.
**Warning signs:** Transcripts matched against wrong coach's lead pool, or all transcripts go to unmatched queue even when email matches.

### Pitfall 4: Zoom Transcripts Require Explicit Cloud Recording + Transcript Setting Enabled
**What goes wrong:** Coach registers Zoom webhook but never receives `recording.transcript_completed` events — no errors, just silence.
**Why it happens:** Zoom audio transcript generation is disabled by default and requires the host to be on a paid plan. Cloud recording (not local) must also be active.
**How to avoid:** Document in the Settings UI: "Zoom transcript webhooks require cloud recording and the Audio Transcript setting enabled in your Zoom account." Manual upload fallback (D-13) handles coaches who can't use the webhook.
**Warning signs:** Zero webhook events received after registering the subscription.

### Pitfall 5: Voice Profile Zod Parsing Fails Silently
**What goes wrong:** Claude returns a voice profile that passes the XML extraction but fails Zod validation (e.g., fewer than 3 tone_adjectives). If not handled, the error surfaces as a 500 to the coach during voice model setup.
**Why it happens:** LLM output is non-deterministic; schema constraints may not always be met.
**How to avoid:** Use `VoiceProfileSchema.safeParse()` — log validation errors, attempt one auto-retry with a clearer instruction, surface a user-friendly error if still failing.
**Warning signs:** `result.success === false` with Zod issues in server logs.

### Pitfall 6: DraftCard Confidence Indicator Already Renders Low Confidence
**What goes wrong:** DraftCard.tsx already reads `draft.confidence_level === 'low'` and shows a badge. If the AI engine does not set this column correctly when fewer than 8 examples exist, the badge never appears.
**Why it happens:** The column exists in the schema but is only set by the draft generation code — a disconnect between schema and logic.
**How to avoid:** In `generateDraft()`, count `voiceModel.selected_examples.length` before the API call — if `< 8`, write `confidence_level: 'low'` on the draft row.

### Pitfall 7: Gmail Thread Message Body Encoding
**What goes wrong:** Gmail API returns message body as base64url (not standard base64). Using `Buffer.from(data, 'base64')` (default) produces garbled text.
**Why it happens:** Gmail uses base64url alphabet (`-_` not `+/`).
**How to avoid:** Always use `Buffer.from(data, 'base64url').toString('utf8')`.
**Warning signs:** Garbled or empty email body text in the thread view.

---

## Code Examples

### Never-Say Scan (Guardrail)

```typescript
// packages/ai-engine/src/guardrails.ts
export function scanNeverSayList(draftText: string, neverSayList: string[]): string[] {
  return neverSayList.filter(phrase =>
    draftText.toLowerCase().includes(phrase.toLowerCase())
  );
}
// Returns matched phrases; empty array = pass
```

### Hard-Block Check

```typescript
// packages/ai-engine/src/guardrails.ts
const HARD_BLOCK_STATES: TLeadStatus[] = ['unsubscribed', 'do_not_contact', 'bounced'];

export function isHardBlocked(status: TLeadStatus): boolean {
  return HARD_BLOCK_STATES.includes(status);
}
```

### XML Prompt Structure

```typescript
// packages/ai-engine/src/prompts/draft.ts
// Source: AI-SPEC.md Section 4b [CITED]
export function buildDraftUserPrompt(params: DraftGenerationParams): string {
  return `
<lead_context>
State: ${params.leadStatus}
Name: ${params.leadName}
</lead_context>

<ai_lead_description>
${params.aiSummary ?? 'No AI description available yet.'}
</ai_lead_description>

<transcript>
${params.transcript ?? 'No call transcript available.'}
</transcript>

<conversation_history>
${params.conversationHistory ?? 'No prior messages.'}
</conversation_history>

<instruction>
Generate a ${params.leadStatus} message for this lead. Write only the email body. No subject line. No preamble. Write exactly as the coach would.
</instruction>`.trim();
}
```

### Fireflies GraphQL Transcript Fetch

```typescript
// Source: docs.fireflies.ai/graphql-api/query/transcript [VERIFIED]
async function fetchFirefliesTranscript(meetingId: string, apiKey: string) {
  const res = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `query T($id: String!) {
        transcript(id: $id) {
          id title date
          meeting_attendees { email displayName }
          sentences { speaker_name text start_time end_time }
        }
      }`,
      variables: { id: meetingId },
    }),
  });
  const { data } = await res.json() as { data: { transcript: FirefliesTranscript } };
  return data.transcript;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LangChain for all AI apps | Direct SDK for parametric calls | 2024 | Simpler code, lower latency, easier debugging |
| Webhook secret stored in env as plain string | Webhook secret in Supabase Vault | Phase 1 | `integrations.webhook_secret_vault_id` already scaffolded |
| Character-based token estimation | `countTokens()` API call | Mid-2024 (Anthropic added endpoint) | Exact counts; no estimation error |

**Deprecated/outdated:**
- `anthropic.completions.create` (legacy text completions): Use `anthropic.messages.create` — this is the current API. Completions API is for older claude-instant models.
- Temperature as a top-level parameter: Not available in the standard messages API. Voice variation is achieved through prompt variation.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | YES | v22.18.0 | — |
| pnpm | Package manager | YES | 9.15.4 | — |
| `crypto` (Node built-in) | HMAC webhook verification | YES | Node 22 built-in | — |
| Anthropic API key | AI engine | Needs env var | — | No fallback — required |
| Fireflies API key | Transcript fetch | Needs env var | — | Manual upload fallback |
| Zoom OAuth credentials | Zoom webhook | Needs env var + coach OAuth | — | Manual upload fallback |
| Langfuse API keys | Production tracing | Needs env var | — | Logging-only fallback (skip trace) |

**Missing dependencies with no fallback:**
- `ANTHROPIC_API_KEY` — required for all AI calls in Phase 2. Must be set before any AI engine plan executes.

**Missing dependencies with fallback:**
- Fireflies API key — manual transcript upload (D-13) is the fallback.
- Zoom credentials — manual transcript upload (D-13) is the fallback.
- Langfuse keys — AI calls still work; tracing is observability-only.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (`vitest` — already configured) |
| Config file | `apps/web/vitest.config.ts` |
| Quick run command | `pnpm --filter apps/web test run tests/unit/` |
| Full suite command | `pnpm --filter apps/web test run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-002 | AI engine import throws in browser context | unit | `pnpm --filter apps/web test run tests/unit/ai-engine-guard.test.ts` | ❌ Wave 0 |
| AI-004 | `countTokens()` called before generation; truncation applied if over budget | unit | `pnpm --filter apps/web test run tests/unit/token-counter.test.ts` | ❌ Wave 0 |
| AI-007 | `confidence_level: 'low'` set on draft when `selected_examples.length < 8` | unit | `pnpm --filter apps/web test run tests/unit/confidence-indicator.test.ts` | ❌ Wave 0 |
| VOICE-001 | VoiceProfileSchema validates all required fields; rejects missing fields | unit | `pnpm --filter apps/web test run tests/unit/voice-profile-schema.test.ts` | ❌ Wave 0 |
| TRANS-007 | Fireflies HMAC verification rejects tampered payload | unit | `pnpm --filter apps/web test run tests/unit/webhook-verification.test.ts` | ❌ Wave 0 |
| TRANS-007 | Zoom signature verification rejects invalid x-zm-signature | unit | `pnpm --filter apps/web test run tests/unit/webhook-verification.test.ts` | ❌ Wave 0 |
| AI-016 (guardrail) | `isHardBlocked` returns true for unsubscribed/do_not_contact/bounced | unit | `pnpm --filter apps/web test run tests/unit/ai-guardrails.test.ts` | ❌ Wave 0 |
| D-17/migration | `leads.ai_summary` column exists in type-generated types | unit | `pnpm --filter apps/web test run tests/unit/state-machine.test.ts` (extend) | Partial |

### Sampling Rate

- **Per task commit:** `pnpm --filter apps/web test run tests/unit/`
- **Per wave merge:** `pnpm --filter apps/web test run`
- **Phase gate:** Full suite green + `pnpm type-check` clean before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/web/tests/unit/ai-engine-guard.test.ts` — server-only guard throws in window context
- [ ] `apps/web/tests/unit/token-counter.test.ts` — budget calculation and truncation logic
- [ ] `apps/web/tests/unit/confidence-indicator.test.ts` — example count threshold behavior
- [ ] `apps/web/tests/unit/voice-profile-schema.test.ts` — Zod schema validation for all edge cases
- [ ] `apps/web/tests/unit/webhook-verification.test.ts` — Fireflies + Zoom HMAC verification (both pass + tampered cases)
- [ ] `apps/web/tests/unit/ai-guardrails.test.ts` — hard-block states, never-say scan, coach_id scope assertion
- [ ] Supabase type regeneration after `ai_summary` migration: `pnpm db:gen-types`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Webhook auth uses HMAC, not session auth |
| V3 Session Management | No | Webhook handlers are stateless |
| V4 Access Control | Yes | `coach_id` assertion in `guardrails.ts` before AI call; adminClient only in webhook handlers |
| V5 Input Validation | Yes | Zod on all API boundaries; XML delimiters wrap lead-supplied content |
| V6 Cryptography | Yes | `timingSafeEqual` for HMAC comparison — never `===` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged webhook (fake Fireflies/Zoom POST) | Spoofing | HMAC-SHA256 signature verification with `timingSafeEqual` |
| Cross-coach voice model access | Information Disclosure | `assertCoachIdScope()` in `guardrails.ts` + RLS on all reads |
| AI prompt injection via transcript | Tampering | XML delimiters isolate lead content; system prompt instructs Claude to only use provided facts |
| ANTHROPIC_API_KEY exposed in client bundle | Information Disclosure | `import 'server-only'` guard in `packages/ai-engine`; NEXT_PUBLIC_ prefix never used |
| PII in Langfuse traces | Information Disclosure | Never pass lead email/name in Langfuse metadata — use lead_id (UUID) only |
| Lead description fabrication | Information Disclosure / Integrity | System prompt: "only reference facts explicitly present in the context below" |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Gmail API `threads.get` rate limit is not a concern at 5–10 coaches | Gmail Thread View Details | If coaches have large volumes of lead profiles loaded simultaneously, rate limit could trigger; add caching if it appears |
| A2 | Fireflies registers one webhook per workspace, not per user | Fireflies Integration Details | If Fireflies does support per-user webhooks, the coach identification problem is simpler — no need for coachId in URL |
| A3 | Zoom `recording.transcript_completed` is the correct event name (vs. `recording.completed` with file_type TRANSCRIPT) | Zoom Integration Details | If the correct event is actually `recording.completed`, the handler logic differs slightly; both can be handled in the same route |

---

## Open Questions

1. **Fireflies API key scoping**
   - What we know: Fireflies uses a workspace API key (Bearer token) for GraphQL queries
   - What's unclear: Is the API key per coach account or is it a single Daniel-level workspace key?
   - Recommendation: Treat as per-coach (each coach registers their own Fireflies account and provides their API key in Settings). Store in Supabase Vault alongside Gmail tokens.

2. **Zoom OAuth vs Zoom Server-to-Server OAuth**
   - What we know: Zoom transcripts require coach OAuth for `download_url` authenticated access
   - What's unclear: Whether the current `integrations` table + Vault pattern needs a `zoom` provider entry in the `integration_provider` enum (it currently does NOT — enum has: gmail, calendly, cal_com, acuity, setmore, square, ms_bookings, tidycal, slack, twilio, instagram)
   - Recommendation: Add `zoom` to the `integration_provider` enum in a Phase 2 migration (alongside the `ai_summary` migration).

3. **Unmatched transcript queue: HTTP poll vs Realtime?**
   - What we know: The `transcripts` table is not in the Realtime publication
   - What's unclear: Whether the unmatched queue needs live updates or if a page refresh is acceptable
   - Recommendation: Add `transcripts` to the Realtime publication in the Phase 2 migration, so unmatched counts update live. The existing publication syntax (`ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;`) is a 1-line migration.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/anthropics/anthropic-sdk-typescript` — `messages.create`, `countTokens`, error types, retry behavior
- `supabase/migrations/20260505000002_tables.sql` — deployed schema; exact columns on `leads`, `drafts`, `coaches`, `transcripts`
- `supabase/migrations/20260505000001_enums.sql` — all enum values
- `supabase/migrations/20260505000004_rls.sql` — RLS policy structure
- `supabase/migrations/20260505000006_realtime.sql` — published tables
- `packages/ai-engine/src/index.ts` — scaffolded server-only guard
- `apps/web/components/drafts/draft-realtime.tsx` — existing Realtime subscription pattern
- `apps/web/lib/gmail/client.ts` — `getGmailClientForCoach` pattern
- `.planning/phases/02-intelligence/02-AI-SPEC.md` — framework selection, prompt structure, context budget, eval strategy
- `.planning/phases/02-intelligence/02-CONTEXT.md` — all locked decisions D-01 through D-25
- `npm view @anthropic-ai/sdk version` → `0.97.0` (published 2026-05-19)

### Secondary (MEDIUM confidence)
- [docs.fireflies.ai/graphql-api/webhooks](https://docs.fireflies.ai/graphql-api/webhooks) — webhook payload shape, `x-hub-signature` HMAC
- [docs.fireflies.ai/graphql-api/query/transcript](https://docs.fireflies.ai/graphql-api/query/transcript) — transcript query schema, `meeting_attendees`, `sentences`
- [developers.zoom.us/docs/api/webhooks/](https://developers.zoom.us/docs/api/webhooks/) — `x-zm-signature` verification algorithm
- [developers.google.com/gmail/api/reference/rest/v1/users.threads/get](https://developers.google.com/gmail/api/reference/rest/v1/users.threads/get) — `format: 'full'` response structure
- [supabase.com/docs/guides/realtime/postgres-changes](https://supabase.com/docs/guides/realtime/postgres-changes) — filter syntax, DELETE limitation

### Tertiary (LOW confidence)
- Gmail API rate limits (250 quota units/sec per user at 5 quota units per `threads.get`) — [ASSUMED] from general knowledge; not verified from quota page

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from npm registry; SDK verified via Context7
- Schema: HIGH — read directly from migration files
- Architecture: HIGH — patterns traced through existing codebase files
- Webhook payloads: MEDIUM — official docs verified but Zoom transcript payload exact structure has one ambiguity (event name)
- Pitfalls: HIGH — derived from code review + verified webhook documentation

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (30 days — Anthropic SDK releases frequently; re-verify SDK version at implementation time)
