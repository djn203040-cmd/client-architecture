---
phase: 07-call-outcomes
plan: 04
subsystem: ui
tags: [nextjs, react, framer-motion, supabase-realtime, tailwind, shadcn]

# Dependency graph
requires:
  - phase: 07-01
    provides: call_outcomes table + realtime publication + call_converted enum
  - phase: 07-03
    provides: PATCH /api/call-outcomes/[id] endpoint the cards POST to
provides:
  - /calls SSR queue page (Awaiting / Upcoming / History tabs, realtime, glass cards)
  - useCallOutcomeRealtime hook (cloned from useDraftRealtime)
  - CallOutcomeCard (3 outcome buttons) + readonly variant + CallQueueSkeleton
  - CallCelebrationEmptyState (per-bucket celebration empty states)
  - LeadCallOutcomePanel (lead-profile inline outcome + converted Module 2 CTA)
  - call_converted timeline icon + label; /calls sidebar nav item
affects: [deployment, manual-uat]

tech-stack:
  added: []
  patterns:
    - "Queue UI mirrors the drafts feature: SSR initial load + realtime hook + AnimatePresence card stack"
    - "Per-status realtime buckets (one subscription per tab)"

key-files:
  created:
    - apps/web/app/(dashboard)/calls/page.tsx
    - apps/web/components/calls/CallQueueScaffold.tsx
    - apps/web/components/calls/CallOutcomeCard.tsx
    - apps/web/components/calls/call-outcome-realtime.tsx
    - apps/web/components/calls/CallCelebrationEmptyState.tsx
    - apps/web/components/leads/LeadCallOutcomePanel.tsx
  modified:
    - apps/web/components/shell/SidebarNav.tsx
    - apps/web/app/(dashboard)/leads/[id]/page.tsx
    - apps/web/components/leads/LeadEventIcon.tsx
    - apps/web/app/(dashboard)/leads/[id]/activity-timeline.tsx

key-decisions:
  - "Three tabs split by lifecycle status (awaiting_outcome / scheduled / resolved) — D-19"
  - "Converted lead shows the quiet Module 2 CTA inline on the profile (presentational only, never gates contactability) — D-01/D-20"
  - "call_converted rendered with a distinct Trophy/Sparkle icon + 'Converted to client' label"

patterns-established:
  - "useCallOutcomeRealtime: coach+status(+leadId)-scoped postgres_changes subscription with INSERT/UPDATE/DELETE bucket merge"

requirements-completed: [CALL-004, CALL-005, CALL-013]

duration: ~50min (incl. impeccable audit + polish pass)
completed: 2026-06-03
---

# Phase 7 — Plan 07-04: /calls Queue + Lead Panel Summary

**The coach-facing decision surface for call outcomes — a live `/calls` queue (Awaiting/Upcoming/History) and an inline lead-profile panel, both posting to the 07-03 endpoint, with a converted-lead Module 2 invitation.**

## Status: CODE COMPLETE — manual walkthrough DEFERRED to next session

All code tasks (1 + 2) are implemented, committed, and typecheck-clean. Task 3's `/impeccable audit` was run by the orchestrator (score 16/20, Good) and its mechanical findings were fixed and committed. The **manual dashboard walkthrough** half of Task 3 was NOT completed — it requires a logged-in coach session against seeded `call_outcomes` data, which is only meaningful once Phase 7 is deployed and a real booking flows through. It is the subject of the next resume-point.

## Task Commits

1. **Task 1: /calls queue + realtime hook + CallOutcomeCard + empty/skeleton + sidebar nav** — `c6cddcb` (feat)
2. **Task 2: LeadCallOutcomePanel + converted Module 2 CTA + call_converted timeline icon/label** — `e825ae9` (feat)
3. **Task 3 (audit fixes): reduced-motion, no-em-dash, DRY tab panels** — `ad40881` (polish)

(Also: `call_converted` placeholder map entry added to LeadEventIcon during 07-01's `8618b08`, finalized to Trophy here.)

## Impeccable Audit — 16/20 (Good)

| Dimension | Score | Note |
|-----------|-------|------|
| Accessibility | 3 | ARIA tabs/cards, 44px targets, focus rings, aria-live. Gap: no arrow-key roving tabindex on tablist. |
| Performance | 3 | GPU-only transforms. 3 realtime channels (one per bucket) — redundant but negligible at current scale. |
| Theming | 3 | Full tokens + dark parity. Converted-gold oklch(80% 0.14 85) hard-coded in 3 files (wants a --celebrate token). |
| Responsive | 4 | flex-col→sm:flex-row stacking, capped measures. |
| Anti-patterns | 3 | On-brand; glass is the documented elevation system, not slop. |

**Fixes applied (`ad40881`):** CallOutcomeCard entrance now respects prefers-reduced-motion; em dash removed from /calls subtitle (Module 2 CTA em dash kept — CLAUDE.md mandates that exact string); shared ReadonlyTabPanel extracted (DRY).

**Deferred (deliberate — design-system calls for the operator):** extract `--celebrate` gold token; consolidate 3 realtime channels into 1; arrow-key tablist navigation.

## Playwright pass

- `/calls` → 307 → /login (route compiles, auth gate intact, no runtime 500).
- `/login` renders 200 with zero console errors in BOTH light and dark — theme parity + warm tokens verified on the shared shell.
- Authed `/calls` UI (cards/tabs/realtime) NOT captured — needs coach login + seeded data (the deferred manual walkthrough).

## Self-Check: PASSED (code) / PENDING (manual walkthrough + deploy)
