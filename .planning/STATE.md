# Project State — The Client Architecture

> Updated at each phase transition. Current state is always the source of truth.

---

## Current Status

**Stage:** Phase 1 execution in progress
**Active phase:** Phase 1 — Foundation
**Current wave:** Wave 3 (Plan 01-03: Auth + invite flow)
**Date:** 2026-05-05

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

## What's Not Started

| Artifact | Blocked on |
|----------|-----------|
| Phase 1 Plans 01-02 through 01-07 | Plan 01-01 completion |
| Any production code | Wave 1 completion |

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
| — | — | No phases completed yet |

---

*State version: 1.0 — 2026-05-05*
