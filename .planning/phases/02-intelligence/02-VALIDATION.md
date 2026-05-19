---
phase: 2
slug: intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter apps/web test run tests/unit/` |
| **Full suite command** | `pnpm --filter apps/web test run` |
| **Type check** | `pnpm type-check` |
| **Estimated runtime** | ~30 seconds (unit), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter apps/web test run tests/unit/`
- **After every plan wave:** Run `pnpm --filter apps/web test run && pnpm type-check`
- **Before `/gsd-verify-work`:** Full suite green + `pnpm type-check` clean
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-T01 | 01 | 1 | VOICE-001 | — | VoiceProfileSchema rejects missing fields | unit | `pnpm --filter apps/web test run tests/unit/voice-profile-schema.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-T01 | 02 | 2 | TRANS-007 | T-webhook-spoof | Fireflies HMAC rejects tampered payload | unit | `pnpm --filter apps/web test run tests/unit/webhook-verification.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-T02 | 02 | 2 | TRANS-007 | T-webhook-spoof | Zoom signature rejects invalid x-zm-signature | unit | `pnpm --filter apps/web test run tests/unit/webhook-verification.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-T01 | 03 | 3 | AI-002 | T-apikey-leak | ai-engine import throws in browser context | unit | `pnpm --filter apps/web test run tests/unit/ai-engine-guard.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-T02 | 03 | 3 | AI-004 | — | countTokens() called; truncation applied if over budget | unit | `pnpm --filter apps/web test run tests/unit/token-counter.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-T03 | 03 | 3 | AI-007 | — | confidence_level: 'low' set when examples < 8 | unit | `pnpm --filter apps/web test run tests/unit/confidence-indicator.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-T04 | 03 | 3 | AI-016 | T-hard-block | isHardBlocked returns true for unsubscribed/do_not_contact/bounced | unit | `pnpm --filter apps/web test run tests/unit/ai-guardrails.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-T05 | 03 | 3 | AI-001 | T-cross-coach | assertCoachIdScope rejects mismatched coach_id | unit | `pnpm --filter apps/web test run tests/unit/ai-guardrails.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/tests/unit/voice-profile-schema.test.ts` — Zod schema validation for all fields, min/max constraints, rejects missing required fields
- [ ] `apps/web/tests/unit/webhook-verification.test.ts` — Fireflies HMAC (pass + tampered) + Zoom signature (pass + invalid) — both in one file
- [ ] `apps/web/tests/unit/ai-engine-guard.test.ts` — server-only guard throws when imported in window/browser context
- [ ] `apps/web/tests/unit/token-counter.test.ts` — budget calculation: truncation applied when input > 8000 tokens; correct truncation order
- [ ] `apps/web/tests/unit/confidence-indicator.test.ts` — `confidence_level: 'low'` set when `selected_examples.length < 8`; `'high'` when ≥ 8
- [ ] `apps/web/tests/unit/ai-guardrails.test.ts` — isHardBlocked (all 3 states), scanNeverSayList (match + no-match), assertCoachIdScope (pass + reject)
- [ ] Run `pnpm db:gen-types` after `ai_summary` migration to regenerate Supabase types

---

## Threat-Aware Tests

| Threat | Test | What It Catches |
|--------|------|-----------------|
| Forged webhook POST | `webhook-verification.test.ts` — tampered body | Signature bypass → unauthorized transcript injection |
| Cross-coach voice model access | `ai-guardrails.test.ts` — coach_id scope assert | Schema bug or test data bleed producing wrong-coach drafts |
| ANTHROPIC_API_KEY in client bundle | `ai-engine-guard.test.ts` — window import throws | API key leaking to browser via bundle |
| Hard-block bypass | `ai-guardrails.test.ts` — isHardBlocked states | Draft generated for unsubscribed/bounced lead |
| Low-context drafts silently sent | `confidence-indicator.test.ts` — example count | Coach unaware draft was generated with < 8 voice examples |
