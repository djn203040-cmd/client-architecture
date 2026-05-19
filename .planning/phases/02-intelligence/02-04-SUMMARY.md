---
phase: 02-intelligence
plan: 04
status: complete
---

## What shipped

### `apps/web/app/api/drafts/[id]/regenerate/route.ts` (new)
POST handler for one-click draft regeneration. Auth (401), draft ownership (403), hard-block gate (409), voice model validation (400). Sets the existing draft row to `status: 'generating'` in place — no new row inserted (D-23). Fire-and-forget loads fresh lead state, transcripts (oldest-first), sent email history, and coach voice model; calls `generateDraft` from `@client/ai-engine`; updates the same row with new body, `confidence_level`, and `generation_context`. Returns `{ draftId, status: 'generating' }` immediately (202).

### `apps/web/components/drafts/DraftCard.tsx` (modified)
- **Regenerate button**: ghost icon button (`ArrowsClockwise`, `min-h-[44px] min-w-[44px]`, `aria-label="Regenerate draft"`) beside the existing edit button. Spins (`animate-spin`) and disables while `isRegenerating === true`. `isRegenerating` clears when the Realtime subscription delivers the updated `pending` draft. Wrapped in `TooltipProvider`/`Tooltip` showing "Generating new draft..." while active.
- **Amber confidence badge**: replaced old `bg-secondary` "Low voice confidence" badge with amber OKLCH treatment (`bg-[oklch(72%_0.12_70)] text-[oklch(40%_0.10_65)] dark:bg-[oklch(25%_0.08_65)] dark:text-[oklch(85%_0.08_65)]`), `WarningCircle` icon, text "Voice model needs more examples". Color-independent (icon + text, not color alone).
- All existing approve/skip/hold/edit handlers unchanged. File is 196 lines (under 200).

## Verification
- `pnpm --filter web type-check` → clean
- `NODE_OPTIONS="--max-old-space-size=4096" pnpm build` → succeeds (OOM without flag is pre-existing)
- 101 unit tests passing (no regressions)

## Requirements covered
AI-010 (one-click regen), AI-011 (same context reuse), AI-007 (confidence badge)

## Phase 2 exit criteria
- [x] Confidence indicator appears when fewer than 8 voice examples exist
- [x] Draft regeneration produces a visibly different draft on one click
- [ ] Email thread view shows full conversation with a lead (02-05)
