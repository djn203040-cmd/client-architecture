---
plan: 02-03
status: complete
completed_at: 2026-05-19
---

# 02-03 Summary — AI Draft Engine

## What shipped

### packages/ai-engine/src/
- **token-counter.ts** — `estimateTokens` (chars/3.5, fast pre-sizing) + `countTokens` (Anthropic SDK countTokens gate)
- **context-assembler.ts** — `assembleContext`: builds system + user prompts, applies token budget (7,700 target), truncation order: transcript → conversationHistory → coachNotes → voiceExamples (never below 8), records `truncationLog`
- **prompts/system.ts** — `buildSystemPrompt`: embeds Layer 1 in `<voice_profile>`, Layer 2 in `<voice_examples>`, never-say hard constraints, anti-fabrication instructions
- **prompts/draft.ts** — `buildDraftUserPrompt`: XML-delimited context blocks, `STATE_FRAMING` record covering all 11 `TLeadStatus` values with distinct framing per state
- **prompts/lead-description.ts** — `buildLeadDescriptionPrompt`: facts-only analyst prompt for synthesizing AI lead summary
- **tracing.ts** — Langfuse wrapper, no-ops when keys absent, metadata uses `leadId` UUID only (T-02-15)
- **index.ts** extended with `generateDraft` and `updateLeadDescription`
  - Hard-block gate fires before any API call (T-02-13)
  - Token count gate before generation (AI-004)
  - Never-say scan with one auto-regen attempt (AI-003)
  - `confidenceLevel: 'low'` when fewer than 8 voice examples (AI-007)
  - `updateLeadDescription` returns null if `isProtected` (D-22)

### apps/web/app/api/drafts/generate/route.ts
- POST, coach auth (401), ownership check (403)
- Validates voice model exists → 400 with helpful message
- Hard-block check → 409
- Inserts draft with `status: 'generating'`
- Fire-and-forget assembles full context (transcripts oldest-first, sent emails as history)
- Updates draft to `status: 'pending'` with body + confidence_level + generation_context JSONB
- Updates `leads.ai_summary` if not protected (D-19)

### UI components (lead profile page)
- **LeadAISummaryCard.tsx** — pinned above activity/notes, glass surface, empty state copy
- **AISummaryEditor.tsx** — click-to-edit inline, PATCH with `ai_summary_protected: true`, lock icon when edited
- **GenerateDraftButton.tsx** — returns `null` for hard-blocked states, Realtime subscription on draft ID, toasts on ready/error

### Tests
- `ai-engine-guard.test.ts` — 2 tests, browser context guard verified
- `token-counter.test.ts` — 10 tests, estimateTokens + countTokens + assembleContext truncation
- `confidence-indicator.test.ts` — 9 tests, confidence threshold + hard-block gate + never-say scan
- All 99 unit tests passing

## Requirements covered
AI-001 ✅ AI-002 ✅ AI-003 ✅ AI-004 ✅ AI-005 ✅ AI-006 ✅ AI-007 ✅

## Phase 2 exit criteria progress
- [x] Voice model builder
- [x] Transcript webhooks (Fireflies + Zoom)
- [x] AI draft generated referencing transcript + voice
- [x] Confidence indicator for < 8 examples
- [ ] Draft regeneration (02-04)
- [ ] Email thread view (02-05)
