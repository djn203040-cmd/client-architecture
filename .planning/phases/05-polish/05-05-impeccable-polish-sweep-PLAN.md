---
phase: 05-polish
plan: 05
type: execute
wave: 4
depends_on: [05-01, 05-02, 05-03, 05-04]
files_modified:
  - .planning/phases/05-polish/impeccable/
  - .planning/phases/05-polish/IMPECCABLE-SUMMARY.md
autonomous: false
requirements: []

must_haves:
  truths:
    - "Every .tsx file under apps/web/components/ has been run through /impeccable audit"
    - "Each audit result is committed at .planning/phases/05-polish/impeccable/{ComponentName}.md"
    - "Aggregate IMPECCABLE-SUMMARY.md lists every component, its score, and any deferred YELLOWs with reasons"
    - "All RED findings are fixed (or component is removed)"
    - "Every YELLOW finding is either fixed or explicitly deferred with a documented reason"
    - "DraftCard.tsx re-validates at >= 19/20 after Phase 4 modifications"
    - "Phase 5 new components (modules/, onboarding/, settings sections) all pass before Phase 5 ships"
  artifacts:
    - path: ".planning/phases/05-polish/impeccable/"
      provides: "Per-component audit results"
    - path: ".planning/phases/05-polish/IMPECCABLE-SUMMARY.md"
      provides: "Aggregate scoreboard"
      contains: "Total components audited"
  key_links:
    - from: ".planning/phases/05-polish/IMPECCABLE-SUMMARY.md"
      to: ".planning/phases/05-polish/impeccable/{ComponentName}.md"
      via: "links + scores in summary table"
      pattern: "impeccable/.*\\.md"
---

<objective>
Run `/impeccable audit` against every component under `apps/web/components/` and commit per-component results plus an aggregate summary. Fix every RED finding. Either fix or explicitly defer every YELLOW finding with a documented reason. Re-validate `DraftCard.tsx` at its Phase 1 score of 19/20 after Phase 4 modifications.

Purpose: Phase 5 exit criterion "All components pass `/impeccable audit`" — gating step before launch. This is the final quality gate; nothing ships with un-addressed RED findings.

Output:
- One audit results file per component: `.planning/phases/05-polish/impeccable/{ComponentName}.md`
- Aggregate `.planning/phases/05-polish/IMPECCABLE-SUMMARY.md` with score table
- Any code fixes for RED findings (committed alongside the audit run)
- Documented deferrals for YELLOWs that won't ship a fix in Phase 5
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
@.planning/phases/05-polish/05-01-SUMMARY.md
@.planning/phases/05-polish/05-02-SUMMARY.md
@.planning/phases/05-polish/05-03-SUMMARY.md
@.planning/phases/05-polish/05-04-SUMMARY.md
@CLAUDE.md
@.planning/phases/01-foundation/01-CONTEXT.md

<interfaces>
<!-- Component inventory (from RESEARCH.md Workstream 5 + Phase 5 plans 01-03 outputs).
     Run a fresh inventory at execute time — these directories existed at planning time. -->

Existing component directories:
- apps/web/components/admin/        (CoachRosterTable, CreateCoachSheet, SystemHealthPanel, etc.)
- apps/web/components/auth/         (Phase 1 auth primitives)
- apps/web/components/dashboard/    (AppShell, integration cards, OnboardingBanner [Plan 02])
- apps/web/components/drafts/       (DraftCard, DraftQueueScaffold, InlineDraftEditor, HeldDraftActions, CelebrationEmptyState)
- apps/web/components/health/       (IntegrationHealthCard)
- apps/web/components/integrations/ (per-integration cards)
- apps/web/components/leads/        (lead list, profile, timeline, notes)
- apps/web/components/settings/     (Phase 5 — ProfileSection, NotificationsSection, AutonomousSection, VoiceSection, IntegrationsSection, DangerZone, SettingsNav, NotificationMatrix, AutonomousModeCard, VoiceBuilderClient, etc.)
- apps/web/components/shell/        (SidebarNav, ThemeToggle, etc.)
- apps/web/components/ui/           (shadcn primitives — audit lightly; these are upstream-maintained)
- apps/web/components/modules/      (Phase 5 — HeroSection, WhatItIs, HowItWorks, WhyItMatters, SocialProofSection, CtaSection, CalBookingEmbed, RevealOnScroll)
- apps/web/components/onboarding/   (Phase 5 — WizardShell, StepIndicator, StepGmail, StepVoice, StepFirstLead, StepNotifications, DemoLeadDraft)

<!-- Audit gating rules — locked per D-21 + CONTEXT.md Specifics -->
- RED finding: must fix before shipping. No exceptions.
- YELLOW finding: must EITHER fix OR document the deferral with a stated reason in IMPECCABLE-SUMMARY.md.
- GREEN finding: nothing required.
- Score target: every component >= the equivalent of "no RED, ≤1 deferred YELLOW per component."
- DraftCard.tsx baseline: 19/20 from Phase 1. Re-run must produce >= 19/20.

<!-- IMPECCABLE-SUMMARY.md table schema -->
| Component | Path | Score | RED count | YELLOW (fixed) | YELLOW (deferred) | Notes |
|-----------|------|-------|-----------|----------------|-------------------|-------|

<!-- Deferred YELLOW format in summary -->
> Component: foo.tsx
> Deferred: <finding> — Reason: <one-line reason>. Owner: Phase 6 or backlog.
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Inventory components, run /impeccable audit against each, commit per-component result files</name>
  <files>.planning/phases/05-polish/impeccable/*.md</files>
  <action>
1. Inventory current components:
```bash
find apps/web/components -type f \( -name "*.tsx" -o -name "*.ts" \) | grep -v ".test." | grep -v ".stories." | sort
```
   Capture the full list. Expected count per RESEARCH.md: ~25 components. Phase 5 adds approximately 22 more (7 modules + 7 onboarding + 7 settings sections + OnboardingBanner). Total ≈ 47 audit targets.

2. Create the output directory:
```bash
mkdir -p .planning/phases/05-polish/impeccable
```

3. For each component file, invoke the `/impeccable audit` skill. The audit produces a structured result with:
   - Component name
   - File path
   - Score (n/20 or similar — match Phase 1 DraftCard.tsx baseline format)
   - Findings: RED / YELLOW / GREEN categorized
   - Recommendations

4. Write each audit result to `.planning/phases/05-polish/impeccable/{ComponentName}.md`. Use the exact component basename (e.g. `DraftCard.tsx` → `DraftCard.md`).

5. **Batching strategy** — to fit ~47 audits inside a single context window without quality loss, batch by directory:
   - Batch A: `components/shell/` + `components/auth/` + `components/ui/` (small/stable; audit lightly for ui/ since shadcn primitives are upstream)
   - Batch B: `components/admin/` + `components/health/` + `components/integrations/`
   - Batch C: `components/leads/` + `components/dashboard/`
   - Batch D: `components/drafts/` (re-validate DraftCard.tsx ≥ 19/20)
   - Batch E: `components/settings/` (Phase 5 new + lifted)
   - Batch F: `components/modules/` (Phase 5 new)
   - Batch G: `components/onboarding/` (Phase 5 new)

   Each batch can run as a separate /impeccable audit invocation. Between batches, commit the results so the working tree doesn't accumulate unstaged audits.

6. **Findings classification** per `/impeccable audit` rubric (from `.claude/skills/impeccable/`):
   - **RED** — security issue (e.g., XSS, leaked secret, RLS bypass), accessibility blocker (no keyboard nav, no labels), broken contract (component prop type mismatch with consumers), or component over 200 lines (CLAUDE.md hard rule).
   - **YELLOW** — taste/polish issues, minor a11y improvements, sub-optimal patterns that work but aren't ideal.
   - **GREEN** — passes cleanly.

7. **Special re-validation for DraftCard.tsx** (Phase 1 baseline = 19/20):
   - Phase 4 modified DraftCard with variant/surface props and Held tab behaviors.
   - Run the audit. If score drops below 19/20, identify the regression and fix it in this plan (DraftCard.tsx itself — coordinate with Phase 4 contributors if a behavioral change is required).
   - Document the new score in the per-component result file.

8. Each per-component file uses this template:
```markdown
# Impeccable Audit — {ComponentName}

**File:** `apps/web/components/{path}/{ComponentName}.tsx`
**Audited:** 2026-05-XX
**Score:** X/20

## Findings

### RED
- {finding} → **Fix:** {what was changed, with file:line reference}

### YELLOW (fixed)
- {finding} → **Fix:** {change}

### YELLOW (deferred)
- {finding} → **Reason:** {one-line justification}. **Owner:** Phase 6 / backlog.

### GREEN
- {summary of what passed}

## Recommendations carried forward
- {anything for follow-up phases}
```

9. **Fix all REDs in this plan.** Edit the components in place. Run the audit again after fixing; expect the RED to clear. If a RED cannot be fixed in Phase 5 (extremely rare), flag it explicitly in IMPECCABLE-SUMMARY.md and confirm Daniel-approval before shipping — it is a launch-blocker by default.

10. **Decision on YELLOWs:** for each YELLOW, decide fix-now vs. defer. Rule of thumb:
    - If fix is <10 lines and obviously low-risk → fix-now.
    - If fix requires broader refactor → defer with reason.
    - All deferrals must be recorded in IMPECCABLE-SUMMARY.md.

11. Per CLAUDE.md design rules — enforce in audits:
    - Glass/frosted cards (`backdrop-blur-md`, `bg-white/10`) on cards
    - Warm uplifting palette — flag any neon green / dark purple / tech-bro accents
    - Components < 200 lines (RED if violated)
    - Server components by default — flag client islands that could be server
    - Error boundaries on major sections
    - Loading + empty states on async/lists
    - No `console.log` of sensitive data (COMPLY-009)
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && test -d .planning/phases/05-polish/impeccable && AUDIT_COUNT=$(find .planning/phases/05-polish/impeccable -name "*.md" | wc -l) && COMPONENT_COUNT=$(find apps/web/components -type f -name "*.tsx" | grep -v ".test." | grep -v ".stories." | wc -l) && echo "Audited: $AUDIT_COUNT / Components: $COMPONENT_COUNT" && test "$AUDIT_COUNT" -ge "$((COMPONENT_COUNT - 5))"</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && test -f .planning/phases/05-polish/impeccable/DraftCard.md && grep -E "Score.*1[9-9]/20|Score.*20/20" .planning/phases/05-polish/impeccable/DraftCard.md</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -v '^#' .planning/phases/05-polish/impeccable/*.md | grep -c "### RED" | { read total; if [ "$total" -gt 0 ]; then echo "Found $total component(s) with RED — verify ALL have a 'Fix:' line"; grep -A 3 "### RED" .planning/phases/05-polish/impeccable/*.md | grep -B 1 "Fix:" | wc -l; fi }</automated>
  </verify>
  <done>
    Per-component audit result file exists for ≥ (component_count - 5) components (5-component buffer covers shadcn ui/ skipping). DraftCard.tsx scores >= 19/20. Every RED finding has a corresponding Fix: line. No un-actioned RED remains.
  </done>
</task>

<task type="auto">
  <name>Task 2: Aggregate IMPECCABLE-SUMMARY.md scoreboard + deferred-YELLOW registry</name>
  <files>.planning/phases/05-polish/IMPECCABLE-SUMMARY.md</files>
  <action>
1. Walk the `.planning/phases/05-polish/impeccable/` directory and aggregate into `IMPECCABLE-SUMMARY.md`:

```markdown
# Phase 5 Impeccable Sweep — Summary

**Completed:** 2026-05-XX
**Total components audited:** N
**Components with no findings:** M
**Components with fixed YELLOWs:** P
**Components with deferred YELLOWs:** Q
**Components with RED findings (all fixed):** R

## Score Table

| Component | Path | Score | RED (fixed) | YELLOW (fixed) | YELLOW (deferred) | Audit |
|-----------|------|-------|-------------|----------------|-------------------|-------|
| DraftCard | apps/web/components/drafts/DraftCard.tsx | 19/20 | 0 | 0 | 1 | [link](./impeccable/DraftCard.md) |
| ... | ... | ... | ... | ... | ... | ... |

## Deferred YELLOWs Registry

> Every deferred YELLOW listed here MUST appear in the per-component audit file with the same reason.

### {ComponentName}.tsx
- **Finding:** {one-line summary of the YELLOW}
- **Reason for deferral:** {one-line justification — e.g. "Requires shared keyboard-shortcut helper not yet built; track for Phase 6"}
- **Owner:** Phase 6 / backlog / never

(repeat for every deferred YELLOW across all components)

## Re-validations

### DraftCard.tsx
- Phase 1 baseline: 19/20
- Phase 5 re-audit: X/20
- Delta explanation: {if dropped, what changed and how it was restored; if same, "no regression observed"; if better, "improvement noted"}

## Launch readiness statement

All RED findings have been resolved. {N} YELLOW findings remain as documented deferrals.
This phase's components meet the CLAUDE.md /impeccable audit gating bar.
```

2. Verify the summary's score table has one row per audit file in `impeccable/`.

3. Verify every deferred YELLOW in the registry corresponds to an entry in at least one per-component audit file (and vice versa — no per-component YELLOW deferral is missing from the registry).

4. Update STATE.md or .planning/RETROSPECTIVE.md (if it exists) with a note that Phase 5 Impeccable sweep completed.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && test -f .planning/phases/05-polish/IMPECCABLE-SUMMARY.md && grep -q "## Score Table" .planning/phases/05-polish/IMPECCABLE-SUMMARY.md && grep -q "## Deferred YELLOWs Registry" .planning/phases/05-polish/IMPECCABLE-SUMMARY.md && grep -q "DraftCard" .planning/phases/05-polish/IMPECCABLE-SUMMARY.md</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && AUDITS=$(find .planning/phases/05-polish/impeccable -name "*.md" | wc -l) && TABLE_ROWS=$(awk '/## Score Table/,/## Deferred/' .planning/phases/05-polish/IMPECCABLE-SUMMARY.md | grep -c "^|" | awk '{print $1 - 2}') && echo "Audits: $AUDITS, Table rows: $TABLE_ROWS" && test "$TABLE_ROWS" -ge "$AUDITS"</automated>
  </verify>
  <done>
    IMPECCABLE-SUMMARY.md exists with a row per audit, deferred-YELLOWs registry, re-validation section for DraftCard.tsx, and a launch-readiness statement.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Launch-readiness review</name>
  <what-built>
    - Full Impeccable sweep across all apps/web/components
    - Per-component audit files committed
    - Aggregate IMPECCABLE-SUMMARY.md with score table and deferred-YELLOW registry
    - All RED findings fixed
    - DraftCard.tsx re-validated >= 19/20
  </what-built>
  <how-to-verify>
    1. Open `.planning/phases/05-polish/IMPECCABLE-SUMMARY.md`.
    2. Confirm "Components with RED findings (all fixed): R" — the row counts what was fixed, and the deferred-YELLOW registry confirms no RED was deferred.
    3. Scan the score table — flag any score below the team's expected bar (e.g., < 16/20).
    4. Open `.planning/phases/05-polish/impeccable/DraftCard.md` — confirm score >= 19/20.
    5. For each deferred YELLOW, read the reason. If any reason is unconvincing ("we'll get to it later" without rationale), push back and request a fix-now.
    6. Spot-check 3–5 random components from the score table:
       - Open the audit file.
       - Read the findings.
       - Open the actual component source. Confirm any "fixed" finding's code change is present.
    7. Visit `/dashboard`, `/leads`, `/drafts`, `/settings`, `/modules/threshold`, `/modules/continuation`, and `/onboarding/gmail` in dev mode. Confirm everything renders cleanly — no visual regressions from the audit-driven fixes.
    8. Confirm "Launch readiness statement" wording in IMPECCABLE-SUMMARY.md is accurate.
  </how-to-verify>
  <resume-signal>Type "approved" or describe any deferrals that should be re-opened as fix-now</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Auditor (Claude) → component source | Read-only inspection. No production data touched. Any code modification is the fix step, gated by the human-verify checkpoint. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-05-01 | Tampering | Audit fixes regress existing behavior | mitigate | All audit-driven fixes must keep Plan 05-04 E2E suite green (re-run after fixes batch). |
| T-05-05-02 | Information Disclosure | Audit notes leak sensitive code patterns | accept | .planning/ is checked into the repo. Same trust boundary as the source code itself. No new exposure. |
| T-05-05-03 | Repudiation | Deferred YELLOWs forgotten | mitigate | All deferrals recorded in IMPECCABLE-SUMMARY.md with owner ("Phase 6 / backlog"). Reviewed in human-verify checkpoint. |
| T-05-05-04 | Elevation of Privilege | Auditor introduces new vulnerability while fixing a YELLOW | mitigate | Each fix re-passes the audit + Plan 05-04 cross-tenant-isolation + webhook-bypass + pre-send safety tests. |
</threat_model>

<verification>
- Every .tsx in apps/web/components/ (excluding ui/ shadcn primitives) has a corresponding .md in .planning/phases/05-polish/impeccable/
- IMPECCABLE-SUMMARY.md aggregates correctly (audit count = table rows)
- Zero un-actioned RED across all per-component files
- DraftCard.tsx score >= 19/20 (Phase 1 baseline preserved or improved)
- Plan 05-04 E2E suite re-runs green after audit-driven fixes
- Human-verify checkpoint passed
</verification>

<success_criteria>
- D-21 satisfied: full Impeccable sweep complete; every component audited; YELLOWs fixed or explicitly deferred
- Phase 5 exit criterion "All components pass /impeccable audit" achieved
- DraftCard.tsx Phase 1 baseline preserved (19/20 minimum)
- Launch-readiness statement in IMPECCABLE-SUMMARY.md affirms gating bar met
</success_criteria>

<output>
After completion, create `.planning/phases/05-polish/05-05-SUMMARY.md` summarizing:
- Total components audited
- Total REDs (all fixed) / YELLOWs (fixed + deferred breakdown)
- DraftCard.tsx re-validation result
- List of deferred YELLOWs flagged for Phase 6 / backlog
- Confirmation that Plan 05-04 E2E suite passes post-fix
- Phase 5 launch-readiness confirmation
</output>

## Dependencies

- **Hard depends on Plans 05-01, 05-02, 05-03:** Cannot audit Phase 5 components until they exist. Components from modules/, onboarding/, and settings/ sections are produced by those plans.
- **Soft depends on Plan 05-04:** E2E suite must be in place so audit-driven fixes can be re-tested without regression. Plans 05-04 and 05-05 are parallel-safe by file ownership but 05-04 should land first for re-verification cycles.
- **Final plan in Phase 5.** Blocks the Phase 5 ship signal.

## Risks + Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| RED finding discovered late requires deep refactor | Allocate context budget for fix-or-defer decision; flag to Daniel if launch-blocking | Daniel-approved short-term mitigation (e.g., temporarily disable the component path) then proper fix in Phase 6 |
| Audit-driven fix regresses E2E suite | Re-run Plan 05-04 specs after every fix batch | Revert the fix; record as deferred YELLOW with reason |
| Component count expands during plan execution | Audit budget scales linearly with batches; commit between batches | Defer audits of trivial components (e.g., pure-display SVG icons) with summary note |
| DraftCard.tsx drops below 19/20 from Phase 4 changes | Re-validation in Task 1 catches it; fix in this plan | If unfixable in Phase 5, escalate to Daniel for an explicit launch waiver |
| Coach-facing string YELLOWs (generic copy) flagged | Premium copy is a CLAUDE.md rule — treat any placeholder-looking text as a YELLOW (or RED if visible to coaches at launch) | Replace with Daniel-supplied copy or hide section pre-launch |
