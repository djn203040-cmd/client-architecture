---
phase: 05-polish
plan: 02
type: execute
wave: 2
depends_on: [05-03]
files_modified:
  - apps/web/app/(onboarding)/layout.tsx
  - apps/web/app/(onboarding)/onboarding/[step]/page.tsx
  - apps/web/app/(dashboard)/layout.tsx
  - apps/web/components/onboarding/WizardShell.tsx
  - apps/web/components/onboarding/StepIndicator.tsx
  - apps/web/components/onboarding/StepGmail.tsx
  - apps/web/components/onboarding/StepVoice.tsx
  - apps/web/components/onboarding/StepFirstLead.tsx
  - apps/web/components/onboarding/StepNotifications.tsx
  - apps/web/components/onboarding/DemoLeadDraft.tsx
  - apps/web/components/dashboard/OnboardingBanner.tsx
  - apps/web/components/admin/CoachRosterTable.tsx
  - apps/web/lib/onboarding/demo-seed.ts
  - apps/web/lib/onboarding/progress.ts
  - apps/web/app/api/onboarding/seed-demo/route.ts
  - apps/web/app/api/onboarding/demo-approve/route.ts
  - apps/web/app/api/onboarding/complete-step/route.ts
  - packages/shared/schemas/onboarding.ts
autonomous: false
requirements: [VOICE-005]

must_haves:
  truths:
    - "New coach with onboarding_completed_at NULL is server-side redirected to /onboarding/{next-step} on first dashboard visit"
    - "Wizard enforces 4 required steps in order: gmail → voice → first-lead → notifications"
    - "Voice step gate: requires coaches.voice_model.examples.length >= 8 (server-side check), no skip button in production"
    - "First-lead step seeds 'Demo Lead — Alex Rivera' idempotently with external_ids.demo = true"
    - "Demo Approve does NOT call Gmail send — shows celebration screen and writes draft.status='sent' locally only"
    - "Onboarding banner shows on dashboard when incomplete, hides after 7 days (coach.created_at < now() - interval '7 days')"
    - "Admin /admin CoachRosterTable shows onboarding progress column (N/4 steps · started Xd ago)"
  artifacts:
    - path: "apps/web/app/(onboarding)/layout.tsx"
      provides: "Minimal wizard shell (logo + step indicator + skip dev-only)"
    - path: "apps/web/app/(onboarding)/onboarding/[step]/page.tsx"
      provides: "Dynamic step route — gmail|voice|first-lead|notifications"
    - path: "apps/web/lib/onboarding/demo-seed.ts"
      provides: "Idempotent demo-lead seeding"
      exports: ["seedDemoLeadForCoach"]
    - path: "packages/shared/schemas/onboarding.ts"
      provides: "Zod schemas for onboarding step writes and progress shape"
      exports: ["OnboardingProgressSchema", "CompleteStepSchema", "OnboardingStepEnum"]
  key_links:
    - from: "apps/web/app/(dashboard)/layout.tsx"
      to: "/onboarding/{next-step}"
      via: "next/navigation redirect when coach.onboarding_completed_at IS NULL and onb_redirected cookie unset"
      pattern: "redirect\\(.*onboarding"
    - from: "apps/web/app/api/onboarding/demo-approve/route.ts"
      to: "drafts table (NOT gmail.users.messages.send)"
      via: "service-role UPDATE drafts SET status='sent' WHERE id=? AND external_ids->>'demo'='true'"
      pattern: "status.*sent.*demo"
    - from: "apps/web/components/dashboard/OnboardingBanner.tsx"
      to: "/onboarding/{next-step}"
      via: "Resume link reading coach.onboarding_progress"
      pattern: "Finish setup"
---

<objective>
Ship the new-coach onboarding wizard at `/onboarding/[step]` with four required steps (Gmail → Voice ≥8 → Demo Lead walkthrough → Notification channel), redirect-then-banner resume behavior, idempotent demo-lead seeding with intercepted Approve, and an admin onboarding-progress column.

Purpose: VOICE-005 — "Voice model builder UI guides coach through uploading and curating examples during onboarding" — gets its delivery surface. Phase 5 exit criterion "New coach can complete onboarding in under 15 minutes" requires this flow.

Output:
- New `(onboarding)` route group with minimal shell (D-06)
- 4 step components reusing Phase 1 Gmail OAuth + Phase 2 VoiceBuilderClient + Phase 4 NotificationMatrix + Phase 1 DraftCard
- Demo-lead seed helper + intercepted-approve API route (D-09)
- Dashboard layout server-side gate (D-10) + OnboardingBanner (D-10)
- Admin CoachRosterTable column showing N/4 progress (D-10)
- Zod schemas in `packages/shared/`
</objective>

<execution_context>
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/workflows/execute-plan.md
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-polish/05-CONTEXT.md
@.planning/phases/05-polish/05-RESEARCH.md
@.planning/phases/05-polish/05-03-SUMMARY.md
@CLAUDE.md
@apps/web/app/(dashboard)/layout.tsx
@apps/web/components/drafts/DraftCard.tsx

<interfaces>
<!-- Phase 5 schema columns added by Plan 05-03's migration; consumed here. -->
From supabase/migrations/20260520000004_phase5_polish.sql:
```sql
ALTER TABLE coaches
  ADD COLUMN onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN onboarding_progress JSONB NOT NULL DEFAULT '{}';
-- progress shape:
-- {
--   "gmail_connected_at": "...",
--   "voice_model_completed_at": "...",
--   "first_lead_completed_at": "...",
--   "notifications_picked_at": "...",
--   "banner_dismissed_until": "..."
-- }
```

<!-- Step parameter enum — locked per D-07 ordering -->
type OnboardingStep = "gmail" | "voice" | "first-lead" | "notifications";

<!-- Demo lead canonical specs — locked per CONTEXT.md Specifics + D-09 -->
const DEMO_LEAD = {
  name: "Demo Lead — Alex Rivera",
  email_template: (coachId: string) => `demo+${coachId}@sonorous.test`,
  source: "manual",
  status: "call_completed",  // so draft has meaningful state
  external_ids: { demo: true },
};

<!-- Onboarding banner copy — exact per CONTEXT.md Specifics -->
const BANNER_COPY = "Finish setup — {N} of 4 steps remaining";
const BANNER_CTA  = "Resume";

<!-- Existing reuse targets (verify file paths during implementation) -->
- apps/web/components/drafts/DraftCard.tsx (Phase 1, refactored Phase 4 with variant/surface props) — reused in read-only intercept mode
- apps/web/components/settings/VoiceBuilderClient.tsx OR existing /settings/voice page content (Phase 2) — lifted into StepVoice
- apps/web/components/settings/NotificationMatrix.tsx (Phase 4) — reused in StepNotifications
- apps/web/app/api/auth/gmail/authorize/route.ts (Phase 1) — Gmail OAuth, reused as-is
- packages/ai-engine (Phase 2) — voice-model + draft generation, called by demo-seed
- apps/web/lib/email/template.ts (existing) — pattern for celebration email Gmail-draft
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Zod schemas, demo-seed helper, and three API routes (seed-demo, demo-approve, complete-step)</name>
  <files>packages/shared/schemas/onboarding.ts, apps/web/lib/onboarding/demo-seed.ts, apps/web/lib/onboarding/progress.ts, apps/web/app/api/onboarding/seed-demo/route.ts, apps/web/app/api/onboarding/demo-approve/route.ts, apps/web/app/api/onboarding/complete-step/route.ts</files>
  <behavior>
    - Test: `OnboardingStepEnum` parses only `"gmail" | "voice" | "first-lead" | "notifications"` — any other string fails
    - Test: `seedDemoLeadForCoach(coachId)` is idempotent — calling twice returns the same lead UUID, only one DB row
    - Test: `seedDemoLeadForCoach` writes `external_ids = { demo: true }`, name `"Demo Lead — Alex Rivera"`, email `demo+{coachId}@sonorous.test`
    - Test: POST `/api/onboarding/seed-demo` requires auth, seeds for the authed coach only, returns 401 if unauthed
    - Test: POST `/api/onboarding/demo-approve` flips draft status to `'sent'` BUT does NOT invoke Gmail send (use a spy/mock to assert no Gmail call)
    - Test: PATCH `/api/onboarding/complete-step` validates step name via Zod, writes `onboarding_progress[step+'_completed_at'] = now()`, and sets `onboarding_completed_at = now()` when all 4 are set
    - Test: cross-coach attack — coach A calls demo-approve with coach B's draft ID returns 404 (RLS-scoped)
  </behavior>
  <action>
1. Create `packages/shared/schemas/onboarding.ts`:
```ts
import { z } from "zod";

export const OnboardingStepEnum = z.enum(["gmail", "voice", "first-lead", "notifications"]);
export type OnboardingStep = z.infer<typeof OnboardingStepEnum>;

export const OnboardingProgressSchema = z.object({
  gmail_connected_at: z.string().datetime().nullable().optional(),
  voice_model_completed_at: z.string().datetime().nullable().optional(),
  first_lead_completed_at: z.string().datetime().nullable().optional(),
  notifications_picked_at: z.string().datetime().nullable().optional(),
  banner_dismissed_until: z.string().datetime().nullable().optional(),
});
export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

export const CompleteStepSchema = z.object({
  step: OnboardingStepEnum,
});

export const STEP_TO_PROGRESS_KEY: Record<OnboardingStep, keyof OnboardingProgress> = {
  gmail: "gmail_connected_at",
  voice: "voice_model_completed_at",
  "first-lead": "first_lead_completed_at",
  notifications: "notifications_picked_at",
};

export const STEP_ORDER: readonly OnboardingStep[] = ["gmail", "voice", "first-lead", "notifications"] as const;
```

2. Create `apps/web/lib/onboarding/progress.ts`:
```ts
import { OnboardingProgress, STEP_ORDER, STEP_TO_PROGRESS_KEY, type OnboardingStep } from "@sonorous/shared/schemas/onboarding";

export function nextIncompleteStep(progress: OnboardingProgress): OnboardingStep | null {
  for (const step of STEP_ORDER) {
    if (!progress[STEP_TO_PROGRESS_KEY[step]]) return step;
  }
  return null;
}

export function completedCount(progress: OnboardingProgress): number {
  return STEP_ORDER.filter((s) => Boolean(progress[STEP_TO_PROGRESS_KEY[s]])).length;
}
```

3. Create `apps/web/lib/onboarding/demo-seed.ts` — exports `seedDemoLeadForCoach(coachId, supabaseAdmin)`:
   - Look up existing demo lead by `coach_id = ? AND external_ids->>demo = 'true'`
   - If exists, return that lead. Idempotent.
   - Else: insert with name `"Demo Lead — Alex Rivera"`, email `demo+${coachId}@sonorous.test`, source `'manual'`, status `'call_completed'`, `external_ids = { demo: true }`.
   - Insert a sample transcript row pointing to this lead with `external_ids->>demo = 'true'` (pre-canned text — 4–5 paragraphs of realistic-sounding call content; checked in as a constant).
   - Call `packages/ai-engine.generateDraft({ coachId, leadId })` to produce the first AI draft against the coach's voice model. Insert as a `drafts` row with `external_ids = { demo: true }` and `status = 'pending'`.
   - Returns `{ leadId, draftId }`.
   - Per Pitfall 5 (RESEARCH.md): the default lead-list query must filter out demo leads. Verify the existing lead-list query and add `.not('external_ids->>demo', 'eq', 'true')` if not present. If the lead-list query lives in a different file, surface this as a file modification — DO NOT silently leave demo leads visible.

4. Create `apps/web/app/api/onboarding/seed-demo/route.ts` — `POST`:
   - Auth check via existing `createClient()` cookie-session pattern.
   - Call `seedDemoLeadForCoach(coach.id, adminClient)`.
   - Return `{ leadId, draftId }`.
   - Validate body with empty Zod schema (no payload accepted).

5. Create `apps/web/app/api/onboarding/demo-approve/route.ts` — `POST`:
   - Body: `{ draftId: z.string().uuid() }`.
   - Auth check.
   - Verify draft belongs to this coach AND `external_ids->>demo = 'true'` (refuse to intercept real drafts).
   - **Critical** — does NOT call `gmail.users.messages.send`. Just `UPDATE drafts SET status = 'sent', sent_at = now() WHERE id = ? AND coach_id = ? AND external_ids->>'demo' = 'true'`.
   - Soft-archive the demo lead: `UPDATE leads SET status = 'archived' WHERE id = (SELECT lead_id FROM drafts WHERE id = ?)`.
   - Optionally Gmail-draft the celebration message (Per D-09: "Sent to coach's Gmail draft folder" disclaimer) — use existing `apps/web/lib/email/template.ts` pattern + `gmail.users.drafts.create` (NOT `.send`). This is a draft folder write, not a send. If Gmail isn't connected (shouldn't happen — step 1 gates it), skip and log.
   - Return `{ ok: true, celebrationMessage: string }`.
   - Per Assumption A3 (RESEARCH.md): verify the Phase 4 advisory-lock CAS path allows a direct `status='sent'` write on demo drafts. If Phase 4 gates all status transitions through the `approveDraftAtomic` RPC, add a bypass branch in this route that uses service-role direct UPDATE for `external_ids->>'demo' = 'true'` rows. Document the bypass in code comments.

6. Create `apps/web/app/api/onboarding/complete-step/route.ts` — `PATCH`:
   - Body validated by `CompleteStepSchema`.
   - Auth check.
   - Server-side gate for `step === "voice"`: read `coaches.voice_model`, parse examples array, assert `length >= 8` per Pitfall 10 — never trust client. Return 409 with reason if gate fails.
   - Server-side gate for `step === "gmail"`: read `integrations` for this coach, assert `provider='gmail' AND status='connected'`. Return 409 if not.
   - Server-side gate for `step === "first-lead"`: assert there exists a draft for this coach where `external_ids->>'demo' = 'true' AND status = 'sent'`. Return 409 if not.
   - Server-side gate for `step === "notifications"`: assert `notification_preferences` for this coach has either ≥2 channels enabled OR `dashboard_only_acknowledged = true`. Return 409 if not.
   - Write progress: `UPDATE coaches SET onboarding_progress = jsonb_set(onboarding_progress, '{<key>}', to_jsonb(now())) WHERE id = ?`.
   - If all four keys are set: `UPDATE coaches SET onboarding_completed_at = now() WHERE id = ?`.
   - Return `{ nextStep: OnboardingStep | null, completed: boolean }`.

All four routes use the existing Supabase server-client pattern (`createClient` from `apps/web/lib/supabase/server.ts`). No `console.log` of sensitive data per COMPLY-009. Service-role client used only for the demo-approve direct UPDATE.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -10</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web test -- --run apps/web/tests/unit/onboarding 2>&1 | tail -20 || echo "MISSING — Wave 0 must create apps/web/tests/unit/onboarding/ first; add now"</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "Demo Lead — Alex Rivera" apps/web/lib/onboarding/demo-seed.ts && grep -q "external_ids" apps/web/lib/onboarding/demo-seed.ts && grep -q "demo+" apps/web/lib/onboarding/demo-seed.ts</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -v '^#' apps/web/app/api/onboarding/demo-approve/route.ts | grep -c "gmail.users.messages.send" | grep -q "^0$"</automated>
  </verify>
  <done>
    Schemas in packages/shared. Demo seed idempotent and writes the exact required fields. demo-approve route flips draft.status but does NOT call Gmail send (grep gate proves zero occurrences). complete-step server-validates each step's completion criteria before writing progress. All routes Zod-validated.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wizard route group, 4 step components, dashboard onboarding gate, banner, admin column</name>
  <files>apps/web/app/(onboarding)/layout.tsx, apps/web/app/(onboarding)/onboarding/[step]/page.tsx, apps/web/components/onboarding/WizardShell.tsx, apps/web/components/onboarding/StepIndicator.tsx, apps/web/components/onboarding/StepGmail.tsx, apps/web/components/onboarding/StepVoice.tsx, apps/web/components/onboarding/StepFirstLead.tsx, apps/web/components/onboarding/StepNotifications.tsx, apps/web/components/onboarding/DemoLeadDraft.tsx, apps/web/components/dashboard/OnboardingBanner.tsx, apps/web/components/admin/CoachRosterTable.tsx, apps/web/app/(dashboard)/layout.tsx</files>
  <behavior>
    - Test: visiting `/onboarding/gmail` renders WizardShell with StepIndicator showing step 1 of 4 active
    - Test: visiting `/onboarding/invalid-step` returns 404
    - Test: production build (`NODE_ENV=production`) does NOT render "Skip for now" link; dev build does
    - Test: first dashboard visit by a coach with `onboarding_completed_at IS NULL` and no `onb_redirected` cookie → 307 redirect to `/onboarding/{next-step}`
    - Test: subsequent dashboard visit (cookie set) → no redirect; OnboardingBanner renders at top
    - Test: banner shows "Finish setup — N of 4 steps remaining" with correct N
    - Test: banner does NOT render when `coach.created_at < now() - interval '7 days'` (server-side 7-day permanent dismiss)
    - Test: admin `/admin` page shows a new column for each coach: "N/4 · started Xd ago" or "Completed Xd ago" depending on state
    - Test: WizardShell.tsx is under 200 lines
  </behavior>
  <action>
1. Create `apps/web/app/(onboarding)/layout.tsx` (server component, NEW route group):
   - Minimal shell. Logo (top-left), `StepIndicator` (top-center), dev-only "Skip for now" link (top-right, gated by `process.env.NODE_ENV !== 'production'`).
   - Background uses warm uplifting palette (existing tokens — NOT a new color). Subtle glass-frosted panel for the step content.
   - Dark/light support via existing `ThemeToggle` import.
   - Auth check: if no session, redirect to `/login`. If `onboarding_completed_at IS NOT NULL`, redirect to `/dashboard`.
   - Per Pitfall 6 (RESEARCH.md): ensure this layout is the SIBLING of `(dashboard)/`, not nested inside it. Route group `(onboarding)/` lives at `apps/web/app/(onboarding)/` next to `apps/web/app/(dashboard)/`.

2. Create `apps/web/app/(onboarding)/onboarding/[step]/page.tsx`:
   - `params: { step: string }`.
   - Validate `step` via `OnboardingStepEnum.safeParse(params.step)` — on fail, call `notFound()` from `next/navigation`.
   - Server-side: load coach, load `onboarding_progress`, compute `nextIncompleteStep`. If `params.step !== nextIncompleteStep`, redirect to the correct next step (prevents step skipping).
   - Render `<WizardShell currentStep={step}>` containing the right step component.

3. Create `apps/web/components/onboarding/StepIndicator.tsx` (server component): 4-dot horizontal progress. Filled dots = completed. Active dot = current. Empty = future. Use existing color tokens.

4. Create `apps/web/components/onboarding/WizardShell.tsx` (server component, **must stay < 200 lines**): props `{ currentStep: OnboardingStep, children: ReactNode }`. Layout: heading, body slot, footer with "Back" (disabled on step 1) and "Continue" (the per-step component owns its own primary action; WizardShell just provides the chrome). If `NODE_ENV !== 'production'`, render dev-only footer link "Skip for now (dev)" that POSTs to `/api/onboarding/complete-step` for all four steps. Production builds simply don't render it.

5. Create `apps/web/components/onboarding/StepGmail.tsx`:
   - Renders a glass-frosted card with copy "Connect your Gmail. We send emails as you — never from a generic address."
   - Reuses existing Gmail OAuth install button (Phase 1 — links to `/api/auth/gmail/authorize`).
   - Polls integrations row every 2s until `provider='gmail' AND status='connected'` (or uses Supabase Realtime if available).
   - On detection, POST to `/api/onboarding/complete-step` with `{ step: "gmail" }`, then `router.push("/onboarding/voice")`.

6. Create `apps/web/components/onboarding/StepVoice.tsx`:
   - Renders heading "Teach the AI your voice. 8 examples minimum."
   - Mounts the existing voice-model builder UI from Phase 2 (`apps/web/components/settings/VoiceBuilderClient.tsx`, lifted from `/settings/voice/` per Plan 05-03). If Plan 05-03 hasn't lifted it yet at execution time, import directly from the current `/settings/voice/page.tsx`'s client component.
   - Server-side fetches current example count, displays badge "{count} / 8 minimum".
   - "Continue" button DISABLED until server-side count ≥ 8 (per Pitfall 10 — never trust optimistic client count). On click, POST `/api/onboarding/complete-step` with `{ step: "voice" }`, then `router.push("/onboarding/first-lead")`.
   - No "Skip" button on this step in any environment (D-07: AI quality floor).

7. Create `apps/web/components/onboarding/StepFirstLead.tsx`:
   - On mount, POST `/api/onboarding/seed-demo` to seed the demo lead + transcript + AI draft (idempotent).
   - Renders `<DemoLeadDraft draftId={...} />` which mounts `DraftCard` in read-only mode.
   - Below DraftCard: a single "Approve this draft" button.
   - On click: POST `/api/onboarding/demo-approve` with `{ draftId }`. On success, swap to celebration screen: "This is what'll happen on every real lead. Sent to your Gmail draft folder for reference." with the message body shown.
   - Then a "Continue" button that POSTs `/api/onboarding/complete-step` with `{ step: "first-lead" }` and pushes to `/onboarding/notifications`.

8. Create `apps/web/components/onboarding/DemoLeadDraft.tsx`:
   - Wraps existing `DraftCard.tsx` (Phase 1, Phase 4 variant prop).
   - Passes a custom `onApprove` handler that calls `/api/onboarding/demo-approve` instead of the default approve path.
   - Marks the card visually as a demo (small badge "Onboarding demo" — non-intrusive).

9. Create `apps/web/components/onboarding/StepNotifications.tsx`:
   - Heading "Where do you want to hear about new drafts?"
   - Mounts existing `NotificationMatrix.tsx` (Phase 4 — lifted by Plan 05-03).
   - Validation: server-side check that ≥1 channel beyond Dashboard is enabled OR explicit `dashboard_only_acknowledged = true` checkbox. Continue button POSTs `{ step: "notifications" }`, shows toast "Notifications set — you can change these anytime in Settings." per CONTEXT.md Specifics.
   - On completion (all 4 steps done): redirect to `/dashboard`.

10. Create `apps/web/components/dashboard/OnboardingBanner.tsx` (server component for the data, client island for dismiss):
    - Props: `{ progress: OnboardingProgress, coachCreatedAt: string }`.
    - Server-side logic: if `coachCreatedAt < now() - 7 days`, return `null` (7-day permanent dismiss). Else compute `completedCount`. If 4/4, return `null`. Else render banner.
    - Copy: `"Finish setup — {4 - completedCount} of 4 steps remaining"` with `<Link href="/onboarding/{nextStep}">Resume</Link>`.
    - Dismiss button (X) sets a session-level cookie `onb_banner_dismissed=1`. Hides on subsequent renders this session.
    - Slim, sticky top placement. Glass-frosted bar, warm palette.

11. Edit `apps/web/app/(dashboard)/layout.tsx`:
    - **BEFORE** rendering `<AppShell>`, add the redirect-then-cookie gate per RESEARCH.md Pattern 9:
      ```ts
      if (!coach.onboarding_completed_at) {
        const progress = (coach.onboarding_progress ?? {}) as OnboardingProgress;
        const nextStep = nextIncompleteStep(progress);
        const cookieStore = await cookies();
        const redirected = cookieStore.get("onb_redirected")?.value === "1";
        if (!redirected && nextStep) {
          cookieStore.set("onb_redirected", "1", { httpOnly: false, sameSite: "lax", path: "/" });
          redirect(`/onboarding/${nextStep}`);
        }
      }
      ```
    - Render `<OnboardingBanner progress={progress} coachCreatedAt={coach.created_at} />` inside AppShell (above main content) when `onboarding_completed_at IS NULL`.

12. Edit `apps/web/components/admin/CoachRosterTable.tsx`:
    - Add a new column header "Onboarding".
    - For each coach row, render:
      - If `onboarding_completed_at IS NOT NULL`: `"Completed Xd ago"` (relative time).
      - Else: `"{N}/4 steps · started Xd ago"` based on `onboarding_progress` and `created_at`.
    - Use existing relative-time helper (or `date-fns` `formatDistanceToNow`).

**Performance note:** All step components are RSCs except where interactivity is needed (Approve handler, NotificationMatrix toggles, voice example uploader). Client islands stay small.

**Per CLAUDE.md:** RLS scoped to coach_id (already enforced by RLS policies); Zod at every boundary (done); TypeScript strict no `any`; loading states on async (poll for Gmail, count fetch); error boundaries on the wizard shell.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -10</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && for f in apps/web/app/\(onboarding\)/layout.tsx apps/web/app/\(onboarding\)/onboarding/\[step\]/page.tsx apps/web/components/onboarding/WizardShell.tsx apps/web/components/onboarding/StepGmail.tsx apps/web/components/onboarding/StepVoice.tsx apps/web/components/onboarding/StepFirstLead.tsx apps/web/components/onboarding/StepNotifications.tsx apps/web/components/onboarding/DemoLeadDraft.tsx apps/web/components/dashboard/OnboardingBanner.tsx; do test -f "$f" || (echo "MISSING $f" && exit 1); done && wc -l apps/web/components/onboarding/WizardShell.tsx | awk '{ if ($1 > 200) { print "OVER 200 LINES"; exit 1 } }'</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "onboarding_completed_at" apps/web/app/\(dashboard\)/layout.tsx && grep -q "Finish setup" apps/web/components/dashboard/OnboardingBanner.tsx && grep -q "Onboarding" apps/web/components/admin/CoachRosterTable.tsx</automated>
  </verify>
  <done>
    Route group, layout, dynamic step page, 4 step components, banner, admin column all exist. WizardShell under 200 lines. Dashboard layout gates first visit redirect. Production build does not expose dev skip link.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: End-to-end onboarding flow verification (under 15 minutes target)</name>
  <what-built>
    - `/onboarding/{step}` 4-step wizard (Gmail → Voice ≥8 → Demo Lead → Notifications)
    - Dashboard server-side redirect on first visit for incomplete coaches
    - OnboardingBanner shown on dashboard until 7 days after coach creation
    - Admin CoachRosterTable shows onboarding progress per coach
    - Demo lead is seeded idempotently, Approve does NOT send a real email
  </what-built>
  <how-to-verify>
    1. Create a fresh test coach via admin invite flow.
    2. Sign in as that coach. Verify automatic redirect to `/onboarding/gmail`.
    3. Connect a test Gmail account via the step 1 button. Wait for status `connected`. Verify auto-advance to `/onboarding/voice`.
    4. On the voice step, attempt to click "Continue" with 0 examples — confirm it's disabled.
    5. Upload 7 voice examples. Confirm "Continue" still disabled. Upload an 8th. Confirm "Continue" enables.
    6. Click Continue → `/onboarding/first-lead`.
    7. Confirm the demo lead "Demo Lead — Alex Rivera" + AI draft renders in DraftCard with read-only intercept.
    8. Click "Approve this draft". Confirm celebration screen renders. **Critically:** check the connected Gmail inbox — confirm NO email was sent to `demo+{coachId}@sonorous.test`. Check the Gmail drafts folder — confirm a draft message was created there.
    9. Click Continue → `/onboarding/notifications`.
    10. Try clicking Continue with no channel beyond Dashboard ticked — confirm error.
    11. Check "Dashboard only" acknowledgement OR enable Email/Slack/etc. Click Continue.
    12. Confirm redirect to `/dashboard`. Verify NO onboarding banner shown.
    13. Visit `/admin`. Confirm the test coach row shows "Completed Xs ago" in the Onboarding column.
    14. Verify default lead list (`/leads`) does NOT show "Demo Lead — Alex Rivera" (Pitfall 5).
    15. Stopwatch from step 1 to step 13 — confirm under 15 minutes (Phase 5 exit criterion).
    16. Reset: clear the coach's `onboarding_completed_at` (admin SQL). Sign back in. Confirm redirect to wherever onboarding_progress points. Close tab. Reopen `/dashboard`. Confirm NO second redirect — banner shown instead.
    17. Admin SQL: backdate `coaches.created_at` to 8 days ago. Reload dashboard. Confirm banner is gone (7-day rule).
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Coach session → onboarding APIs | Authenticated coach posts step completions; all three onboarding routes validate session AND restrict mutations to `coach.id = auth.uid()`. |
| Browser → demo-approve route | Could attempt to flip status on a non-demo draft. Mitigation: server checks `external_ids->>'demo' = 'true'`. |
| Admin → coach onboarding data | Daniel's admin role can read all coaches' progress via service-role queries (existing INFRA-005 pattern). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-02-01 | Spoofing | demo-approve route | mitigate | Service-role UPDATE filters `external_ids->>'demo' = 'true'` — refuses to act on real drafts. Audit: zero invocations of `gmail.users.messages.send` in route (grep-verified). |
| T-05-02-02 | Tampering | complete-step route | mitigate | Each step's completion criterion server-validated (Gmail status, voice example count ≥8, demo draft sent, notification prefs set). Client cannot bypass by direct POST. |
| T-05-02-03 | Information Disclosure | demo lead leakage | mitigate | Default lead-list query adds `.not('external_ids->>demo', 'eq', 'true')` per Pitfall 5. RLS prevents cross-coach demo lead visibility. |
| T-05-02-04 | Information Disclosure | cross-coach demo-approve | mitigate | RLS on drafts table scopes by coach_id; route additionally enforces `coach_id = auth.uid()` in WHERE clause. |
| T-05-02-05 | Repudiation | progress timestamps | accept | Progress is a non-financial UX state; no audit log needed. Falsified progress would only mislead the coach themselves. |
| T-05-02-06 | Elevation of Privilege | dev skip-for-now in prod | mitigate | Footer link guarded by `process.env.NODE_ENV !== 'production'` check at render time; production builds tree-shake the branch. |
| T-05-02-07 | Information Disclosure | demo lead email | mitigate | Demo email uses non-deliverable domain `@sonorous.test` per CONTEXT.md Specifics. Accidental send to it fails loudly at SMTP. |
| T-05-02-08 | Tampering | onboarding step skipping | mitigate | `/onboarding/[step]/page.tsx` server-redirects to `nextIncompleteStep` if URL step ≠ next required step. Cannot jump ahead. |
| T-05-02-09 | Information Disclosure | onboarding_progress JSON shape | mitigate | Zod schema in `packages/shared/` validates writes; RLS scopes reads to own coach. |
</threat_model>

<verification>
- `pnpm --filter web exec tsc --noEmit` — zero errors
- Unit tests pass for seedDemoLeadForCoach (idempotency), demo-approve (no Gmail send), complete-step (server-side gates)
- E2E test (Plan 05-04 `onboarding-completion.spec.ts`) covers the full golden path
- Manual checkpoint stopwatch: under 15 minutes from invite to dashboard
- Manual: demo lead absent from default lead list
- Manual: 7-day banner dismissal verified
- Manual: production build has no skip-for-now link
- `/impeccable audit` against all onboarding components (Plan 05-05)
</verification>

<success_criteria>
- VOICE-005 satisfied: voice model builder UI guides coaches through uploading examples during onboarding (Step 2)
- Phase 5 exit criterion "New coach can complete onboarding (Gmail → voice → first lead) in under 15 minutes" achieved
- Demo lead `external_ids.demo = true` invariant holds (idempotent seed, soft-archive on approve, never re-creates)
- Demo Approve provably does not call Gmail send API (unit test + grep gate)
- 7-day permanent banner dismiss works (server-side check)
- Admin onboarding column visible on `/admin` per D-10
</success_criteria>

<output>
After completion, create `.planning/phases/05-polish/05-02-SUMMARY.md` summarizing:
- 17 files created (incl. 4 step components, 3 API routes, schemas, hooks)
- 3 files modified (`(dashboard)/layout.tsx`, `CoachRosterTable.tsx`, the lead-list query file)
- Confirmation that demo lead does not appear in default lead list
- Stopwatch result from human-verify checkpoint (target: < 15 min)
- Any deferred edge cases (e.g., what happens if Gmail OAuth times out mid-step)
</output>

## Dependencies

- **Hard depends on Plan 05-03 (Settings consolidation):** Plan 05-03 owns the schema migration `20260520000004_phase5_polish.sql` which adds `coaches.onboarding_completed_at` and `coaches.onboarding_progress`. This plan reads/writes those columns extensively. The migration MUST be pushed live before this plan's APIs ship. Wave ordering: **Plan 05-03 (Wave 1) → Plan 05-02 (Wave 2)**.
- **Soft depends on Plan 05-03 component lifts:** StepVoice and StepNotifications reuse the lifted components from `/settings/voice` and `/settings/notifications`. If Plan 05-03 hasn't lifted them yet at execute time, import directly from current `/settings/{voice,notifications}/page.tsx` clients; later refactor to the lifted location.
- **Does not block:** Plan 05-01 (parallel-safe — zero `files_modified` overlap).
- **Blocks:** Plan 05-04 (`onboarding-completion.spec.ts` exercises this flow end-to-end).

## Risks + Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Phase 4 advisory-lock RPC rejects direct status='sent' write on demo drafts (Assumption A3) | Service-role bypass + `external_ids->>'demo' = 'true'` filter in demo-approve route | Add a new RPC `approveDemoDraft` if direct write is impossible |
| Lead-list query already filters by external_ids in a non-obvious way (Pitfall 5) | Audit lead-list query during implementation; document file modification | If filter cannot be cleanly added, generate column `is_demo` and migrate filter |
| `voice_model.examples` stored under different JSONB key than assumed (Assumption A4) | Verify exact key by reading Phase 2 SUMMARYs before implementing voice gate | One-line update to the gate query |
| Onboarding redirect loop (Pitfall 6) | Route group `(onboarding)/` sibling-to `(dashboard)/`, not nested; Playwright assertion in 05-04 | Re-namespace route group, add cycle-break in dashboard layout |
| Coach abandons mid-wizard, never returns, banner nags indefinitely | 7-day server-side permanent dismiss via `created_at` check | Already mitigated |
