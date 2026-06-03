# Deferred Items — Phase 07 Call Outcomes

Out-of-scope discoveries logged during execution (not caused by this plan's changes).
Per the executor SCOPE BOUNDARY rule these are NOT fixed here.

## Pre-existing TypeScript errors in `apps/web` (unrelated to plan 07-01)

Discovered while attempting `tsc --noEmit` for the Task 3 verification. None are in
files this plan created or modified. They predate plan 07-01.

- `lib/unsubscribe-token.ts:31,34,41` — `string | undefined` not assignable to `BinaryLike`; 2 no-overload-match errors.
- `lib/voice/parse-speakers.ts` — ~15 `possibly undefined` / `string | undefined` errors (strict null checks).
- `tests/integration/draft-followup-cta.test.ts:78` and `tests/integration/draft-hold-cascade.test.ts:77` — mocked `StepTools` shape mismatch.
- `tests/unit/draft-generate-branching.test.ts:19,20,33,35,42` — `Object is possibly 'undefined'`.

These should be triaged separately (likely a `tsconfig` strictness or test-mock-typing
cleanup task), independent of Call Outcomes.

## Note on the type-check OOM

`pnpm --filter web type-check` (and a bare `tsc --noEmit`) OOM under the default Node
heap in this environment; it completes with `NODE_OPTIONS=--max-old-space-size=8192`.
Consider adding that to the `type-check` script or CI to avoid flaky OOM.
