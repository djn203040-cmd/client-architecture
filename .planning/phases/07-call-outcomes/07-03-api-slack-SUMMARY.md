---
phase: 07-call-outcomes
plan: 03
subsystem: api
tags: [api, zod, slack-blockkit, slack-interactivity, idempotency, idor, chat-update, typescript]

# Dependency graph
requires:
  - phase: 07-call-outcomes (plan 07-01)
    provides: call_outcomes table + record_call_outcome_atomic RPC + recordCallOutcomeAtomic wrapper + buildCallOutcomeBlocks/buildCallOutcomeResolvedBlocks
  - phase: 07-call-outcomes (plan 07-02)
    provides: fireCallOutcomeDownstream({outcome,coachId,leadId,callOutcomeId}); Slack call-outcome ts logged in notification_log (event_type=call_outcome_pending, payload.callOutcomeId)
  - phase: 04-approval-channels
    provides: Slack signature verify, findCoachIdByTeam, draft interactivity branch pattern, syncSlackDraftMessage chat.update template
provides:
  - PATCH /api/call-outcomes/[id] — the single resolve path for every UI (dashboard card + lead-profile panel): Zod {outcome,notes?}, coach-ownership 403, atomic CAS resolve, timeline event, downstream, Slack sync, 409 on already-resolved (no double-fire)
  - syncSlackCallOutcomeMessage({id,coachId,outcome}) — retires the Slack prompt buttons via chat.update on ANY cross-surface resolve (imported by the PATCH route; 07-04 reuses for lead-profile resolves)
  - Slack interactivity call_outcome_* branch — signature-verified, team→coach ownership-checked, atomic resolve + timeline + downstream, retires buttons via replace_original (idempotent on already-resolved)
affects: [07-04-frontend-calls-queue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single atomic resolve path (recordCallOutcomeAtomic) reachable from dashboard PATCH and Slack interactivity — both ownership-checked, both idempotent (CAS no-op -> 409 / silent retire)"
    - "Cross-surface Slack retire: PATCH resolves -> syncSlackCallOutcomeMessage chat.update; Slack-native click retires its own message via replace_original (no ts lookup, keeps 3s budget)"
    - "Ownership-before-mutation: fetch call_outcomes row (adminClient bypasses RLS) and assert coach_id === actor BEFORE any write — no IDOR (T-07-13/T-07-15)"

key-files:
  created:
    - apps/web/app/api/call-outcomes/[id]/route.ts
    - apps/web/lib/slack/sync-call-outcome-message.ts
  modified:
    - apps/web/app/api/webhooks/slack/interactivity/route.ts

key-decisions:
  - "Slack-native click retires via response_url replace_original (no notification_log ts lookup) — faster, stays under Slack's 3s budget; syncSlackCallOutcomeMessage (chat.update) is reserved for the cross-surface case where the resolve did NOT originate from that Slack message (dashboard/lead-profile)"
  - "Timeline event written from BOTH surfaces with identical outcome->lead_event_type mapping (no_show->no_show, completed->call_completed, converted->call_converted) and source tag in payload (source: dashboard|slack) so the activity feed shows where it was resolved"
  - "Slack interactivity on already-resolved (!result.ok) still retires the buttons (replace_original) for idempotent UX but skips timeline+downstream so a late provider no_show / double-click never double-fires (T-07-16); relies on the CAS no-op, not an app-level guard"
  - "Route + sync helper committed together (Task 1) because the route imports the helper — keeps every commit independently buildable; the interactivity branch (Task 3) reuses the already-landed helper's sibling builders, not the helper itself"

patterns-established:
  - "PATCH /api/<resource>/[id] resolve endpoint = mirror of drafts: createClient->getUser (401) -> Zod safeParse (400) -> adminClient row fetch -> 404/403 ownership -> atomic CAS (409 on !ok) -> timeline + downstream + channel sync -> 200 {ok,new_status}"
  - "Slack outcome retire mechanism is surface-dependent: native click = replace_original; foreign-surface resolve = notification_log ts lookup + chat.update"

requirements-completed: [CALL-006, CALL-007, CALL-009]

# Metrics
duration: ~14min
completed: 2026-06-03
---

# Phase 7 Plan 07-03: API + Slack Decision Surfaces Summary

**A coach can now resolve a call outcome from the dashboard/lead-profile (`PATCH /api/call-outcomes/[id]`) or directly from Slack buttons — one atomic, idempotent, ownership-checked path that writes the timeline event, drives the right downstream track, and keeps the Slack prompt in sync (buttons retire on whichever surface resolves it).**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-06-03T11:53:46Z
- **Completed:** 2026-06-03T12:07:00Z
- **Tasks:** 3 (Task 2 was a no-op verification — the 07-01 Block Kit builders already match D-18)
- **Files created:** 2 | **modified:** 1

## Accomplishments
- `PATCH /api/call-outcomes/[id]` (mirror of `app/api/drafts/[id]/route.ts`): Zod `{ outcome: enum(no_show|completed|converted), notes?: string(max 2000) }`; `createClient().auth.getUser()` 401 gate; fetches the `call_outcomes` row with `adminClient` and enforces **`row.coach_id !== user.id` → 403 BEFORE any mutation** (no IDOR, CALL-009/T-07-13); optional `notes` persisted; `recordCallOutcomeAtomic(id, outcome, "dashboard")` CAS resolve → **409 `{ok:false,reason}`** on already-resolved (no double-fire); on ok writes the `lead_events` timeline row (outcome→`no_show`/`call_completed`/`call_converted`), fires `fireCallOutcomeDownstream`, and calls `syncSlackCallOutcomeMessage` to retire any Slack prompt; returns `{ ok:true, new_status }`.
- `lib/slack/sync-call-outcome-message.ts` — `syncSlackCallOutcomeMessage({id,coachId,outcome})` mirrors `syncSlackDraftMessage`: finds the prompt's `ts` in `notification_log` (`event_type='call_outcome_pending'`, `status='sent'`, `payload contains {callOutcomeId:id}`), then `chat.update`s the message to the buttonless `buildCallOutcomeResolvedBlocks(outcome)` state. Best-effort (every failure swallowed — a stale button never fails the resolve); IDs only in logs (CALL-016).
- Slack interactivity `call_outcome_*` branch (after the existing `verifySlackSignature` + `findCoachIdByTeam`): maps `action_id → outcome`, loads the `call_outcomes` row and **verifies `row.coach_id === team-resolved coach`** (else 200 no-op — no cross-team spoof, T-07-15), `recordCallOutcomeAtomic(..., "slack")`, on ok writes the timeline event + fires downstream, then **retires the buttons via `replace_original`** (on both ok and already-resolved for idempotent UX). Responds 200 fast (Slack 3s rule).
- Task 2 verification: confirmed the 07-01 builders (`buildCallOutcomeBlocks` + `buildCallOutcomeResolvedBlocks`) already emit the three D-18 action_ids (`call_outcome_no_show` / `call_outcome_completed` primary / `call_outcome_converted`), `value = callOutcomeId`, the "How did the call with {leadName} go?" header + callTime context, and the buttonless "Recorded: {label}" resolved state. No edit needed — no duplicate builder created.

## Task Commits

1. **Task 1: PATCH route + syncSlackCallOutcomeMessage** - `00a7052` (feat)
2. **Task 2: confirm Block Kit builders match D-18** - no commit (no-op verification, blocks.ts unchanged)
3. **Task 3: Slack interactivity call_outcome_* branch** - `ed29707` (feat)

## Files Created/Modified
- `apps/web/app/api/call-outcomes/[id]/route.ts` (created) - PATCH resolve endpoint
- `apps/web/lib/slack/sync-call-outcome-message.ts` (created) - cross-surface chat.update retire
- `apps/web/app/api/webhooks/slack/interactivity/route.ts` (modified) - `call_outcome_*` branch

## Decisions Made
- **Native Slack click retires via `replace_original`, not the chat.update helper.** A Slack-button resolve already has the message's `response_url`, so it retires its own message directly (faster, no `notification_log` round-trip, stays under the 3s budget). `syncSlackCallOutcomeMessage` (the `chat.update` path) is reserved for the cross-surface case — a dashboard/lead-profile resolve has no `response_url`, so it looks the `ts` up. Both paths use the same `buildCallOutcomeResolvedBlocks`, so the retired message looks identical regardless of surface.
- **Timeline event written from both surfaces** with an identical mapping and a `source` tag (`dashboard`|`slack`) in the event payload, so the activity feed records where the call was resolved.
- **Already-resolved still retires, never re-fires.** On `!result.ok` the Slack branch skips timeline + downstream but still retires the buttons (idempotent UX). The CAS in `record_call_outcome_atomic` is the single guard against double-fire — no app-level status re-check needed.
- **Route + sync helper landed in one commit** (the route imports the helper) so each commit is independently buildable; the interactivity branch (separate commit) only depends on the already-landed sibling builders.

## Deviations from Plan

None — plan executed as written. Task 2 was a planned no-op verification (the plan explicitly states "If both already satisfy D-18, this task is a no-op verification (no file edit)"); the 07-01 builders matched D-18 exactly, so blocks.ts was not touched.

One micro-note (not a deviation): the plan's `<action>` for Task 3 lists `syncSlackCallOutcomeMessage` among the interactivity branch's read-firsts, but the branch retires its own message via `replace_original` (the documented Slack-native pattern, faster than a ts lookup). The helper is still fully exercised — it is the retire path for the PATCH route and any future lead-profile resolve, exactly as the plan's truth "resolving elsewhere also retires them" requires.

## Threat Model Coverage
- **T-07-13 (IDOR — PATCH resolves another coach's outcome):** row fetched and `coach_id !== user.id` → 403 BEFORE any mutation.
- **T-07-14 (forged Slack POST):** `verifySlackSignature` (existing) runs first; 401 on invalid — unchanged, the new branch sits behind it.
- **T-07-15 (Slack click resolves a foreign-team outcome):** `findCoachIdByTeam(team_id)` + `row.coach_id === that coach` assertion; mismatch/missing → 200 no-op (no resolve).
- **T-07-16 (double-click / late provider no_show double-resolve):** `record_call_outcome_atomic` CAS on `status='awaiting_outcome'`; second call no-ops → 409 (PATCH) / silent retire (Slack), downstream never re-fires.
- **T-07-17 (unvalidated body):** Zod `z.enum` outcome + `notes` max-length at the boundary.
- **T-07-18 (lead PII in logs):** IDs only in both the route and the sync helper — no lead name/email logged (CALL-016).

## Issues Encountered
- The strict-whitespace acceptance grep `z.enum(["no_show","completed","converted"])` does not match prettier's canonical spacing (`"no_show", "completed", "converted"`); the plan's authoritative `<verify><automated>` block does not include that grep and passed. Enum is present and correct.

## Verification
- `apps/web` typecheck (`NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`) stays at the documented **25-error baseline** — zero new errors in the three changed files.
- All three task `<verify><automated>` greps pass: PATCH route contains `recordCallOutcomeAtomic` + `409` + `coach_id !== user.id`; blocks.ts contains all three action_ids + both builders; sync helper contains `chat.update` + `notification_log`; interactivity contains `call_outcome_` + `recordCallOutcomeAtomic` + ownership `coach_id` check.

## Next Phase Readiness
- 07-04 (frontend `/calls` queue + `LeadCallOutcomePanel`) POSTs to the now-live `PATCH /api/call-outcomes/[id]` and reuses `syncSlackCallOutcomeMessage` semantics automatically (any resolve retires the Slack prompt).
- The three outcome buttons + copy are fixed and shared (Slack + future dashboard card both read from D-18 wording).

## Self-Check: PASSED
- FOUND: apps/web/app/api/call-outcomes/[id]/route.ts
- FOUND: apps/web/lib/slack/sync-call-outcome-message.ts
- FOUND: apps/web/app/api/webhooks/slack/interactivity/route.ts
- FOUND: commit 00a7052
- FOUND: commit ed29707

---
*Phase: 07-call-outcomes*
*Completed: 2026-06-03*
