---
phase: 4
slug: approval-channels
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `04-RESEARCH.md` "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 (unit + integration) + Playwright 1.59.1 (E2E) |
| **Config file** | `apps/web/vitest.config.ts` (existing) · `apps/web/playwright.config.ts` (existing) |
| **Quick run command** | `pnpm --filter web test:unit` |
| **Full suite command** | `pnpm --filter web test` |
| **Estimated runtime** | ~25s quick · ~90s full |

---

## Sampling Rate

- **After every task commit:** `pnpm --filter web test:unit` plus the file-targeted vitest for the task being implemented.
- **After every wave merge:** `pnpm --filter web test:unit && pnpm --filter web test:integration`
- **Before `/gsd-verify-work`:** `pnpm --filter web test` must be fully green (vitest + playwright).
- **Max feedback latency:** 30 seconds for quick path; 90 seconds for full suite.

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| DRAFT-001 | Draft surfaces 24h before send | integration | `pnpm --filter web vitest run tests/integration/notification-dispatcher.test.ts -t "fires draft_ready"` | ❌ W0 | ⬜ pending |
| DRAFT-002 | Notify all connected channels | integration | `pnpm --filter web vitest run tests/integration/notification-dispatcher.test.ts -t "fans out to all enabled"` | ❌ W0 | ⬜ pending |
| DRAFT-007 | Follow-up CTA at +24h | integration | `pnpm --filter web vitest run tests/integration/draft-followup-cta.test.ts` | ❌ W0 | ⬜ pending |
| DRAFT-008 | HOLD at +48h cascade | integration | `pnpm --filter web vitest run tests/integration/draft-hold-cascade.test.ts` | ❌ W0 | ⬜ pending |
| DRAFT-009 | Mode A auto-sends without review | unit + integration | `pnpm --filter web vitest run tests/unit/autonomous-mode.test.ts` | ❌ W0 | ⬜ pending |
| DRAFT-010 | Mode B 24h auto-send on timeout | integration | `pnpm --filter web vitest run tests/integration/autonomous-mode-b.test.ts` | ❌ W0 | ⬜ pending |
| DRAFT-011 | Advisory-lock CAS prevents double-send | integration | `pnpm --filter web vitest run tests/integration/approve-atomic.test.ts -t "concurrent attempts"` | ❌ W0 | ⬜ pending |
| COMPLY-006 | Hard bounce multi-channel notification | integration | `pnpm --filter web vitest run tests/integration/bounce-notification.test.ts` | ❌ W0 | ⬜ pending |
| NOTIFY-001 | Dashboard notification appears (Realtime) | E2E | `pnpm --filter web playwright test tests/e2e/dashboard-notifications.spec.ts` | ❌ W0 | ⬜ pending |
| NOTIFY-002 | Resend email send + tokenized link | integration | `pnpm --filter web vitest run tests/integration/email-channel.test.ts` | ❌ W0 | ⬜ pending |
| NOTIFY-003 | Slack message posts with Block Kit | integration | `pnpm --filter web vitest run tests/integration/slack-channel.test.ts` | ❌ W0 | ⬜ pending |
| NOTIFY-004 | WhatsApp template message sends | integration | `pnpm --filter web vitest run tests/integration/whatsapp-channel.test.ts` | ❌ W0 | ⬜ pending |
| NOTIFY-005 | SMS body ≤ 160 chars | unit | `pnpm --filter web vitest run tests/unit/sms-body.test.ts` | ❌ W0 | ⬜ pending |
| NOTIFY-006 | All channels fire simultaneously | integration | `pnpm --filter web vitest run tests/integration/notification-dispatcher.test.ts -t "parallel"` | ❌ W0 | ⬜ pending |
| NOTIFY-007 | Failed delivery logged + status updated | integration | `pnpm --filter web vitest run tests/integration/webhook-status.test.ts` | ❌ W0 | ⬜ pending |
| NOTIFY-008 | Approve-from-Slack updates draft to sent | integration | `pnpm --filter web vitest run tests/integration/slack-interactivity.test.ts -t "approve flow"` | ❌ W0 | ⬜ pending |
| Pitfall-5 | SMS body under 160 with max lead name | unit | `pnpm --filter web vitest run tests/unit/sms-body.test.ts -t "long lead name"` | ❌ W0 | ⬜ pending |
| Pitfall-2 | Slack raw-body HMAC verification | unit | `pnpm --filter web vitest run tests/unit/slack-signature.test.ts` | ❌ W0 | ⬜ pending |
| Pitfall-6 | Read-only view does NOT consume nonce | integration | `pnpm --filter web vitest run tests/integration/review-token.test.ts -t "read-only does not consume nonce"` | ❌ W0 | ⬜ pending |
| Pitfall-7 | Channel-connect prefs seed idempotent | integration | `pnpm --filter web vitest run tests/integration/notification-preferences-seed.test.ts` | ❌ W0 | ⬜ pending |
| Phase-gate | Dashboard Approve → Gmail send (E2E) | E2E | `pnpm --filter web playwright test tests/e2e/dashboard-approve-flow.spec.ts` | ❌ W0 | ⬜ pending |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 (test scaffolding) must create the following before any feature task lands:

**Unit tests**
- [x] `apps/web/tests/unit/slack-signature.test.ts`
- [x] `apps/web/tests/unit/sms-body.test.ts`
- [x] `apps/web/tests/unit/autonomous-mode.test.ts`
- [x] `apps/web/tests/unit/review-token.test.ts`

**Integration tests**
- [x] `apps/web/tests/integration/notification-dispatcher.test.ts`
- [x] `apps/web/tests/integration/draft-followup-cta.test.ts`
- [x] `apps/web/tests/integration/draft-hold-cascade.test.ts`
- [x] `apps/web/tests/integration/autonomous-mode-b.test.ts`
- [x] `apps/web/tests/integration/approve-atomic.test.ts`
- [x] `apps/web/tests/integration/bounce-notification.test.ts`
- [x] `apps/web/tests/integration/email-channel.test.ts`
- [x] `apps/web/tests/integration/slack-channel.test.ts`
- [x] `apps/web/tests/integration/whatsapp-channel.test.ts`
- [x] `apps/web/tests/integration/webhook-status.test.ts`
- [x] `apps/web/tests/integration/slack-interactivity.test.ts`
- [x] `apps/web/tests/integration/review-token.test.ts`
- [x] `apps/web/tests/integration/notification-preferences-seed.test.ts`

**E2E tests**
- [x] `apps/web/tests/e2e/dashboard-notifications.spec.ts`
- [x] `apps/web/tests/e2e/dashboard-approve-flow.spec.ts`

**Shared utilities**
- [x] `apps/web/tests/utils/inngest-runner.ts` — in-process Inngest step runner
- [x] `apps/web/tests/utils/supabase-test-client.ts` — service-role test client + RLS impersonation helper
- [x] `apps/web/tests/utils/mocks/resend.ts`, `twilio.ts`, `slack.ts` — vendor SDK mocks

Framework install: **none** — Vitest 4.1.5 + Playwright 1.59.1 already installed in `apps/web/package.json`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slack OAuth install flow on a real workspace | NOTIFY-003 / D-01 | OAuth bounces through Slack — fully mocked in tests but a live install confirms scopes and redirect | Daniel runs `/api/auth/slack/install` on staging, installs into `Sonorous-test` workspace, verifies bot DM lands |
| WhatsApp Meta template approval | NOTIFY-004 / D-08 | Meta approves templates outside the codebase | Daniel submits UTILITY template to Twilio Console, waits for approval, captures `MGxxxxxxxx` Content SID into Vault |
| Resend domain SPF / DKIM | NOTIFY-002 | DNS lives outside repo | Verify `drafts.{sonorous-domain}` SPF + DKIM green in Resend dashboard before any production send |
| Twilio WhatsApp Business Number provisioning | NOTIFY-004 | Carrier registration off-codebase | Daniel attaches a WABA-registered number to the Twilio account; capture `TWILIO_WHATSAPP_FROM` env var |
| Real Postgres concurrent-write smoke test | DRAFT-011 | Advisory-lock semantics depend on Postgres runtime, not just app code | After staging deploy, fire two concurrent `POST /api/drafts/:id/approve` from `curl` in parallel; verify exactly one returns 200 and one returns 409 |

---

## Validation Sign-Off

- [x] All Phase 4 tasks have an `<automated>` verify command or are listed as Wave 0 dependencies above
- [x] No 3 consecutive tasks without automated verify (sampling continuity)
- [x] Wave 0 covers every ❌ W0 marker in the verification map
- [x] No watch-mode flags in any command (`vitest run`, not `vitest`)
- [x] Feedback latency < 30s for quick path
- [x] `nyquist_compliant: true` set in frontmatter once Wave 0 lands

**Approval:** pending

**Approval:** scaffolded by 04-00 — 2026-05-20
