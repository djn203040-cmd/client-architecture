---
phase: 3
slug: automation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-19
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 (unit/integration) + Playwright 1.59.1 (e2e) |
| **Config file** | `apps/web/vitest.config.ts` (verify exists before Wave 1; create in Wave 0 if missing) |
| **Quick run command** | `pnpm --filter web test:unit` |
| **Full suite command** | `pnpm --filter web test` |
| **Estimated runtime** | ~45 seconds (unit) / ~3 minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test:unit`
- **After every plan wave:** Run `pnpm --filter web test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds (unit)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CAL-001–003 | — | N/A | unit | `pnpm --filter web test:unit -- calendar-abstraction` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | CAL-004 | T-03-01 | HMAC timing-safe verification for all 7 providers | unit | `pnpm --filter web test:unit -- calendar-webhook-verification` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CAL-005/SEQ-007 | — | DB UNIQUE rejects duplicate webhook | integration | `pnpm --filter web test:unit -- webhook-deduplication` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | SEQ-001–005 | — | N/A | unit | `pnpm --filter web test:unit -- sequence-engine` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | SEQ-006 | — | Concurrency key prevents dual active sequence | unit | `pnpm --filter web test:unit -- sequence-concurrency` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | STATE-010/SEQ-013 | T-03-02 | Pre-send blocks all 5 terminal states | unit | `pnpm --filter web test:unit -- pre-send-safety` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | GMAIL-004–006 | T-03-03 | Pub/Sub message structure validated before routing | unit | `pnpm --filter web test:unit -- gmail-monitor` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | GMAIL-008 | — | Reply detected by In-Reply-To header match | unit | `pnpm --filter web test:unit -- reply-detection` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 3 | AI-008/AI-009/GMAIL-007 | — | N/A | unit | `pnpm --filter web test:unit -- reply-handler` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 4 | COMPLY-001–003 | T-03-04 | Unsubscribe token HMAC-signed; verified on /api/unsubscribe | unit | `pnpm --filter web test:unit -- unsubscribe` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 4 | COMPLY-005–007 | — | Hard bounce detected via MAILER-DAEMON parsing | unit | `pnpm --filter web test:unit -- bounce-detection` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 4 | LEAD-006/LEAD-007 | — | N/A | unit | `pnpm --filter web test:unit -- lead-intake` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/pre-send-safety.test.ts` — covers SEQ-013, STATE-010 (all 5 terminal states: unsubscribed, do_not_contact, bounced, converted, closed)
- [ ] `tests/unit/calendar-webhook-verification.test.ts` — covers CAL-004 (7 providers; extend existing `webhook-verification.test.ts` pattern from Phase 1/2)
- [ ] `tests/unit/calendar-deduplication.test.ts` — covers SEQ-007, CAL-005 (deterministic event ID)
- [ ] `tests/unit/reply-detection.test.ts` — covers GMAIL-008 (In-Reply-To header matching against outbound Message-IDs)
- [ ] `tests/unit/bounce-detection.test.ts` — covers COMPLY-005/007 (MAILER-DAEMON from: header parsing)
- [ ] `tests/unit/unsubscribe.test.ts` — covers COMPLY-001/002 (link presence + HMAC token generation/verification)
- [ ] `tests/unit/sequence-concurrency.test.ts` — covers SEQ-006 (concurrencyKey config shape; verifies key = coach_id+lead_id)
- [ ] `tests/integration/webhook-deduplication.test.ts` — covers SEQ-014, CAL-005 (DB UNIQUE constraint rejects duplicate provider+external_event_id)
- [ ] `apps/web/vitest.config.ts` — verify exists from Phase 2; create if missing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendly no-show webhook starts sequence end-to-end | SEQ-001/CAL-001 | Requires live Calendly webhook + Inngest dev server | 1. `pnpm inngest dev` 2. Send test Calendly payload to `/api/webhooks/calendar/calendly` 3. Verify sequence row created in Supabase, Inngest run visible in dev UI |
| Gmail Pub/Sub push routes to correct coach | GMAIL-004 | Requires GCP Pub/Sub topic + live watch | 1. Set up GCP topic + IAM 2. POST mock push notification to `/api/webhooks/gmail/pubsub` 3. Verify correct coach's inbox polled |
| Pre-send safety check blocks send in terminal state (e2e) | STATE-010 | Requires Inngest running with real DB | Run `playwright test tests/e2e/pre-send-safety.spec.ts` after Inngest dev server started |
| Hard bounce detection from real MAILER-DAEMON | COMPLY-005 | Requires real Gmail inbox | Manual test: send to invalid address, verify `lead.bounced = true` after next Gmail monitoring cycle |
| All 7 providers receive test webhook | CAL-001–007 | Provider sandbox environments required | Send test payload for each provider; verify calendar_events row created and no duplicate on retry |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s (unit suite)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
