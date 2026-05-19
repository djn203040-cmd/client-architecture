# Project State — The Client Architecture

> Updated at each phase transition. Current state is always the source of truth.

---

## Current Status

**Stage:** Phase 2 planned — ready to execute
**Active phase:** Phase 2 — Intelligence (PLANNED — 5 plans, 4 waves)
**Current wave:** Not started
**Date:** 2026-05-19

---

## What's Done

| Artifact | Status | Notes |
|----------|--------|-------|
| PROJECT.md | ✅ Complete | Core product definition, constraints, key decisions |
| config.json | ✅ Complete | GSD config — YOLO mode, Sonnet, parallel execution |
| research/STACK.md | ✅ Complete | Stack decisions verified against official docs |
| research/FEATURES.md | ✅ Complete | Feature breakdown by category |
| research/ARCHITECTURE.md | ✅ Complete | Monorepo, schema, Inngest, Gmail patterns |
| research/PITFALLS.md | ✅ Complete | Top 10 gotchas with mitigations |
| research/SUMMARY.md | ✅ Complete | Distilled findings, table stakes, anti-features |
| REQUIREMENTS.md | ✅ Complete | Full REQ-IDs across 10 categories |
| ROADMAP.md | ✅ Complete | 5 phases with exit criteria and REQ-ID coverage |
| STATE.md | ✅ Complete | This file |

---

## In Progress

| Artifact | Status |
|----------|--------|
| Phase 1 Wave 1 — Plan 01-01 (Monorepo setup) | ✅ Complete (2026-05-05) |
| Phase 1 Wave 2 — Plan 01-02 (Supabase schema) | ✅ Complete (2026-05-05) — ktxgtpvilrydmedvzgft (eu-central-1) |
| Phase 1 Wave 3 — Plan 01-03 (Auth + invite flow) | ✅ Complete (2026-05-05) |
| Phase 1 Wave 4 — Plan 01-04 (Lead management) | ✅ Complete (2026-05-07) |
| Phase 1 Wave 4 — Plan 01-05 (Gmail OAuth) | ✅ Complete (2026-05-07) — HEALTH-008 verification pending Daniel |
| Phase 1 Wave 6 — Plan 01-06 (Coach dashboard) | ✅ Complete (2026-05-07) — AppShell, SidebarNav, DraftQueue, IntegrationHealthCard, Realtime. Impeccable audit 19/20. |
| Phase 1 Wave 7 — Plan 01-07 (Admin dashboard) | ✅ Complete (2026-05-07) — AdminShell, CoachRosterTable, CreateCoachSheet, SystemHealthPanel, CoachDetailDrawer, API routes. type-check clean. 4 e2e passing. |

---

## Key Decisions Made

| Decision | Status |
|----------|--------|
| Inngest over n8n | Locked |
| Gmail API sends AS coach | Locked |
| Fireflies + Zoom transcripts at launch | Locked |
| `call_completed` as distinct lead state | Locked |
| Smart auto-pause (no manual toggles) | Locked |
| AI drafts replies to lead inbound emails | Locked |
| Unsubscribe enforcement (CAN-SPAM) | Locked |
| Hard bounce → pause + notify coach | Locked |
| Integration health card (small, lights red on failure) | Locked |
| Draft regen + inline editing | Locked |
| Email thread view in dashboard (Phase 2) | Locked |
| Instagram scaffolded early, functionality Phase 2+ | Locked |
| All 7 calendar providers (unified abstraction) | Locked |
| Turborepo monorepo (4 packages) | Locked |

---

## Open Questions

| Question | Owner | Phase |
|----------|-------|-------|
| Validate Setmore, MS Bookings, TidyCal no-show webhook availability | Research during Phase 3 | 3 |
| Google OAuth app review timeline — must exit Testing mode before launch | Start in Phase 1 | 1 |
| Voice model example selection UX — category-guided or free-form paste? | Validate with Daniel before Phase 2 | 2 |
| Instagram API — confirm scaffolding approach with Meta review requirements | Phase 1 | 1 |

---

## Phase History

| Phase | Completed | Notes |
|-------|-----------|-------|
| Phase 1 — Foundation | 2026-05-07 | Monorepo, Supabase schema, auth, lead management, Gmail OAuth, coach dashboard (19/20 impeccable), admin dashboard. All exit criteria met. |
| Phase 2 — Intelligence | PLANNED 2026-05-19 | 5 plans (02-01 voice model, 02-02 transcripts, 02-03 AI engine, 02-04 regen, 02-05 thread view). 4 waves. All 23 requirement IDs covered. Ready to execute. |

---

*State version: 1.0 — 2026-05-05*
