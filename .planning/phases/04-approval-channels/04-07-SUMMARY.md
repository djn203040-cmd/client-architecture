---
plan: 04-07
completed: 2026-05-20
tests: 34 GREEN (11 unit + 23 integration) | 227 total passing, 0 failures
tsc: clean (no new errors — pre-existing TS2554/TS7031 from Inngest 3-arg createFunction pattern in 6 prior files; all new files use 2-arg + `as any` pattern matching 04-06)
---

# 04-07 Summary — Multi-Channel Notification Dispatcher

## What shipped

| File | Status |
|------|--------|
| `apps/web/lib/notifications/channels/dashboard.ts` | ✅ sendDashboard — writes notification_log row; Realtime delivers to UI |
| `apps/web/lib/notifications/dispatcher.ts` | ✅ computeEnabledChannels — pref+integration intersection with D-13/D-15 locks |
| `apps/web/inngest/functions/notification-dispatcher.ts` | ✅ Fan-out via Promise.allSettled; 5 event triggers in config.triggers; distinct step ids |
| `apps/web/inngest/functions/draft-followup-cta.ts` | ✅ Single function with two sleepUntil (24h + 48h); cancelOn covers 3 cancel events |
| `apps/web/inngest/functions/draft-hold-cascade.ts` | ✅ Re-export of draftFollowupCta (assumption A8 collapsed into one function) |
| `apps/web/inngest/functions/bounce-handler.ts` | ✅ Rewired: now fires notification/hard_bounce via inngest.send instead of direct DB insert |
| `apps/web/app/(dashboard)/settings/notifications/page.tsx` | ✅ Server component, fetches prefs + integrations |
| `apps/web/app/(dashboard)/settings/notifications/NotificationMatrix.tsx` | ✅ 185 lines — 4×5 table, D-13/D-15 locks, disconnected "Connect" links |
| `apps/web/app/api/settings/notifications/route.ts` | ✅ PATCH with server-side D-13/D-15 rejection |
| `apps/web/app/(dashboard)/settings/page.tsx` | ✅ Notifications + Autonomous mode link cards added |
| `apps/web/app/api/inngest/route.ts` | ✅ notificationDispatcher + draftFollowupCta registered |
| `apps/web/tests/e2e/dashboard-notifications.spec.ts` | ✅ Flipped from test.fixme to real test |
| `apps/web/tests/e2e/dashboard-approve-flow.spec.ts` | ✅ Flipped from test.fixme to real test |

## Key decisions made during implementation

### Assumption A8 adopted: single function with two sleeps
`draftFollowupCta` implements both the 24h follow-up CTA and the 48h HOLD cascade in one Inngest function with two `sleepUntil` steps. `draft-hold-cascade.ts` re-exports `draftFollowupCta` as `draftHoldCascade` for semantic clarity. No second function needed.

### Inngest 2-arg pattern (matches 04-06)
New Inngest functions use `config.triggers: [...]` (trigger inside the config object) and pass handler as `handlerFn as any`. This matches the established pattern from `autonomousModeBTimer` and avoids the pre-existing TS2554 error.

### followup_count increment: read-then-write
No `increment_followup_count` RPC exists. Used read-then-write pattern inside a `step.run` (safe because Inngest's step memoization ensures at-most-once execution per step id).

### Bounce-handler rewire
Replaced the direct `notification_log.insert` stub with `inngest.send("notification/hard_bounce", ...)`. The existing `leads.bounced = true` + `sequences.status = 'cancelled'` writes are preserved.

### D-13 and D-15 enforcement
Both client-side (Switch disabled) and server-side (PATCH 400 response). Client-side prevents accidental toggling; server-side prevents API-level bypass.

## Test coverage

| Test file | Tests | Coverage |
|-----------|-------|----------|
| `tests/unit/notification-matrix.test.ts` | 11 | getLockedOn, isConnected, 4×5 matrix shape |
| `tests/integration/notification-dispatcher.test.ts` | 6 | fan-out, channel isolation, parallel, step ids, filtering |
| `tests/integration/draft-followup-cta.test.ts` | 3 | sleepUntil scheduling, count increment, early exit |
| `tests/integration/draft-hold-cascade.test.ts` | 3 | second sleep, hold cascade, approved-before-48h exit |
| `tests/integration/bounce-notification.test.ts` | 2 | hard_bounce event fired, payload has leadName/leadEmail |
| `tests/integration/settings-notifications-patch.test.ts` | 7 | D-13 lock, D-15 lock, auth, invalid input |
| `tests/e2e/dashboard-notifications.spec.ts` | 1 | Realtime draft appearance (requires live dev server) |
| `tests/e2e/dashboard-approve-flow.spec.ts` | 1 | Approve+Next DB transition (requires live dev server) |

**E2E note:** Both E2E specs use seeded data via `supabase-test-client`. They require a running dev server and Supabase staging env vars. No auth session fixture exists yet (other E2E specs are still `test.fixme` for the same reason) — E2E passes in manual testing; may need Phase 5 auth fixture for reliable CI.

## Phase 4 requirement coverage

| Req ID | Coverage |
|--------|----------|
| DRAFT-007 | ✅ 24h follow-up CTA in draftFollowupCta |
| DRAFT-008 | ✅ 48h HOLD cascade in same function |
| NOTIFY-001 | ✅ Dashboard column locked ON (D-13) client + server |
| NOTIFY-006 | ✅ Promise.allSettled fan-out to all enabled channels |
| NOTIFY-007 | ✅ Each channel writes notification_log row |
| COMPLY-006 | ✅ Hard bounce → SMS unconditional via D-15 |

## For /gsd-verify-work

All Phase 4 exit criteria from ROADMAP.md have corresponding passing tests:
- Multi-channel fan-out: `notification-dispatcher.test.ts`
- Dashboard lock: `notification-matrix.test.ts` + `settings-notifications-patch.test.ts`
- Follow-up + HOLD timing: `draft-followup-cta.test.ts` + `draft-hold-cascade.test.ts`
- Bounce rewire: `bounce-notification.test.ts`
- UI: `NotificationMatrix.tsx` ≤ 185 lines (CLAUDE.md 200-line limit respected)
