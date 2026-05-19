# Phase 2: Intelligence - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 22 new/modified files
**Analogs found:** 20 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/ai-engine/src/index.ts` (fill) | service | request-response | `packages/ai-engine/src/index.ts` (scaffold) | exact |
| `packages/ai-engine/src/client.ts` | utility | request-response | `apps/web/lib/supabase/admin.ts` | role-match (singleton client init) |
| `packages/ai-engine/src/types.ts` | utility | — | `packages/shared/src/types/index.ts` | role-match |
| `packages/ai-engine/src/prompts/system.ts` | utility | transform | `packages/shared/src/lib/state-machine.ts` | partial (pure function module) |
| `packages/ai-engine/src/prompts/draft.ts` | utility | transform | `packages/shared/src/lib/state-machine.ts` | partial |
| `packages/ai-engine/src/prompts/voice-analysis.ts` | utility | transform | `packages/shared/src/lib/state-machine.ts` | partial |
| `packages/ai-engine/src/prompts/lead-description.ts` | utility | transform | `packages/shared/src/lib/state-machine.ts` | partial |
| `packages/ai-engine/src/context-assembler.ts` | service | transform | `packages/shared/src/lib/state-machine.ts` | partial |
| `packages/ai-engine/src/token-counter.ts` | utility | request-response | `apps/web/lib/gmail/client.ts` | partial (wraps API call) |
| `packages/ai-engine/src/guardrails.ts` | utility | — | `packages/shared/src/lib/state-machine.ts` | role-match |
| `apps/web/app/api/voice/analyze/route.ts` | route | request-response | `apps/web/app/api/leads/route.ts` | exact |
| `apps/web/app/api/drafts/generate/route.ts` | route | request-response | `apps/web/app/api/leads/route.ts` | exact |
| `apps/web/app/api/drafts/[id]/regenerate/route.ts` | route | request-response | `apps/web/app/api/leads/[id]/route.ts` | exact |
| `apps/web/app/api/leads/[id]/thread/route.ts` | route | request-response | `apps/web/app/api/leads/[id]/route.ts` | exact |
| `apps/web/app/api/webhooks/transcripts/fireflies/route.ts` | route | event-driven | `apps/web/app/api/webhooks/instagram/route.ts` | role-match |
| `apps/web/app/api/webhooks/transcripts/zoom/route.ts` | route | event-driven | `apps/web/app/api/webhooks/instagram/route.ts` | role-match |
| `apps/web/app/(dashboard)/settings/voice/` page | component | CRUD | `apps/web/app/(dashboard)/settings/page.tsx` | exact |
| `apps/web/app/(dashboard)/leads/[id]/components/LeadAISummaryCard.tsx` | component | CRUD | `apps/web/app/(dashboard)/leads/[id]/lead-profile-header.tsx` | exact |
| `apps/web/app/(dashboard)/leads/[id]/components/EmailThreadView.tsx` | component | request-response | `apps/web/app/(dashboard)/leads/[id]/activity-timeline.tsx` | role-match |
| `apps/web/app/(dashboard)/leads/[id]/components/ManualTranscriptUpload.tsx` | component | CRUD | `apps/web/app/(dashboard)/leads/[id]/coach-notes-field.tsx` | exact |
| `apps/web/components/drafts/UnmatchedTranscriptQueue.tsx` | component | CRUD | `apps/web/components/drafts/DraftQueueScaffold.tsx` | exact |
| `apps/web/components/drafts/DraftCard.tsx` (extend) | component | CRUD | `apps/web/components/drafts/DraftCard.tsx` | exact (modify) |
| `supabase/migrations/20260519000001_phase2_ai.sql` | migration | — | `supabase/migrations/20260505000006_realtime.sql` | exact |

---

## Pattern Assignments

### `packages/ai-engine/src/index.ts` (service, request-response)

**Analog:** `packages/ai-engine/src/index.ts` (scaffold) + `apps/web/app/api/leads/route.ts` (pattern)

**Existing server-only guard** (lines 1–10 of scaffold — preserve exactly):
```typescript
// INFRA-008: Server-only package. Hard-fail if imported in browser context.
if (typeof window !== "undefined") {
  throw new Error(
    "@client/ai-engine must not be imported in client-side code. " +
    "This package wraps Anthropic API calls (server-side only)."
  );
}
```

**Core pattern to implement** (from RESEARCH.md Pattern 1):
```typescript
import 'server-only';
import { anthropic } from './client';
import { isHardBlocked } from './guardrails';
import { assembleContext } from './context-assembler';
import type { DraftGenerationParams, VoiceAnalysisParams } from './types';

export async function generateDraft(params: DraftGenerationParams): Promise<string | null> {
  // 1. Hard-block check BEFORE any API call
  if (isHardBlocked(params.leadStatus)) return null;

  // 2. Assemble + count tokens (assembleContext trims internally if over budget)
  const context = await assembleContext(params);
  const tokenCheck = await anthropic.messages.countTokens({
    model: 'claude-sonnet-4-6',
    system: context.systemPrompt,
    messages: [{ role: 'user', content: context.userPrompt }],
  });
  // Log truncation metadata to generation_context column

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

---

### `packages/ai-engine/src/client.ts` (utility, singleton)

**Analog:** `apps/web/lib/supabase/admin.ts` (lines 1–9)

**Singleton init pattern** — copy this structure exactly:
```typescript
// SERVER-SIDE ONLY. Importing this in a "use client" component
// will leak the service role key to the browser bundle.
import { createClient } from "@supabase/supabase-js";

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // NO NEXT_PUBLIC_ prefix — enforced by CI
);
```

**Adapted for Anthropic** (from RESEARCH.md Pattern 1):
```typescript
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// Single instance — module-level singleton (same pattern as adminClient)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,  // NO NEXT_PUBLIC_ prefix — never
  maxRetries: 3, // auto-retries 429, 500, 502, 503 with exponential backoff
});
```

---

### `packages/ai-engine/src/types.ts` (utility)

**Analog:** `packages/shared/src/types/index.ts` (lines 1–22)

**Type file pattern** — database-derived types + local inference types together:
```typescript
import type { Database } from "@client/database";

// Re-export DB types needed in ai-engine
export type TDraft = Database["public"]["Tables"]["drafts"]["Row"];
export type TLeadStatus = Database["public"]["Enums"]["lead_status"];

// Local parameter types (not in DB schema)
export interface DraftGenerationParams {
  coachId: string;
  leadId: string;
  leadStatus: TLeadStatus;
  leadName: string;
  // ... all fields
}
```

**Key constraint:** No `any`. Import `TLeadStatus` from `@client/shared/types`, not re-declare it.

---

### `packages/ai-engine/src/guardrails.ts` (utility)

**Analog:** `packages/shared/src/lib/state-machine.ts` (lines 1–18)

**Pure function module pattern** — small, typed constants + exported functions, no class:
```typescript
import type { TLeadStatus } from "../types";  // state-machine.ts uses this exact import

export const TERMINAL_STATES: readonly TLeadStatus[] = [
  "converted", "closed", "unsubscribed", "do_not_contact", "bounced",
] as const;

export function isTerminalState(s: TLeadStatus): boolean {
  return (TERMINAL_STATES as readonly string[]).includes(s);
}
```

**Adapted for guardrails** (from RESEARCH.md Code Examples):
```typescript
import type { TLeadStatus } from '@client/shared/types';

const HARD_BLOCK_STATES: readonly TLeadStatus[] = [
  'unsubscribed', 'do_not_contact', 'bounced',
] as const;

export function isHardBlocked(status: TLeadStatus): boolean {
  return (HARD_BLOCK_STATES as readonly string[]).includes(status);
}

export function scanNeverSayList(draftText: string, neverSayList: string[]): string[] {
  return neverSayList.filter(phrase =>
    draftText.toLowerCase().includes(phrase.toLowerCase())
  );
}

export function assertCoachIdScope(paramCoachId: string, contextCoachId: string): void {
  if (paramCoachId !== contextCoachId) {
    throw new Error(`Coach ID mismatch: param=${paramCoachId} context=${contextCoachId}`);
  }
}
```

---

### `packages/ai-engine/src/prompts/draft.ts`, `system.ts`, `voice-analysis.ts`, `lead-description.ts` (utility, transform)

**Analog:** `packages/shared/src/lib/state-machine.ts` (pure function module pattern)

**Module structure pattern** — one exported builder function per file, no default exports:
```typescript
// state-machine.ts pattern: named exports only, typed params
import type { TLeadStatus } from "../types";

export function isTerminalState(s: TLeadStatus): boolean { ... }
export function blocksOutboundEmail(s: TLeadStatus, doNotContact: boolean): boolean { ... }
```

**XML delimiter prompt pattern** (from RESEARCH.md Pattern/Code Examples):
```typescript
// prompts/draft.ts
import type { DraftGenerationParams } from '../types';

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

**Note:** All 4 prompt files follow the same pattern — named export, typed params, string return.

---

### `apps/web/app/api/voice/analyze/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/leads/route.ts` (lines 1–53)

**POST route pattern** — auth check, rate limit optional, Zod parse, service call:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateLeadSchema } from "@client/shared/validators";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = CreateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }
  // ... service call ...
  return NextResponse.json(result, { status: 201 });
}
```

**Key additions for voice/analyze:**
- Uses `createClient()` (cookie-based, user-scoped) NOT `adminClient` — coach-authenticated call
- Calls `analyzeVoiceCorpus()` from `@client/ai-engine`
- Writes result to `coaches.voice_model` via `supabase.from("coaches").update()`
- Return fire-and-forget with `{ status: 'analyzing' }` if analysis takes >2s (Anthropic calls take 4–8s)

---

### `apps/web/app/api/drafts/generate/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/leads/route.ts` (lines 1–53) + fire-and-forget pattern

**Fire-and-forget pattern** (from RESEARCH.md Pattern 6):
```typescript
// From RESEARCH.md — do NOT block the route handler waiting for AI generation
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

**Auth pattern to copy from** `apps/web/app/api/leads/route.ts` lines 6–9:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

---

### `apps/web/app/api/drafts/[id]/regenerate/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/leads/[id]/route.ts` (lines 16–68, PATCH handler)

**Dynamic route + PATCH pattern** (lines 16–22):
```typescript
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership before regenerating
  const { data: existing } = await supabase.from("drafts").select("coach_id, lead_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.coach_id !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  // ... fire-and-forget regen ...
}
```

**Note:** Use POST not PATCH per RESEARCH.md (`POST /api/drafts/[id]/regenerate`).

---

### `apps/web/app/api/leads/[id]/thread/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/leads/[id]/route.ts` (lines 4–13, GET handler)

**GET + dynamic params pattern** (lines 4–13):
```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}
```

**Gmail client pattern to add** from `apps/web/lib/gmail/client.ts` lines 1–10:
```typescript
import 'server-only';
import { getGmailClientForCoach } from '@/lib/gmail/client';

// After auth + lead fetch:
const gmail = await getGmailClientForCoach(coachId);
const thread = await gmail.users.threads.get({
  userId: 'me',
  id: threadId,  // from email_events.gmail_thread_id where lead_id = id
  format: 'full',
});
// Decode: Buffer.from(bodyData, 'base64url').toString('utf8')
```

---

### `apps/web/app/api/webhooks/transcripts/fireflies/route.ts` (route, event-driven)

**Analog:** `apps/web/app/api/webhooks/instagram/route.ts` (lines 1–20) + `apps/web/app/api/auth/gmail/callback/route.ts` (adminClient pattern)

**Webhook route skeleton** from instagram/route.ts:
```typescript
export async function POST(_request: Request) {
  // Scaffold only — return 200 to satisfy Meta webhook ping
  return new Response("OK", { status: 200 });
}
```

**CRITICAL differences from auth routes:**
1. No `createClient()` (no session cookie in webhook POST). Use `adminClient` for ALL writes.
2. `adminClient` import from `apps/web/lib/supabase/admin.ts` lines 1–9.
3. Verify signature BEFORE any database operation.

**Signature verification pattern** (from RESEARCH.md Pattern 2):
```typescript
import { createHmac, timingSafeEqual } from 'crypto';
import { adminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature');
  if (!signature) return new Response('Missing signature', { status: 401 });

  const secret = process.env.FIREFLIES_WEBHOOK_SECRET!;
  const computed = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!timingSafeEqual(Buffer.from(computed), Buffer.from(signature))) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { meetingId: string; eventType: string; };
  // ... fetch transcript from Fireflies GraphQL, match lead, write to transcripts table via adminClient
  return new Response('OK', { status: 200 });
}
```

---

### `apps/web/app/api/webhooks/transcripts/zoom/route.ts` (route, event-driven)

**Analog:** Same as Fireflies — `apps/web/app/api/webhooks/instagram/route.ts` + adminClient

**Zoom-specific signature pattern** (from RESEARCH.md Pattern 3):
```typescript
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
  // ... fetch VTT file with Bearer token, parse, match lead, write via adminClient
}
```

---

### `apps/web/app/(dashboard)/settings/voice/` page (component, CRUD)

**Analog:** `apps/web/app/(dashboard)/settings/page.tsx` (lines 1–78)

**Settings page pattern** — server component, reads current state from Supabase, renders sections:
```typescript
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: integrations } = await supabase.from("integrations").select("*").eq("coach_id", user!.id);

  return (
    <section className="space-y-6 max-w-2xl">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Settings</h1>
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
        {/* section content */}
      </div>
    </section>
  );
}
```

**Card class** to copy exactly: `"rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"`

**For Settings → My Voice:** Page is a server component; interactive corpus import sections (chip editing, file upload, re-analyze trigger) live in `"use client"` child components. Pattern: server component loads `coaches.voice_model`, passes to client component as prop.

---

### `apps/web/app/(dashboard)/leads/[id]/components/LeadAISummaryCard.tsx` (component, CRUD)

**Analog:** `apps/web/app/(dashboard)/leads/[id]/lead-profile-header.tsx` (lines 1–35)

**Lead profile card pattern** — server component, typed from `TLead`, glassmorphism card:
```typescript
import type { TLead } from "@client/shared/types";

export function LeadProfileHeader({ lead }: { lead: TLead }) {
  return (
    <header className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {/* content */}
    </header>
  );
}
```

**For LeadAISummaryCard:** Receives `lead.ai_summary` (new column) and `lead.ai_summary_protected` (new column). Renders as a pinned card. Inline edit triggers PATCH `/api/leads/[id]` with `{ ai_summary, ai_summary_protected: true }`. Needs `"use client"` for the edit interaction — split into a server shell + client `AISummaryEditor` child component.

---

### `apps/web/app/(dashboard)/leads/[id]/components/EmailThreadView.tsx` (component, request-response)

**Analog:** `apps/web/app/(dashboard)/leads/[id]/activity-timeline.tsx` (lines 1–56)

**List display pattern** — typed rows, empty state, map to `<li>` items:
```typescript
import type { Database } from "@client/database";
type Event = Database["public"]["Tables"]["lead_events"]["Row"];

export function ActivityTimeline({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-medium">No activity yet</p>
      </div>
    );
  }
  return (
    <ol className="space-y-4">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 items-start">
          {/* ... */}
        </li>
      ))}
    </ol>
  );
}
```

**For EmailThreadView:** Each email is a collapsible `<article>`. Most recent expanded by default (`defaultOpen={index === messages.length - 1}`). Body decoded via `Buffer.from(data, 'base64url').toString('utf8')`. Needs `"use client"` for collapse state.

---

### `apps/web/app/(dashboard)/leads/[id]/components/ManualTranscriptUpload.tsx` (component, CRUD)

**Analog:** `apps/web/app/(dashboard)/leads/[id]/coach-notes-field.tsx` (lines 1–62)

**Client input + save pattern** — `"use client"`, `useState`, debounced or explicit save, fetch PATCH, toast feedback:
```typescript
"use client";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function CoachNotesField({ leadId, initialNotes }) {
  const [value, setValue] = useState(initialNotes);

  function save(v: string) {
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coach_notes: v }),
    }).then((r) => {
      if (r.ok) setSavedAt(new Date());
      else toast.error("Notes couldn't be saved. Your changes are still here — try again.");
    });
  }
  // ...
}
```

**Glassmorphism card wrapper** (lines 40–41):
```typescript
<section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
```

**For ManualTranscriptUpload:** Explicit "Save transcript" button (not debounce-autosave). POST to `/api/transcripts` with `{ leadId, content, provider: 'manual', matched_by: 'manual' }`. Success triggers draft generation (backend handles this). `<Textarea>` + optional `<input type="file">` for `.txt` upload.

---

### `apps/web/components/drafts/UnmatchedTranscriptQueue.tsx` (component, CRUD)

**Analog:** `apps/web/components/drafts/DraftQueueScaffold.tsx` (lines 1–53)

**Queue scaffold pattern** — `"use client"`, local state, empty state, iterate items:
```typescript
"use client";
import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { Database } from "@client/database";

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

export function DraftQueueScaffold({ coachId, initialDrafts }) {
  const [drafts, setDrafts] = useState<DraftRow[]>(initialDrafts);
  // ...
  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-16 text-center">
        <h2 className="text-xl font-semibold mb-2">No drafts waiting</h2>
        {/* empty state */}
      </div>
    );
  }
  // ...
}
```

**For UnmatchedTranscriptQueue:** Uses `transcripts` table rows instead of `drafts`. Each row shows: call date, duration, 200-char preview, searchable lead picker, one-click assign button. No `useDraftRealtime` — HTTP poll or manual refresh is acceptable per RESEARCH.md (transcripts table not in Realtime publication yet). The migration adds it; if added, can adopt the Realtime pattern from `draft-realtime.tsx`.

---

### `apps/web/components/drafts/DraftCard.tsx` — regen button + confidence indicator extensions

**Analog:** `apps/web/components/drafts/DraftCard.tsx` (lines 1–155, existing file)

**Existing confidence indicator** (lines 104–107) — already implemented:
```typescript
{draft.confidence_level === "low" && (
  <span className="inline-block mt-2 text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
    Low voice confidence
  </span>
)}
```

**Existing action pattern** (lines 33–45) — copy for regen button:
```typescript
async function setStatus(status: "approved" | "held", body?: string) {
  const r = await fetch(`/api/drafts/${draft.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status, ...(body ? { body } : {}) }),
  });
  if (!r.ok) {
    toast.error("This action didn't go through. Refresh and try again.");
    return;
  }
  toast.success(status === "approved" ? "Approved" : "Held");
  onAdvance();
}
```

**Regen button addition** — add to footer alongside Approve/Skip/Hold:
```typescript
async function regenerate() {
  const r = await fetch(`/api/drafts/${draft.id}/regenerate`, { method: "POST" });
  if (!r.ok) { toast.error("Regeneration failed. Try again."); return; }
  toast.success("Regenerating draft…");
  // Draft status updates via Realtime subscription — no local state change needed
}
```

**Icon import pattern** (lines 5–10) — add `ArrowsClockwise` from `@phosphor-icons/react`.

---

### `supabase/migrations/20260519000001_phase2_ai.sql` (migration)

**Analog:** `supabase/migrations/20260505000006_realtime.sql` (lines 1–4) + `supabase/migrations/20260505000001_enums.sql` for enum ALTER

**Migration file pattern** — header comment, pure SQL, no transactions needed:
```sql
-- DRAFT-012: Realtime subscription for draft approval queue (filtered by coach_id via RLS)
ALTER PUBLICATION supabase_realtime ADD TABLE public.drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
```

**Phase 2 migration content:**
```sql
-- Phase 2: AI lead description columns on leads table (D-17, D-22)
ALTER TABLE leads ADD COLUMN ai_summary TEXT;
ALTER TABLE leads ADD COLUMN ai_summary_protected BOOLEAN NOT NULL DEFAULT false;
-- ai_summary_protected: true = coach has manually annotated; AI overwrites blocked

-- Phase 2: Add zoom provider to integration_provider enum (RESEARCH.md Open Question 2)
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'zoom';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'fireflies';

-- Phase 2: Add transcripts to Realtime publication for live unmatched queue (RESEARCH.md Open Question 3)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;
```

**Note:** `ALTER TYPE ... ADD VALUE IF NOT EXISTS` requires PostgreSQL 9.6+ (Supabase runs Postgres 15+). The `IF NOT EXISTS` guard prevents failure on re-run. RLS on `leads` covers new columns automatically (existing policy `coaches_own_leads` scoped to `coach_id = auth.uid()`).

---

### Unit test files (Wave 0 gap tests)

**Analog:** `apps/web/tests/unit/validators.test.ts` (lines 1–113) + `apps/web/tests/unit/state-machine.test.ts`

**Test file structure pattern** (lines 1–5):
```typescript
import { describe, it, expect } from "vitest";
import type { TLeadStatus } from "@client/shared/types";

describe("REQ-ID: description", () => {
  it("expected behavior description", () => {
    expect(...).toBe(...);
  });
});
```

**Type assertion pattern** for schema completeness tests (state-machine.test.ts lines 5–6):
```typescript
function assertExhaustive<T extends string>(values: T[]): T[] { return values; }
```

**Test files to create in `apps/web/tests/unit/`:**
- `ai-engine-guard.test.ts` — tests that `typeof window !== 'undefined'` throws in browser context
- `token-counter.test.ts` — budget calculation and truncation logic (mock `anthropic.messages.countTokens`)
- `confidence-indicator.test.ts` — `selected_examples.length < 8` sets `confidence_level: 'low'`
- `voice-profile-schema.test.ts` — `VoiceProfileSchema.safeParse()` edge cases
- `webhook-verification.test.ts` — Fireflies + Zoom HMAC (pass + tampered payload cases)
- `ai-guardrails.test.ts` — `isHardBlocked`, `scanNeverSayList`, `assertCoachIdScope`

---

## Shared Patterns

### Authentication (coach-scoped routes)
**Source:** `apps/web/app/api/leads/route.ts` lines 6–9
**Apply to:** `voice/analyze`, `drafts/generate`, `drafts/[id]/regenerate`, `leads/[id]/thread`
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Admin client (webhook routes — no session cookie)
**Source:** `apps/web/lib/supabase/admin.ts` lines 1–9
**Apply to:** `webhooks/transcripts/fireflies`, `webhooks/transcripts/zoom`
```typescript
import { adminClient } from "@/lib/supabase/admin";
// Use adminClient for ALL database writes in webhook handlers
// Never createClient() — webhook POSTs have no session cookie
```

### Zod validation on API boundaries
**Source:** `apps/web/app/api/leads/route.ts` lines 14–19 + `packages/shared/src/validators/lead.ts`
**Apply to:** All POST/PATCH route handlers
```typescript
const body = await request.json().catch(() => null);
const parsed = SomeSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
}
```

### Glassmorphism card
**Source:** `apps/web/app/(dashboard)/leads/[id]/coach-notes-field.tsx` line 40 / `apps/web/components/drafts/DraftCard.tsx` line 93
**Apply to:** All new `LeadAISummaryCard`, `EmailThreadView`, `ManualTranscriptUpload`, `UnmatchedTranscriptQueue`, Settings → My Voice sections
```typescript
className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
// Alternate form (settings page): "rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
```

### Toast error pattern
**Source:** `apps/web/components/drafts/DraftCard.tsx` lines 38–44 / `apps/web/app/(dashboard)/leads/[id]/coach-notes-field.tsx` lines 25–29
**Apply to:** All client components with async mutations
```typescript
import { toast } from "sonner";
// on error:
toast.error("This action didn't go through. Refresh and try again.");
// on success:
toast.success("Saved");
```

### Server-only guard
**Source:** `packages/ai-engine/src/index.ts` lines 1–7 (scaffold) + `apps/web/lib/supabase/admin.ts` comment
**Apply to:** `packages/ai-engine/src/client.ts`, `packages/ai-engine/src/index.ts`, `apps/web/app/api/leads/[id]/thread/route.ts`
```typescript
import 'server-only'; // Next.js hard-fail if imported in client bundle
// OR the existing window check pattern in packages/ai-engine/src/index.ts
```

### Dynamic route params (Next.js 15 async params)
**Source:** `apps/web/app/api/leads/[id]/route.ts` lines 4–5
**Apply to:** `drafts/[id]/regenerate/route.ts`, `leads/[id]/thread/route.ts`
```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // MUST await — Next.js 15 makes params a Promise
```

### Error handling in route handlers
**Source:** `apps/web/app/api/admin/coaches/route.ts` lines 45–51
**Apply to:** All routes that call external services (ai-engine, Gmail API, webhook fetch)
```typescript
try {
  const result = await externalService(parsed.data);
  return NextResponse.json(result);
} catch (e) {
  const msg = e instanceof Error ? e.message : "Operation failed";
  return NextResponse.json({ error: msg }, { status: 500 });
}
```

### Realtime subscription (for any new live-update needs)
**Source:** `apps/web/components/drafts/draft-realtime.tsx` lines 1–54
**Apply to:** If unmatched transcript queue needs live updates (after migration adds transcripts to publication)
```typescript
const channel = supabase
  .channel("coach-drafts")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "drafts",
    filter: `coach_id=eq.${coachId}`,
  }, (payload) => { ... })
  .subscribe();
return () => { supabase.removeChannel(channel); };
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/ai-engine/src/context-assembler.ts` | service | transform | No context assembly logic exists yet; build from RESEARCH.md token budget table (Section: Context Assembly Token Budget) |

**Guidance for context-assembler.ts:** The truncation order is transcript body → prior messages → coach notes → Layer 2 examples (minimum 8 kept). Use character-based estimation (3.5 chars/token) for fast pre-assembly sizing, then `anthropic.messages.countTokens()` as the gate before actual API call. Return both `systemPrompt` and `userPrompt` strings plus a `truncationLog` for `generation_context` column.

---

## Metadata

**Analog search scope:** `apps/web/app/api/`, `apps/web/app/(dashboard)/`, `apps/web/components/drafts/`, `apps/web/lib/`, `packages/ai-engine/src/`, `packages/shared/src/`, `supabase/migrations/`
**Files scanned:** 41 source files + 6 migration files
**Pattern extraction date:** 2026-05-19
