# 04-02 Summary — Dashboard Queue (Held Tab + PATCH Route)

## Status: COMPLETE

## What Was Built

### New Files
- `apps/web/app/api/drafts/[id]/route.ts` — PATCH handler for approve / hold / cancel / body edits
- `apps/web/components/drafts/HeldDraftActions.tsx` — Re-approve / Edit / Cancel action row with inline two-step cancel
- `apps/web/components/drafts/HeldTab.tsx` — Held tab content with `useDraftRealtime({ status: "held" })`
- `apps/web/components/drafts/CelebrationEmptyState.tsx` — Animated checkmark + "You're all caught up." + Back to dashboard CTA
- `apps/web/tests/integration/drafts-patch.test.ts` — 8 integration tests for PATCH route
- `apps/web/tests/unit/held-draft-actions.test.ts` — unit tests for HeldDraftActions
- `apps/web/tests/unit/celebration-empty-state.test.ts` — unit tests for CelebrationEmptyState copy/motion contract
- `apps/web/tests/unit/held-tab.test.ts` — unit tests for HeldTab + DraftQueueScaffold tab contracts

### Modified Files
- `apps/web/components/drafts/DraftCard.tsx` — Added `variant?: "pending" | "held"` and `surface?: "app" | "review"` props; `callPatch()` helper routes to `/api/review/[token]` when `surface === "review"`
- `apps/web/components/drafts/draft-realtime.tsx` — Refactored to return `{ drafts, loading }`; accepts `opts?: { status?: "pending" | "held"; initialDrafts?: DraftRow[] }`
- `apps/web/components/drafts/DraftQueueScaffold.tsx` — Three-tab scaffold (Pending | Held | Unmatched); Held badge hidden when count = 0; `justEmptied` guard fires CelebrationEmptyState only after coach action, not initial empty load

## Key Decisions / Deviations

### draft_edits table shape
The `draft_edits` table uses `original_body` / `edited_body` columns (not `previous_body` / `new_body` as the plan's code snippet showed). The route uses the actual column names. No subject tracking in draft_edits (no subject columns exist in the table).

### DraftCard line count
Final: **210 lines** (within ≤ 220 budget). Achieved by inlining `skip()` call and collapsing import blocks.

### InlineDraftEditor interface
HeldDraftActions uses the existing `onSaveAndApprove(body)` callback as a body-only save (calls PATCH with `{ body }` and does not approve). The button label "Save and approve" is slightly misleading for held context but no API change was needed.

### Realtime hook signature change
`useDraftRealtime` now returns `{ drafts, loading }` instead of being a side-effect-only hook. DraftQueueScaffold updated to use `initialDrafts` opt. Backward compatibility maintained through `opts?.initialDrafts` defaulting to `[]` and `loading` defaulting to `false` when initial data is provided.

## Test Results
- 28 / 28 tests GREEN (4 test files)
- 0 tsc errors in new/modified files

## Note for 04-03 (public review page)

`DraftCard` with `surface="review"` is the entry point:
```tsx
<DraftCard draft={draft} surface="review" reviewToken={token} />
```
- Routes PATCH calls to `/api/review/${reviewToken}` (no `/route` suffix)
- Hides regen button
- Applies glass treatment automatically

The `/api/review/[token]` PATCH handler is 04-03's responsibility.
