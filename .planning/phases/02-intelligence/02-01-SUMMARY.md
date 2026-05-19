# 02-01 Voice Model Builder — Summary

**Status:** Complete
**Date:** 2026-05-19

---

## What Shipped

### Schema migration
`supabase/migrations/20260519000001_phase2_intelligence.sql`
- Added `ai_summary TEXT` and `ai_summary_protected BOOLEAN` to `leads`
- Extended `integration_provider` enum with `zoom` and `fireflies`
- Added `transcripts` to the `supabase_realtime` publication
- `packages/database/src/types.ts` regenerated — `ai_summary`, `zoom`, `fireflies` confirmed present

### ai-engine package (`packages/ai-engine/src/`)
| File | What it does |
|---|---|
| `client.ts` | Anthropic singleton with `import 'server-only'` — never leaks to client bundles |
| `types.ts` | `DraftGenerationParams`, `VoiceAnalysisParams`, `VoiceAnalysisResult` |
| `guardrails.ts` | `isHardBlocked`, `scanNeverSayList`, `assertCoachIdScope` |
| `prompts/voice-analysis.ts` | `buildVoiceAnalysisPrompt` — XML `<corpus>` tags, 4-channel structure |
| `index.ts` | `analyzeVoiceCorpus` with 1 retry on `VoiceParseError`; `VoiceParseError` class |

Dependencies added to `packages/ai-engine/package.json`: `server-only`, `@client/shared`, `@client/database`, `@anthropic-ai/sdk@0.97.0`, `langfuse`, `promptfoo`.

### Validators (`packages/shared/src/validators/voice.ts`)
`VoiceProfileSchema` (Zod) + `TVoiceProfile` type — exported from shared validators index.

### Voice UI (`apps/web/app/(dashboard)/settings/voice/`)
| File | What it does |
|---|---|
| `page.tsx` | Server component — loads `voice_model` from Supabase, renders heading + `VoiceBuilderClient` |
| `VoiceBuilderClient.tsx` | `"use client"` orchestrator — idle / analyzing / complete state machine; `aria-live` status region |
| `VoiceCorpusImporter.tsx` | 4-channel corpus paste + `.txt` file upload; `<label>` + `id` on every Textarea; Analyze CTA |
| `VoiceProfileCard.tsx` | Glass card; Layer 1 chips as `<ul>/<li>`; `<h3>` section labels; `role="alert"` confidence warning |
| `ExamplesList.tsx` | Scrollable `<ul>` with `tabindex="0"`; remove with undo toast; correct counter copy |

### API routes
- `POST /api/voice/analyze` — coach auth, Zod validation, calls `analyzeVoiceCorpus`
- `POST /api/voice/save` — `VoiceProfileSchema` validation, updates `coaches.voice_model`

### shadcn components added
`command`, `tooltip`, `popover` — required by new UI surface.

### Tests
26 unit tests passing across two suites:
- `tests/unit/voice-profile-schema.test.ts` — 10 tests covering Zod schema validation
- `tests/unit/ai-guardrails.test.ts` — 16 tests covering `isHardBlocked`, `scanNeverSayList`, `assertCoachIdScope`

Test setup: `apps/web/vitest.config.ts` alias for `@client/ai-engine`; `tests/mocks/server-only.ts` empty mock.

---

## Bugs Fixed

**LeadEventIcon missing `"use client"` (Phase 1 regression)**
`apps/web/components/leads/LeadEventIcon.tsx` imported `@phosphor-icons/react`, which calls `React.createContext` at module init. Without `"use client"`, Turbopack included it in the SSR server bundle where the react-server condition doesn't export `createContext`. Production build had been silently broken since Phase 1 shipped. Dev server masked it. Fixed by adding `"use client"` directive.

**dialog.tsx icon import**
Reverted a `lucide-react` import back to `@phosphor-icons/react` (introduced in a previous session).

---

## Key Decisions

| Decision | Reasoning |
|---|---|
| `@client/database` added as explicit dep to ai-engine | `@client/database/types` subpath import caused TS resolution failure — explicit dep + top-level import is the correct pattern (matches `packages/shared`) |
| `noUncheckedIndexedAccess` guards on `index.ts` | `message.content[0]` and regex `match[1]` are possibly undefined — guards added at lines 27 and 43 |
| Swap button removed from ExamplesList | The button toggled state but rendered no visible UI — a dead interaction is worse than a missing feature. Removed until a replacement pool is available in 02-03. |
| ChipRow as `<ul>/<li>` | Screen readers announce count and list context; no visual change |

---

## Impeccable Audit Score

**18/20 — Excellent** (post-harden)

All P1/P2/P3 findings resolved before close.

---

## What's Next

**02-02 — Transcript Integration**
- Fireflies.ai webhook → match lead by email/phone → store in `transcripts` table
- Zoom webhook → same matching logic
- Manual upload fallback: coach pastes transcript text in lead profile
- `transcripts` table already exists in schema from 01-02
