# Plan 05-02: Onboarding Wizard — Summary

## Files Created (17)

### Schemas + utilities
- `packages/shared/src/validators/onboarding.ts` — `OnboardingStepEnum`, `OnboardingProgressSchema`, `CompleteStepSchema`, `STEP_ORDER`, `STEP_TO_PROGRESS_KEY`
- `apps/web/lib/onboarding/progress.ts` — `nextIncompleteStep()`, `completedCount()`
- `apps/web/lib/onboarding/demo-seed.ts` — `seedDemoLeadForCoach()` — idempotent demo lead + transcript + AI draft seeding

### API routes
- `apps/web/app/api/onboarding/seed-demo/route.ts` — POST, auth-gated, returns `{ leadId, draftId, draftBody }`
- `apps/web/app/api/onboarding/demo-approve/route.ts` — POST, flips `drafts.status='sent'` via service-role; does NOT call `gmail.users.messages.send`
- `apps/web/app/api/onboarding/complete-step/route.ts` — PATCH, server-side per-step gate (Gmail status, voice ≥8 examples, demo draft sent, notification prefs), writes `onboarding_progress` JSONB

### Route group
- `apps/web/app/(onboarding)/layout.tsx` — auth + `onboarding_completed_at` guard; sibling to `(dashboard)/`
- `apps/web/app/(onboarding)/onboarding/[step]/page.tsx` — validates step via Zod, enforces linear ordering, server-renders per-step content

### Components
- `apps/web/components/onboarding/WizardShell.tsx` — 50 lines (✓ < 200)
- `apps/web/components/onboarding/StepIndicator.tsx` — 4-dot progress indicator
- `apps/web/components/onboarding/StepGmail.tsx` — polls integrations until Gmail connected
- `apps/web/components/onboarding/StepVoice.tsx` — mounts VoiceBuilderClient, Continue disabled until ≥8 examples saved
- `apps/web/components/onboarding/StepFirstLead.tsx` — seeds demo on mount, renders DemoLeadDraft, shows celebration on approve
- `apps/web/components/onboarding/StepNotifications.tsx` — mounts NotificationMatrix
- `apps/web/components/onboarding/DemoLeadDraft.tsx` — wraps draft display with demo-approve handler
- `apps/web/components/dashboard/OnboardingBanner.tsx` — sticky banner; 7-day server-side dismiss; "Finish setup — N of 4 steps remaining"

## Files Modified (6)

- `apps/web/app/(dashboard)/layout.tsx` — adds first-visit redirect gate (`onb_redirected` cookie) + `<OnboardingBanner>`
- `apps/web/app/(dashboard)/leads/page.tsx` — adds `.not("external_ids->>demo", "eq", "true")` filter to exclude demo leads from the list
- `apps/web/app/(dashboard)/settings/voice/VoiceBuilderClient.tsx` — adds optional `onSaved` callback prop
- `apps/web/app/admin/admin-data.ts` — `CoachRosterRow` + mapper extended with `onboarding_completed_at` and `onboarding_progress`
- `apps/web/components/admin/CoachRosterTable.tsx` — adds "Onboarding" column ("N/4 steps · started Xd ago" or "Completed Xd ago")
- `packages/shared/src/validators/index.ts` — exports `./onboarding`

## Key Implementation Notes

**Demo flag on drafts:** The plan specified `external_ids = { demo: true }` on drafts, but the `drafts` table (per pre-Phase5 database types) doesn't have `external_ids`. Used `generation_context = { demo: true }` instead — this JSONB column exists and serves the same filtering purpose. All three routes (`seed-demo`, `demo-approve`, `complete-step`) consistently use `generation_context->>demo`.

**Transcripts:** Plan called for `external_ids` on transcript insert; `transcripts` table has only `external_id` (string). Used `external_id: 'demo'` instead.

**Voice gate:** Voice examples are stored in `voice_model.selected_examples` (not `examples`). Server-side gate in `complete-step` reads `vm.selected_examples.length >= 8`.

## Invariants Confirmed
- `"Demo Lead — Alex Rivera"` with `external_ids = { demo: true }` — seeded idempotently on leads table
- Demo lead absent from default leads list (`/leads`) — filtered by `external_ids->>demo != 'true'`
- `demo-approve` provably does not call `gmail.users.messages.send` — only in a `// does NOT call` comment
- 7-day banner dismiss is server-side (checks `coach.created_at` vs `now() - 7 days`)
- WizardShell: 50 lines (well under 200)
- Admin `/admin` onboarding column: present

## Human Checkpoint (Task 3)

Full E2E flow from Task 3's checklist is required before marking 05-02 complete:
1. Fresh coach → auto-redirect to `/onboarding/gmail`
2. Gmail connect → auto-advance to `/onboarding/voice`
3. Voice: 0 examples → Continue disabled; 8 examples → Continue enabled
4. Demo lead renders; Approve → celebration screen; Gmail inbox has NO real email
5. Notifications step; Continue → `/dashboard`
6. Dashboard shows no banner when all 4 complete
7. Admin `/admin` shows "Completed Xd ago"
8. Leads list shows no "Demo Lead — Alex Rivera"
9. Stopwatch: under 15 minutes (Phase 5 exit criterion)
10. Cookie reset: second dashboard visit shows banner, not redirect

**Approve this checkpoint by typing "approved" or describing issues.**
