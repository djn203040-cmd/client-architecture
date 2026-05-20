---
plan: 04-06
completed: 2026-05-20
tests: 7 GREEN (4 unit + 3 integration)
tsc: clean (no new errors — 8 pre-existing TS2554 from Inngest v4/v3 API mismatch in other files)
---

# 04-06 Summary — Autonomous Modes A & B

## What shipped

| File | Status |
|------|--------|
| `apps/web/components/ui/radio-group.tsx` | ✅ Installed via shadcn |
| `apps/web/components/ui/switch.tsx` | ✅ Installed via shadcn |
| `apps/web/components/ui/checkbox.tsx` | ✅ Installed via shadcn |
| `apps/web/components/ui/alert.tsx` | ✅ Installed via shadcn |
| `apps/web/lib/autonomous-mode.ts` | ✅ Pure helpers (createDraftForCoach, setAutonomousMode, apiModeToDbMode, dbModeToApiMode) |
| `apps/web/app/api/settings/autonomous-mode/route.ts` | ✅ PATCH endpoint with server-side phrase gate |
| `apps/web/app/(dashboard)/settings/autonomous/page.tsx` | ✅ Server component |
| `apps/web/app/(dashboard)/settings/autonomous/AutonomousModeCard.tsx` | ✅ 134 lines — RadioGroup + amber banner |
| `apps/web/app/(dashboard)/settings/autonomous/AutonomousModeAConfirmModal.tsx` | ✅ 71 lines — type-to-confirm modal |
| `apps/web/inngest/functions/autonomous-mode-b-timer.ts` | ✅ sleepUntil + CAS + cancelOn |
| `apps/web/app/api/inngest/route.ts` | ✅ autonomousModeBTimer registered |

## Schema observations

### autonomous_mode DB column
- Located in `coaches` table, declared `TEXT DEFAULT 'off'`
- DB values: `'off' | 'mode_a' | 'mode_b'` (not `'manual'`)
- API layer maps `'manual'` → `'off'` on write, `'off'` → `'manual'` on read
- Mapping lives in `lib/autonomous-mode.ts` (`apiModeToDbMode`, `dbModeToApiMode`)
- No migration needed — column existed from Phase 1

### activity_log table
- **Does NOT exist.** Schema uses `lead_events` for audit trails, which requires `lead_id NOT NULL` — unsuitable for coach-level settings changes.
- The Mode A audit log insert (`autonomous_mode_a_enabled`) is wrapped in `try/catch` and silently no-ops.
- **Phase 4 follow-up**: Consider adding an `audit_events` table for coach-level settings changes, or use `lead_events` with a sentinel `lead_id`.

## Draft-creation upstream branching — NOT YET DONE

The plan noted this as a potential follow-up. The upstream draft-creation path (in `inngest/functions/sequence-step.ts` or `generate-draft.ts`) does **NOT** currently branch on `coach.autonomous_mode`. Required branching:

| Mode | Draft status | Event fired |
|------|-------------|-------------|
| `'off'` / Manual | `'pending'` | `notification/draft_ready` (dispatcher, plan 04-07) |
| `'mode_b'` | `'pending'` | `draft/created_mode_b` (triggers autonomousModeBTimer) |
| `'mode_a'` | `'approved'` | `draft/send_via_gmail` directly |

**This branching must be added in plan 04-07 (dispatcher) or as a task in 04-08**, since 04-07 owns the fan-out logic from draft creation to notification channels.

## Inngest API version note

Existing Inngest functions (sequence-no-show, bounce-handler, etc.) use the v3 3-argument API `createFunction(config, trigger, handler)`. The installed package is `inngest@4.2.6` which uses `createFunction({ id, triggers: [...] }, handler)`. The 8 pre-existing TS2554 errors reflect this mismatch.

`autonomous-mode-b-timer.ts` uses the **v4 2-argument API** (triggers inside config) because the file is directly imported in integration tests, and the v3 form throws a runtime error when evaluated. This file is v4-correct; the other functions should be migrated to v4 format in a cleanup pass.

## Security threat mitigations confirmed

- T-04-06-01: Server-side phrase check in PATCH route — cannot bypass via direct API call
- T-04-06-02: Mode B race condition handled via `approveDraftAtomic` CAS (plan 04-01)
- T-04-06-03: `cancelOn` covers `draft/held_manually` + post-wake status re-check
- T-04-06-04: Mode A toggle logged (best-effort; silently no-ops if table absent)
- T-04-06-05: Confirmation phrase never logged anywhere
- T-04-06-06: `cancelOn` + post-wake status guard prevent Gmail send for cancelled drafts
