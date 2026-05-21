---
phase: 06-testing
plan: 03
type: execute
wave: 3
depends_on: [06-01, 06-02]
files_modified:
  - apps/web/app/(admin)/uat/
  - apps/web/components/admin/UatChecklist.tsx
  - apps/web/lib/uat/
  - scripts/seed-uat-staging.ts
  - apps/web/tests/fixtures/voice-corpus/
  - .planning/phases/06-testing/UAT-LOG.md
  - .planning/phases/06-testing/LAUNCH-SIGN-OFF.md
autonomous: false
requirements:
  - "Section 2 of 06-PLAN.md (2.1 through 2.14)"

must_haves:
  truths:
    - "Staging Supabase has a seeded UAT dataset: 3 fake coaches, 10 leads each across all states, 5 drafts each across all statuses, all 7 calendar providers connected"
    - "A real Gmail account is connected on staging for end-to-end OAuth and send testing"
    - "Daniel's actual email corpus is loaded into one test coach's voice model"
    - "/admin/uat route exists, gated to Daniel, surfacing all of 06-PLAN.md §2 as a check-off UI with per-row note field"
    - "UAT-LOG.md captures Daniel's pass/fail + notes for every §2 item"
    - "LAUNCH-SIGN-OFF.md is signed by Daniel with date + a yes/no answer to §2.14"
    - "Every CRITICAL UAT item (voice quality §2.4, approval channels §2.6, aesthetic §2.11, copy §2.13) is GREEN before launch"
  artifacts:
    - path: "scripts/seed-uat-staging.ts"
      provides: "Idempotent seeder that builds the UAT dataset on staging"
    - path: "apps/web/tests/fixtures/voice-corpus/"
      provides: "Synthetic voice-corpus samples + a slot for Daniel's real corpus (gitignored)"
    - path: "apps/web/app/(admin)/uat/page.tsx"
      provides: "Daniel-only UAT checklist UI"
    - path: ".planning/phases/06-testing/UAT-LOG.md"
      provides: "Per-item pass/fail record with Daniel's notes"
    - path: ".planning/phases/06-testing/LAUNCH-SIGN-OFF.md"
      provides: "Final launch authorization document"
  key_links:
    - from: "apps/web/app/(admin)/uat/page.tsx"
      to: ".planning/phases/06-testing/06-PLAN.md (Section 2)"
      via: "checklist items rendered from a single source of truth (apps/web/lib/uat/sections.ts)"
      pattern: "lib/uat/.*\\.ts"
---

<objective>
Section 2 of 06-PLAN.md is the human-judgment gate. Claude can't run it — Daniel must — but Claude can make it easy, fast, and complete by:

1. Seeding a realistic staging environment so Daniel walks through every scenario without manual setup
2. Surfacing the §2 checklist inside `/admin/uat` so Daniel checks items off in the product itself (not a separate doc)
3. Persisting every check + note to UAT-LOG.md
4. Producing LAUNCH-SIGN-OFF.md when §2.14 is answered

This plan does not test the product. It prepares the runway for Daniel's test and captures the result.

Output:
- Idempotent staging seeder
- Voice corpus fixtures (synthetic + slot for Daniel's real corpus)
- `/admin/uat` page with checklist UI, note-taking, and progress persistence
- UAT-LOG.md generated from the UI state
- LAUNCH-SIGN-OFF.md template signed by Daniel
- All 14 §2 subsections walked through and resolved
</objective>

<execution_context>
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/workflows/execute-plan.md
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/06-testing/06-PLAN.md
@.planning/phases/05-polish/IMPECCABLE-SUMMARY.md
@CLAUDE.md

<interfaces>
<!-- Source of truth -->
apps/web/lib/uat/sections.ts exports an array mirroring 06-PLAN.md §2.1–§2.14:
```ts
export const UAT_SECTIONS = [
  { id: '2.1', title: 'First Impression', estMin: 5, critical: false, items: [
    { id: '2.1.1', text: 'Open / in incognito — landing/login feels premium', ... },
    ...
  ]},
  ...
]
```
Treat the markdown file as canonical; the TS array mirrors it. Drift check in CI.

<!-- UI -->
/admin/uat:
- Sidebar: 14 sections with progress %
- Main pane: current section with checkboxes + per-item note textarea + "blocker" toggle
- Bottom: "Generate UAT-LOG.md" button → server action writes the file
- Final section 2.14: yes/no + signature field → generates LAUNCH-SIGN-OFF.md

<!-- Persistence -->
Table `uat_runs(id, started_at, completed_at, signed_off, sign_off_text)`
Table `uat_results(run_id, item_id, status, notes, blocker, updated_at)`
RLS: Daniel-only via email match (same as /admin).

<!-- Staging seed dataset -->
3 coaches:
- coach-alpha@uat.example — has Daniel's real voice corpus loaded
- coach-beta@uat.example — synthetic voice corpus, all integrations connected
- coach-gamma@uat.example — partial setup (Gmail only) — for first-time experience replay
For each coach:
- 10 leads, distributed across all 8 lead states
- 5 drafts in mixed statuses (pending, approved, sent, held, bounced)
- All 7 calendar provider integrations connected with sandbox credentials where the provider supports them; documented stub for ones that don't
- 1 Slack workspace connected to coach-beta for approval channel testing
- 1 Twilio sandbox number for WhatsApp + SMS testing

<!-- Voice corpus slot -->
apps/web/tests/fixtures/voice-corpus/ — gitignored except for README.md and synthetic.json
README explains the slot for Daniel's real corpus. Loader (apps/web/lib/voice/loader.ts) accepts either.

<!-- Critical sections (must be GREEN for launch) -->
§2.4 Voice Model Quality
§2.6 Approval Channels End-to-End
§2.11 Aesthetic & Brand
§2.13 Copy Review
§2.14 Daniel's Personal Sign-Off

<!-- Inherited UAT steps from 06-02 deferrals -->
- Daniel personally enrolls TOTP MFA factor on his admin account (from 06-02 Task 5) — surfaced as a row inside §2.8 of the UAT UI
- Daniel walks Safari iOS OAuth (Gmail) and Chrome Android approval flow from notification (from 06-01 §1.7 deferral) — surfaced as rows inside §2.12 (Mobile)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Staging seeder + voice corpus slots</name>
  <files>scripts/seed-uat-staging.ts, apps/web/tests/fixtures/voice-corpus/, .gitignore</files>
  <action>
1. Write `scripts/seed-uat-staging.ts`:
   - Connects to staging Supabase via service-role (env: STAGING_SUPABASE_URL, STAGING_SUPABASE_SERVICE_ROLE_KEY)
   - Idempotent: detects existing UAT coaches by email pattern `*@uat.example`; truncates and reseeds if `--reset` flag passed, otherwise no-ops on rerun
   - Creates 3 coaches (alpha, beta, gamma) via Supabase Auth admin API + coaches row
   - For each coach, creates 10 leads spanning all lead states (uses factories from 06-01 if shareable; otherwise inline)
   - For each lead, creates 0–3 drafts in mixed statuses (mostly pending for coach-beta to give Daniel UI to interact with)
   - Connects integrations:
     - coach-alpha: Gmail (real OAuth via a dedicated UAT Gmail account — Daniel runs the OAuth manually once, token persists)
     - coach-beta: Gmail + Slack (UAT workspace) + Twilio (sandbox) + all 7 calendars (sandbox where possible)
     - coach-gamma: Gmail only
   - Logs a summary at end: coach count, lead count per state, draft count per status, integrations connected
2. Add `pnpm seed:uat` to root package.json.
3. Create `apps/web/tests/fixtures/voice-corpus/`:
   - `README.md` — explains the slot for Daniel's real corpus, format expected (JSON array of messages), how the loader picks it up
   - `synthetic.json` — 15 plausible coaching emails (use Claude to draft if needed; obvious synthetic provenance noted in the file)
   - `daniel.json` — gitignored. Daniel drops his exported Gmail/LinkedIn corpus here for §2.4 testing.
4. Update `.gitignore`: add `apps/web/tests/fixtures/voice-corpus/daniel.json`.
5. Write `apps/web/lib/voice/loader.ts`: accepts a coach ID, looks for a coach-specific corpus file (e.g. `daniel.json` for coach-alpha if present), falls back to `synthetic.json` for the other coaches.
  </action>
  <verify>
    <automated>test -f scripts/seed-uat-staging.ts && grep -q "uat.example" scripts/seed-uat-staging.ts</automated>
    <automated>test -f apps/web/tests/fixtures/voice-corpus/README.md && test -f apps/web/tests/fixtures/voice-corpus/synthetic.json</automated>
    <automated>grep -q "voice-corpus/daniel.json" .gitignore</automated>
    <automated>test -f apps/web/lib/voice/loader.ts</automated>
  </verify>
  <done>
    Seeder ready, voice corpus slots ready. Running `pnpm seed:uat --reset` on staging produces 3 UAT coaches with full data.
  </done>
</task>

<task type="auto">
  <name>Task 2: UAT checklist source of truth + drift check</name>
  <files>apps/web/lib/uat/sections.ts, apps/web/lib/uat/parse-from-md.ts, .github/workflows/test.yml</files>
  <action>
1. Write `apps/web/lib/uat/sections.ts` with the 14-section array mirroring 06-PLAN.md §2.
   - Each section: `{ id, title, estMin, critical: boolean, items: [{ id, text }] }`
   - Critical flag set for §2.4, §2.6, §2.11, §2.13, §2.14
2. Write `apps/web/lib/uat/parse-from-md.ts`:
   - Parses 06-PLAN.md §2 into the same data shape
   - Exposed as a CLI script `pnpm check:uat-drift` that diffs the markdown's items against `sections.ts` and exits non-zero on mismatch
3. Add CI job `uat-drift` to `.github/workflows/test.yml` running `pnpm check:uat-drift`. Blocks merge on drift.
4. Document the canonical update workflow in `apps/web/lib/uat/README.md`: edit the markdown first; run the drift check; copy diff into sections.ts; commit both together.
  </action>
  <verify>
    <automated>test -f apps/web/lib/uat/sections.ts && grep -E "id: '2\.[0-9]+'" apps/web/lib/uat/sections.ts | wc -l | awk '{ if ($1 >= 14) print "ok"; else print "missing sections" }'</automated>
    <automated>cd "/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches" && pnpm --filter web check:uat-drift 2>&1 | tail -3</automated>
  </verify>
  <done>
    sections.ts mirrors 06-PLAN.md §2. CI gates drift.
  </done>
</task>

<task type="auto">
  <name>Task 3: /admin/uat checklist UI + persistence schema</name>
  <files>apps/web/app/(admin)/uat/page.tsx, apps/web/components/admin/UatChecklist.tsx, supabase/migrations/{ts}_uat_runs.sql, apps/web/app/api/admin/uat/route.ts</files>
  <action>
1. Migration `supabase/migrations/{ts}_uat_runs.sql`:
   ```sql
   create table uat_runs (
     id uuid primary key default gen_random_uuid(),
     started_at timestamptz default now(),
     completed_at timestamptz,
     signed_off boolean default false,
     sign_off_text text
   );
   create table uat_results (
     run_id uuid references uat_runs(id) on delete cascade,
     item_id text not null,
     status text not null check (status in ('pending','pass','fail','skip')),
     notes text,
     blocker boolean default false,
     updated_at timestamptz default now(),
     primary key (run_id, item_id)
   );
   alter table uat_runs enable row level security;
   alter table uat_results enable row level security;
   create policy "daniel only" on uat_runs for all using (auth.jwt() ->> 'email' = 'djn203040@gmail.com');
   create policy "daniel only" on uat_results for all using (auth.jwt() ->> 'email' = 'djn203040@gmail.com');
   ```
2. Build /admin/uat/page.tsx as a server component that loads the active run (or creates one) and the current results.
3. UatChecklist.tsx (client component):
   - Sidebar: 14 sections, progress %, critical badge
   - Active section: items with pass/fail/skip radio, note textarea, blocker toggle
   - Auto-save to /api/admin/uat on change (debounced 800ms)
   - Footer: "Mark section complete" + estimated time vs actual elapsed
   - Section §2.14 special: free-text "yes/no" + signature field
4. API route apps/web/app/api/admin/uat/route.ts: POST upserts a uat_results row; PATCH on uat_runs for sign-off.
5. Apply CLAUDE.md aesthetic: glass cards, warm palette, dark/light mode, no neon. Run /impeccable audit on the new components before completing the task.
  </action>
  <verify>
    <automated>ls supabase/migrations | grep uat_runs</automated>
    <automated>test -f apps/web/app/\(admin\)/uat/page.tsx && test -f apps/web/components/admin/UatChecklist.tsx</automated>
    <automated>test -f apps/web/app/api/admin/uat/route.ts</automated>
    <automated>grep -E "(glass|backdrop-blur|bg-white\/10)" apps/web/components/admin/UatChecklist.tsx | head -3</automated>
  </verify>
  <done>
    /admin/uat live on staging, gated to Daniel, persists pass/fail + notes per item.
  </done>
</task>

<task type="auto">
  <name>Task 4: UAT-LOG.md generator + LAUNCH-SIGN-OFF.md template</name>
  <files>apps/web/app/api/admin/uat/export/route.ts, .planning/phases/06-testing/UAT-LOG.md (template), .planning/phases/06-testing/LAUNCH-SIGN-OFF.md (template)</files>
  <action>
1. Build apps/web/app/api/admin/uat/export/route.ts:
   - GET → renders UAT-LOG.md from the active run (or a specified ?run_id=)
   - Format:
     ```markdown
     # Phase 6 UAT Log
     Run started: {iso}
     Run completed: {iso or "in progress"}
     Sign-off: {yes/no or "pending"}

     ## §2.1 First Impression  — pass/fail summary
     - [x] 2.1.1 ... — pass — notes: "..."
     ...

     ## Blockers (deferred to backlog or fix-now)
     - 2.X.Y — {blocker text} — recorded by Daniel on {iso}
     ```
2. Add a "Download UAT-LOG.md" button to the /admin/uat UI that hits this route and offers the markdown as a download.
3. Write `.planning/phases/06-testing/UAT-LOG.md` as the template head:
   ```markdown
   # Phase 6 UAT Log
   _This file is generated from /admin/uat. To regenerate, hit "Download UAT-LOG.md" in the UI._
   ```
4. Write `.planning/phases/06-testing/LAUNCH-SIGN-OFF.md` as the template:
   ```markdown
   # Phase 6 — Launch Sign-Off

   Section 1 (Automated): {green/red link to CI run}
   Section 2 (Manual UAT): {green/red link to UAT-LOG.md}
   Section 3 (Security): {green/red link to SECURITY-REVIEW.md}

   ## Daniel's §2.14 answers

   > If I handed this to a coach paying $X/month today, would I be proud?

   {Daniel writes yes/no + 1–3 sentences here}

   > Is there anything I'd want to fix before any real human sees this?

   {Bullet list. Empty list = launch authorized.}

   ## Launch authorization

   Signed: ___________________________   Date: __________

   ## Witness (optional)

   Signed: ___________________________   Date: __________
   ```
5. Commit both templates.
  </action>
  <verify>
    <automated>test -f apps/web/app/api/admin/uat/export/route.ts</automated>
    <automated>test -f .planning/phases/06-testing/UAT-LOG.md && test -f .planning/phases/06-testing/LAUNCH-SIGN-OFF.md</automated>
    <automated>grep -q "Daniel's §2.14 answers" .planning/phases/06-testing/LAUNCH-SIGN-OFF.md</automated>
  </verify>
  <done>
    Export route returns a UAT-LOG.md snapshot. Templates committed. Daniel can save the snapshot back to the repo when complete.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5: Daniel walks Section 2 of 06-PLAN.md</name>
  <what-built>
    - Seeded staging with 3 coaches, integrations, leads, drafts
    - Voice corpus slot for Daniel's real corpus
    - /admin/uat checklist UI with persistence
    - UAT-LOG.md + LAUNCH-SIGN-OFF.md templates
  </what-built>
  <how-to-verify>
    1. Run `pnpm seed:uat --reset` against staging Supabase.
    2. Drop your real voice corpus into `apps/web/tests/fixtures/voice-corpus/daniel.json` and re-trigger the voice-model rebuild for coach-alpha.
    3. Sign in to staging as Daniel; open `/admin/uat`.
    4. Walk every section 2.1 → 2.14 in order, exactly as written in 06-PLAN.md. Treat the staging dataset as if you'd never seen it.
    5. Use the note field generously. Flag any blocker.
    6. Critical sections (2.4 Voice Quality, 2.6 Approval Channels, 2.11 Aesthetic, 2.13 Copy) must end GREEN. If any are not, file a fix-now ticket and re-walk that section after fix.
    7. Section 2.14: answer the two questions in the sign-off card. If "no" or there's any item on the "fix before any human sees this" list, do NOT sign — return to fix.
    8. When everything is green and 2.14 is "yes" with an empty fix list: click "Generate UAT-LOG.md", download, commit to repo at `.planning/phases/06-testing/UAT-LOG.md`.
    9. Fill in `.planning/phases/06-testing/LAUNCH-SIGN-OFF.md` with your signature + date.
    10. Verify CI is green on `main` (06-01 Section 1 outputs) and SECURITY-REVIEW.md is clean (06-02 Section 3 outputs).
    11. Commit the signed LAUNCH-SIGN-OFF.md. This is the launch authorization artifact.
  </how-to-verify>
  <resume-signal>Type "launch authorized" + paste your signed LAUNCH-SIGN-OFF.md, or list specific items still pending</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Daniel → staging app | Daniel-only RLS on uat_runs + uat_results. Staging Supabase isolated from production. |
| Staging Gmail/Slack/Twilio | Sandbox or dedicated UAT accounts. No real coach or lead data ever touches staging. |
| Voice corpus → repo | Daniel's real corpus is gitignored. Synthetic corpus is committed but obviously labeled. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-03-01 | Information Disclosure | Daniel's voice corpus committed to git | mitigate | `.gitignore` excludes `daniel.json`. CI scan via gitleaks (from 06-02) catches accidental commit. |
| T-06-03-02 | Tampering | Test data leaks into production | mitigate | Seeder hard-coded to require `STAGING_*` env vars; refuses to run against production hostname. |
| T-06-03-03 | Repudiation | Daniel later disputes a sign-off entry | mitigate | uat_results updated_at + signed LAUNCH-SIGN-OFF.md committed to git history. |
| T-06-03-04 | Elevation of Privilege | Non-Daniel reaches /admin/uat | mitigate | Same email + role gate as /admin. RLS policy on uat_runs/results scoped to Daniel email. |
</threat_model>

<verification>
- Staging seeder runs idempotently and produces the documented dataset
- /admin/uat renders all 14 sections from sections.ts
- CI gates drift between 06-PLAN.md §2 and sections.ts
- uat_runs + uat_results tables RLS-locked to Daniel
- UAT-LOG.md export route returns a complete log
- LAUNCH-SIGN-OFF.md template committed
- Human-verify checkpoint passed (Daniel signs LAUNCH-SIGN-OFF.md)
</verification>

<success_criteria>
- Section 2 of 06-PLAN.md is fully walked, recorded, and resolved
- Every critical UAT section ends GREEN
- LAUNCH-SIGN-OFF.md is signed and committed
- Daniel's answer to "would I be proud to hand this to a paying coach today?" is YES
</success_criteria>

<output>
After completion, create `.planning/phases/06-testing/06-03-SUMMARY.md`:
- Staging seed run timestamp + dataset summary
- /admin/uat shipping confirmation + first UAT run start
- UAT-LOG.md final state — pass/fail per section
- Critical sections status
- Any blockers raised and how they were resolved
- LAUNCH-SIGN-OFF.md commit hash
- Launch authorization confirmation (yes/no)
</output>

## Dependencies

- **Hard depends on 06-01:** voice-corpus loader and factories may share modules with the 06-01 fixtures package. Coordinate test-utils.
- **Hard depends on 06-02:** /admin/uat needs the audit_log, rate limits, security headers, and Daniel-only middleware that 06-02 hardens.
- **Final plan in Phase 6.** This is the launch gate.

## Risks + Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Voice quality §2.4 lands below 7/10 average | Allocate corpus tuning time in this plan; re-run with more examples; adjust prompt templates | Defer launch until §2.4 passes; not negotiable |
| All 7 calendar providers can't be sandbox-tested before launch | Test the 2–3 Daniel's initial coaches use; flag remaining providers as "Claude-tested, real-world verification pending" in UAT-LOG.md | Mark untestable providers as a Phase 7 backlog item |
| Daniel discovers a blocker in §2.6 (approval channels) | Fix-now ticket; re-run §2.6 specifically after fix | If structural, scope down launch to fewer channels and document |
| Aesthetic §2.11 reveals broad polish gaps | Triage with Daniel: must-fix vs Phase 7 polish | Selectively re-run /impeccable audit on flagged components |
| Daniel runs out of time before walking all 14 sections | Section ordering puts critical sections first; non-critical (mobile §2.12, locked modules §2.9) can be walked post-launch with a fix-by date | Defer non-critical sections to a 7-day post-launch UAT pass |
