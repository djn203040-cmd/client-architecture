# Phase 2: Intelligence - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the full intelligence layer: voice model builder (AI-analyzed import flow + coach review), transcript ingestion (Fireflies + Zoom webhooks + manual upload), AI draft engine with stage-aware generation and lead-level AI description, draft regeneration + confidence indicator, and Gmail email thread view in the lead profile.

</domain>

<decisions>
## Implementation Decisions

### Voice Model Builder (02-01)

- **D-01:** Import method — Labeled per channel with separate sections for Gmail, LinkedIn, Instagram, WhatsApp. Each section: paste textarea + optional `.txt` file upload. Coach can populate any or all channels.
- **D-02:** Layer 2 examples — Raw text only. No per-example labels or metadata. Coach does not manually curate examples.
- **D-03:** AI role — AI analyzes the full imported corpus to produce: (1) Layer 1 structured profile (tone adjectives, formality level, emoji habits, opener phrases, closer phrases, never-say list), and (2) best 10–15 examples selected as Layer 2.
- **D-04:** Coach reviews Layer 1 via AI-generated profile card with editable chips/tags. Coach can remove, add, or confirm each element. Never-say list is AI-recommended — coach can extend or confirm.
- **D-05:** Coach reviews Layer 2 as a visible list of selected examples (truncated previews). Coach can remove or swap individual examples.
- **D-06:** Re-analysis — Coach can trigger re-analysis at any time after adding more data. New analysis merges with or replaces the current profile; coach re-confirms. Supports onboarding in stages.
- **D-07:** Location — `Settings → My Voice` for Phase 2.
- **D-08:** Confidence indicator — Warning badge/banner on the draft when fewer than 8 voice examples exist. Does not block draft generation.

### Transcript Integration (02-02)

- **D-09:** Unmatched transcript handling — Transcripts that fail email/phone matching go to an "Unmatched" tab in the existing `DraftQueueScaffold`. Same panel coaches already check for drafts.
- **D-10:** Unmatched queue assignment UI — Shows: call date, duration, ~200-char transcript preview. Below: searchable lead picker (type name/email). One-click assign.
- **D-11:** Fuzzy matching — Before routing to the unmatched queue, attempt name + timestamp fuzzy match. High confidence → auto-assign with `matched_by='name_timestamp'`. Low confidence → surface in queue with "Did you mean [lead name]?" suggestion.
- **D-12:** Post-match action — Successful match (auto or manual) auto-triggers AI draft generation. Draft surfaces in the draft queue.
- **D-13:** Manual upload — Lives in the lead profile. Coach pastes or uploads transcript text directly on the lead. Stored as `provider='manual'`, `matched_by='manual'`. Auto-triggers draft like a webhook match.

### AI Draft Engine + Stage-Aware Prompts (02-03)

- **D-14:** All lead states have distinct prompt framing (see table below). No states share a generic fallback.
- **D-15:** Manual "Generate" button on each lead profile reads the current state and generates a draft accordingly. Also auto-triggered on transcript match.
- **D-16:** Hard block states — `unsubscribed`, `do_not_contact`, `bounced` — no drafts ever generated. Generate button hidden/disabled.

**State framing guide (for prompt templates):**

| State | Context available | Tone | Primary job |
|---|---|---|---|
| `identified` | None (no prior contact) | Coach voice-heavy, warm, confident | Generic first-touch — coach's natural style, no assumptions about pain points |
| `call_booked` | Any prior messages with pain points/goals | Welcoming, excited, authoritative — not eager or begging | Build anticipation; surface any known pain points; signal looking forward to the call |
| `no_show` | Prior messages, any known pain points | Understanding first, then gently determined | "Something may have come up" → rebook, but frame as finite opportunity; coach's time matters; firm, not punishing |
| `call_completed` | Full transcript + prior conversation | Understanding, uplifting, determined | They had the call but didn't convert — acknowledge situation, believe in them, hold ground on ability to help; bridge interest to commitment |
| `in_sequence` | Full context + sequence position | Coach tone throughout; emotional register adapts per touchpoint | Calibrate every message to conversation position and current life situation — living conversation, not templates |
| `replied` | Full thread + lead description + known pain points | Highly tailored, reactive | Hard-tailor to the specific reply: their exact words, emotional state, what they're signaling; reference known pain points |
| `converted` | Full lead history | Warm, personal, forward-looking | If onboarding module active: trigger it. If not: one tailored welcome-aboard message referencing their journey |
| `closed` | Full lead history | Same as converted | Same as converted |

### AI Lead Description (02-03 / new capability)

- **D-17:** New `ai_summary TEXT` column on `leads` table — requires a Supabase migration.
- **D-18:** AI writes a free-form plain-text paragraph describing the lead: pain points, stated/implied goals, relevant life context (e.g., career transition, divorce), emotional state signals.
- **D-19:** Auto-updated whenever new data arrives: new transcript ingested, new replied email received.
- **D-20:** Injected as primary context layer into every draft generation call.
- **D-21:** Displayed in the lead profile as a pinned card above the Thread/Timeline/Notes tabs — always visible regardless of active tab.
- **D-22:** Coach can annotate or override inline. Coach edits are preserved and protected from AI overwrites on next auto-update.

### Draft Regeneration + Confidence (02-04)

- **D-23:** One-click regen on any draft. See D-08 for confidence indicator behavior.

### Email Thread View (02-05)

- **D-24:** Lives as the first tab in the lead profile tab bar: `Thread | Timeline | Notes`.
- **D-25:** Individual emails collapsed by default (sender, subject, date, first-line preview). Click to expand full body. Most recent email expanded by default.

### Claude's Discretion
- Token budget priority when context exceeds limits (which context layer gets truncated first) — planner determines the right order (likely: transcript summary over full transcript, prior messages over full thread).
- XML delimiter structure for the AI prompt — researcher/planner determines the right schema.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture decisions (locked)
- `CLAUDE.md` — Architecture decisions table: model (`claude-sonnet-4-6`, server-side only), AI drafts import from `@client/ai-engine`, XML delimiter prompt structure, Supabase RLS, no `any` types
- `.planning/ROADMAP.md` — Phase 2 plans list, requirements covered (AI-001–AI-011, VOICE-001–005, TRANS-001–008, GMAIL-009), exit criteria

### Schema (deployed — check before adding migrations)
- `supabase/migrations/20260505000002_tables.sql` — `drafts`, `transcripts`, `draft_edits` tables; `voice_model JSONB` on `coaches`; `confidence_level` and `generation_context` on `drafts`
- `supabase/migrations/20260505000001_enums.sql` — `lead_status` enum (all 11 values), `draft_status` enum

### Existing packages
- `packages/ai-engine/src/index.ts` — Scaffolded with server-only guard; Phase 2 implements the body here
- `packages/shared/src/types/index.ts` — `TDraft`, `TSequence`, `TDraftEdit`, `TLeadStatus` etc.

### Existing components (reuse these)
- `apps/web/components/drafts/DraftQueueScaffold.tsx` — Tab-based queue panel; add "Unmatched" tab here
- `apps/web/components/drafts/DraftCard.tsx` — Established draft display pattern with approve/hold/edit
- `apps/web/components/drafts/InlineDraftEditor.tsx` — Inline editing pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DraftQueueScaffold` — Tab-based panel; add "Unmatched" tab for unmatched transcripts (D-09)
- `DraftCard` + `InlineDraftEditor` — Established draft display and edit pattern; regen button extends DraftCard
- `packages/ai-engine` — Server-only guard already in place; Phase 2 fills the implementation
- `apps/web/app/api/auth/gmail/` — OAuth pattern to follow for any new API routes

### Established Patterns
- Glassmorphism card surfaces: `bg-card dark:bg-white/5 border border-border dark:border-white/10`
- API routes: Next.js route handlers + Zod validation + service-role for admin, user-scoped for coach routes
- All components under 200 lines — extract if longer
- Server components by default; client only when needed (`"use client"`)
- `import "server-only"` on any file using service-role key or Anthropic API

### Integration Points
- `coaches.voice_model JSONB` — Layer 1 + Layer 2 live here; voice model builder reads/writes this column
- `leads.ai_summary TEXT` — New column (migration required); AI description reads/writes here
- `transcripts` table — Webhook handlers write here; lead profile reads here
- `drafts` table — AI engine writes here; DraftCard/DraftQueueScaffold read here via Realtime
- `DraftQueueScaffold` — Add "Unmatched" tab alongside existing draft tabs

</code_context>

<specifics>
## Specific Ideas

- Voice model builder: "The coach imports all the data it has. From emails, Instagram DMs, LinkedIn DMs, WhatsApp messages etc. Then the AI can get a full and detailed scope. And the coach can maybe help the AI with confirming a few things especially the never say list. The AI can make a recommended one, which the coach can add onto or confirm." — This is the intended onboarding mental model.
- No-show tone: "Understanding, but also determined... like I understand that something might have come up, and then determined to say that they can rebook, although it will be the last time they get a chance since it takes time in their calendar."
- Call completed tone: "Understanding their situation, uplifting them / believing in them, but also determined like you know you can do something for them."
- Replied tone: "Hard tailor the conversation to fit current conversation, with situation and given pain points etc."

</specifics>

<deferred>
## Deferred Ideas

- **Voice model builder as onboarding wizard step** — Mentioned by Daniel for Phase 5 (Polish/onboarding wizard). Phase 2 delivers it in Settings → My Voice only.
- **Converted state → onboarding module trigger** — The onboarding module has not been built yet. For now, `converted` generates a tailored welcome message. The onboarding module integration is a future phase.

</deferred>

---

*Phase: 2-Intelligence*
*Context gathered: 2026-05-08*
