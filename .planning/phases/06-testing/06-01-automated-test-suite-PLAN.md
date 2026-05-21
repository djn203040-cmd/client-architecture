---
phase: 06-testing
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/tests/unit/
  - apps/web/tests/integration/
  - apps/web/tests/e2e/
  - apps/web/playwright.config.ts
  - apps/web/vitest.config.ts
  - apps/web/package.json
  - apps/web/app/api/health/route.ts
  - apps/web/sentry.client.config.ts
  - apps/web/sentry.server.config.ts
  - .github/workflows/test.yml
  - .lighthouserc.cjs
  - load/k6-webhooks.js
  - load/k6-approvals.js
autonomous: true
requirements:
  - "Section 1 of 06-PLAN.md (1.1 through 1.10)"

must_haves:
  truths:
    - "`pnpm typecheck` passes across all workspaces with zero errors"
    - "`pnpm lint` passes with zero warnings"
    - "17+ unit specs (one per 06-PLAN.md §1.2 bullet) pass green via `pnpm test:unit`"
    - "16+ integration specs (one per §1.3 bullet) pass green via `pnpm test:integration` against local Supabase"
    - "17+ Playwright specs (one per §1.4 bullet) pass green via `pnpm test:e2e` on chromium, webkit, firefox"
    - "CI workflow at .github/workflows/test.yml runs typecheck + lint + unit + integration + e2e on every PR and blocks merge on failure"
    - "Lighthouse CI score >=90 on dashboard, /onboarding, and locked module pages"
    - "k6 load scripts at load/k6-webhooks.js and load/k6-approvals.js run locally"
    - "Sentry client + server initialized with `beforeSend` PII stripping"
    - "Health endpoint /api/health returns 200 + dependency status JSON"
    - "Axe-core scan integrated into Playwright (zero violations on every spec)"
    - "Playwright matrix runs against Chromium, WebKit, Firefox"
  artifacts:
    - path: "apps/web/tests/unit/"
      provides: "Unit tests for voice model, AI engine, state machine, dispatcher, SMS builder, bounce detector, calendar adapters, tokens"
    - path: "apps/web/tests/integration/"
      provides: "Integration tests for RLS, Vault, Inngest functions, atomic RPCs, OAuth refresh, webhook signature verification, Twilio/Resend status webhooks"
    - path: "apps/web/tests/e2e/"
      provides: "Playwright E2E suite (extends 05-04 baseline with cross-tenant, dup-sequence, autonomous mode, all 7 calendar providers)"
    - path: ".github/workflows/test.yml"
      provides: "CI gate enforcing full test matrix on every PR"
    - path: "apps/web/app/api/health/route.ts"
      provides: "Health check with dependency status for Supabase, Inngest, Gmail, Twilio"
    - path: ".lighthouserc.cjs"
      provides: "Lighthouse CI config with >=90 score gates"
  key_links:
    - from: ".github/workflows/test.yml"
      to: "apps/web/tests/{unit,integration,e2e}/"
      via: "pnpm scripts: test:unit, test:integration, test:e2e"
      pattern: "tests/.*\\.test\\.ts"
---

<objective>
Build out the full automated test suite that covers Section 1 of 06-PLAN.md. By the end of this plan, every box in sections 1.1 through 1.10 of the master Phase 6 checklist is automatable, runs in CI, and blocks merges on failure.

Plan 05-04 already shipped 8 Playwright specs and a basic CI workflow. This plan extends that foundation into a complete launch-grade automated test matrix: unit (~20 tests), integration (~16 tests), E2E (~17 specs), plus performance, accessibility, observability, and DB integrity gates.

Output:
- Unit test suite (vitest) covering voice model, AI engine, state machine, dispatcher, tokens, bounce detector, calendar adapters
- Integration test suite (vitest + Supabase local) covering RLS, Vault, Inngest, atomic RPCs, OAuth refresh, webhooks
- Playwright suite extended from 05-04 to cover Section 1.4 of 06-PLAN.md
- Lighthouse CI gates + k6 load scripts + axe-core integration
- Sentry client + server with PII stripping
- /api/health endpoint with dependency status
- CI workflow gating merge on every check
</objective>

<execution_context>
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/workflows/execute-plan.md
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/06-testing/06-PLAN.md
@.planning/phases/05-polish/05-04-playwright-e2e-launch-suite-PLAN.md
@.planning/phases/05-polish/05-04-SUMMARY.md
@CLAUDE.md

<interfaces>
<!-- Test layer boundaries -->
- Unit: pure functions, no I/O, no DB. Mocks for all external services. Runs in <30s.
- Integration: vitest + local Supabase (supabase start). Real RLS, real Vault, real Inngest test client. Mocked Gmail/Twilio/Slack/Resend HTTP. Runs in ~3 min.
- E2E: Playwright + local Supabase + Inngest dev server. Real browser. Synthetic webhook fixtures. Inngest time-travel for sleepUntil. Runs in ~8 min on CI.
- Performance: Lighthouse CI invoked against `pnpm build && pnpm start` preview. k6 against staging only.
- Accessibility: axe-core invoked via `@axe-core/playwright` inside every E2E spec.

<!-- Test file conventions -->
- Unit: apps/web/tests/unit/{module}/{name}.test.ts
- Integration: apps/web/tests/integration/{area}/{name}.test.ts
- E2E: apps/web/tests/e2e/{flow}.spec.ts (already established by 05-04)
- Shared fixtures: apps/web/tests/fixtures/ (factories for coach, lead, draft)

<!-- Acceptance source of truth -->
06-PLAN.md sections 1.1–1.10 are the canonical list of checks. Every checkbox in those sections MUST be covered by a test or gate produced by this plan.

<!-- CI invariants -->
- Workflow blocks merge if any job fails.
- typecheck, lint, unit, integration, e2e are required status checks on `main`.
- Lighthouse CI runs on preview deploy; warns rather than blocks (gate via `assert: warn`).
- size-limit gate added; <=300KB gzipped dashboard JS.

<!-- Already shipped by 05-04 (do not duplicate, extend) -->
- Playwright config + globalSetup creating coach fixtures
- 8 baseline specs (smoke, auth, lead CRUD, draft approval, settings, onboarding, integrations card, theme)
- CI workflow stub with Playwright job
- Inngest mock in test env
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Stand up vitest workspaces + factories</name>
  <files>apps/web/vitest.config.ts, apps/web/tests/fixtures/*, packages/test-utils/, apps/web/package.json</files>
  <action>
1. Install vitest + @vitest/coverage-v8 at workspace root if not present. Add `test:unit` and `test:integration` scripts to apps/web/package.json:
   - `test:unit`: vitest run --config vitest.unit.config.ts
   - `test:integration`: vitest run --config vitest.integration.config.ts
2. Create two configs:
   - apps/web/vitest.unit.config.ts — include `tests/unit/**/*.test.ts`, no setup, jsdom env
   - apps/web/vitest.integration.config.ts — include `tests/integration/**/*.test.ts`, node env, globalSetup spins up supabase local + applies migrations
3. Build factories at apps/web/tests/fixtures/:
   - factories/coach.ts — `makeCoach({ overrides })` inserts a coach + auth user via service role
   - factories/lead.ts — `makeLead({ coachId, state, overrides })`
   - factories/draft.ts — `makeDraft({ leadId, status, channel })`
   - factories/integration.ts — `makeIntegration({ coachId, provider, vaultRef })`
   - cleanup.ts — `truncateAll()` between tests
4. Add `packages/test-utils/src/index.ts` exporting:
   - `createTestSupabaseClient()` — service-role client pointed at local Supabase
   - `withCoachAuth(client, coachId)` — RLS-scoped client impersonating a coach
   - `mockInngest()` — in-memory event recorder
   - `mockHttp(provider)` — typed nock/MSW wrappers for Gmail, Twilio, Slack, Resend, Anthropic
5. Update root package.json to include the workspace if not present.
  </action>
  <verify>
    <automated>pnpm --filter web test:unit -- --run --reporter=verbose 2>&1 | tail -10 && echo "ok"</automated>
    <automated>test -f apps/web/tests/fixtures/factories/coach.ts && test -f apps/web/tests/fixtures/factories/lead.ts && test -f apps/web/tests/fixtures/factories/draft.ts</automated>
  </verify>
  <done>
    vitest configured with unit + integration projects, factories ready, scripts wired into package.json.
  </done>
</task>

<task type="auto">
  <name>Task 2: Unit suite — Section 1.2 of 06-PLAN.md</name>
  <files>apps/web/tests/unit/**</files>
  <action>
Write one test file per bullet in 06-PLAN.md section 1.2. File map:

- voice/layer1-profile.test.ts — malformed input does not throw; returns sensible defaults
- voice/layer2-examples.test.ts — deterministic selection on identical input (snapshot)
- ai/context-assembler.test.ts — 100-message thread stays under token budget (assert tokens < limit)
- ai/prompt-generation.test.ts — deterministic given seed (snapshot)
- ai/guardrails.test.ts — unfilled `{{placeholder}}` blocks generation
- state-machine/transitions.test.ts — table-driven, every (from,to) pair from REQUIREMENTS.md STATE-*
- state-machine/terminal-states.test.ts — `unsubscribed`, `bounced_hard`, `do_not_contact`, `terminated` cannot transition
- pre-send/safety-check.test.ts — terminal state blocks send (test all 4)
- inngest/idempotency.test.ts — duplicate event ID rejected
- calendar/adapters.test.ts — all 7 providers: parse golden fixture into TCalendarEvent
- calendar/signatures.test.ts — invalid signature rejected for all 7
- tokens/unsubscribe-hmac.test.ts — round-trip + tamper detection
- tokens/review-nonce.test.ts — single-use; replay returns sentinel
- bounce/classifier.test.ts — 20 real bounce fixtures (load from tests/fixtures/bounces/) classified hard vs soft
- sms/body-builder.test.ts — output <=160 chars for 20 sample inputs
- dispatcher/all-settled.test.ts — one channel rejection does not abort the others
- notifications/matrix.test.ts — per-coach toggles honored; locked rows (dashboard + hard-bounce SMS) cannot be disabled

Use existing source modules from packages/shared/ and apps/web/lib/. Mock external HTTP. Keep each file <120 lines.

For each test file: write the spec, run it, fix failures by either fixing the test or fixing the underlying source (preferred). Commit after every 3–4 files green.
  </action>
  <verify>
    <automated>pnpm --filter web test:unit -- --run 2>&1 | grep -E "(passed|failed)" | tail -5</automated>
    <automated>find apps/web/tests/unit -name "*.test.ts" | wc -l | awk '{ if ($1 >= 17) print "ok"; else print "missing: expected >=17, got " $1 }'</automated>
  </verify>
  <done>
    All 17+ unit test files exist and pass. Every bullet in 06-PLAN.md §1.2 is covered.
  </done>
</task>

<task type="auto">
  <name>Task 3: Integration suite — Section 1.3 of 06-PLAN.md</name>
  <files>apps/web/tests/integration/**</files>
  <action>
Write one test file per bullet in section 1.3. File map:

- rls/cross-tenant.test.ts — for every public table, coach A cannot select/update/delete coach B's rows (loop over `pg_tables`)
- rls/service-role.test.ts — service role bypasses RLS server-side; anon client cannot reach service-role endpoints
- vault/oauth-tokens.test.ts — Vault wrap unreadable with anon key; service-role unwrap works
- inngest/sequence-no-show.test.ts — full sequence with mocked Gmail send, asserts step graph
- inngest/sequence-call-completed.test.ts — post-call track distinct from no-show
- inngest/reply-handler.test.ts — sequence paused + pending drafts cancelled + reply draft fired
- inngest/gmail-watch.test.ts — Pub/Sub push triggers gmail-monitor
- inngest/bounce-handler.test.ts — sequence paused + multi-channel notification
- inngest/autonomous-mode-b-timer.test.ts — sleepUntil + CAS approve (use Inngest time-travel)
- rpcs/approve-draft-atomic.test.ts — concurrent approve attempts: only one succeeds (advisory lock)
- rpcs/hold-draft-atomic.test.ts — race condition guard
- rpcs/consume-review-token.test.ts — single-use enforcement
- oauth/gmail-refresh.test.ts — 401 triggers refresh; `invalid_grant` writes reconnect notification
- oauth/slack-signature.test.ts — interactivity webhook signature check
- webhooks/twilio-status.test.ts — delivered/failed/undelivered processed
- webhooks/resend-svix.test.ts — Svix signature rejects unsigned

Pattern per test:
```ts
beforeEach: truncateAll()
arrange: factories create state
act: call the actual handler (do NOT call SQL directly; use the real API/Inngest function)
assert: DB state + side-effect logs
afterEach: stopInngestDev() if used
```

Commit per logical group (RLS bundle, Inngest bundle, RPC bundle, OAuth bundle, webhook bundle).
  </action>
  <verify>
    <automated>supabase status 2>&1 | grep -q "API URL" || supabase start --workdir supabase 2>&1 | tail -3</automated>
    <automated>pnpm --filter web test:integration -- --run 2>&1 | grep -E "Tests" | tail -3</automated>
    <automated>find apps/web/tests/integration -name "*.test.ts" | wc -l | awk '{ if ($1 >= 16) print "ok"; else print "missing: expected >=16, got " $1 }'</automated>
  </verify>
  <done>
    All 16+ integration test files exist and pass against local Supabase. Every bullet in §1.3 covered.
  </done>
</task>

<task type="auto">
  <name>Task 4: Extend Playwright suite — Section 1.4 of 06-PLAN.md</name>
  <files>apps/web/tests/e2e/**, apps/web/playwright.config.ts</files>
  <action>
05-04 shipped 8 baseline specs. Section 1.4 requires 17. Add the missing specs:

- e2e/full-happy-path.spec.ts — invite → connect Gmail → add lead → AI draft → approve → sent (uses Gmail send mock)
- e2e/cross-tenant-isolation.spec.ts — coach A signed in, navigate to /leads/{coachB-lead-id} → 404 or 403, never lead data
- e2e/duplicate-sequence-prevention.spec.ts — fire same Calendly webhook twice; assert one sequence (query DB)
- e2e/pre-send-unsubscribed.spec.ts — mark lead unsubscribed; all queued drafts blocked
- e2e/webhook-signature-forged.spec.ts — POST forged Calendly payload; assert 401
- e2e/approval-email-token.spec.ts — load review page → approve → status updates; second click → "already used"
- e2e/approval-slack.spec.ts — Slack interactivity payload → atomic approve → message updated
- e2e/approval-whatsapp.spec.ts — Twilio inbound quick-reply approve → status='sent'
- e2e/autonomous-mode-a.spec.ts — type-to-confirm: wrong phrase disabled, exact enabled, drafts auto-send
- e2e/autonomous-mode-b.spec.ts — Inngest time-travel 24h forward, draft auto-sent
- e2e/followup-24h-cta.spec.ts — coach inactive 24h, follow-up CTA fires
- e2e/hold-cascade-48h.spec.ts — no action 48h, draft moves to held tab
- e2e/unsubscribe-flow.spec.ts — click unsubscribe link → lead state updated → no new drafts
- e2e/bounce-hard.spec.ts — hard bounce → sequence paused + notifications fired
- e2e/calendar-providers-all-7.spec.ts — synthetic webhook for each of 7 providers → lead state updated
- e2e/admin-access.spec.ts — Daniel sees all coaches; non-Daniel role gets 403
- e2e/onboarding-timed.spec.ts — wizard completes in <15 min (assert wall-clock)

Cross-browser matrix: update playwright.config.ts `projects` to include chromium, webkit, firefox. CI runs all three.

Mobile + tablet viewports: add `projects` entries with `viewport: { width: 375, height: 667 }` and `viewport: { width: 768, height: 1024 }` for the dashboard smoke spec only (to keep CI time bounded).

Axe-core integration: add a global afterEach in playwright.config.ts that runs `injectAxe + checkA11y` on every page. Allowlist any unfixable third-party violations explicitly.

Additional §1.6 a11y coverage (must be inside the same e2e suite):
- Dual-mode axe scan: every spec runs once with `prefers-color-scheme: dark` and once light. Pages must pass both. Implement via a Playwright projects fork: `chromium-light`, `chromium-dark`.
- Reduced-motion test (`e2e/reduced-motion.spec.ts`): emulate `prefers-reduced-motion: reduce`; assert Framer Motion components render without animation (e.g., no transform inline styles applied on entrance).

§1.7 deferrals — Safari iOS OAuth + Chrome Android approval flow are real-device checks. Playwright WebKit ≠ Safari iOS. Document as deferred to 06-03 §2.12 (Mobile UAT) in the 06-01 summary.
  </action>
  <verify>
    <automated>find apps/web/tests/e2e -name "*.spec.ts" | wc -l | awk '{ if ($1 >= 17) print "ok"; else print "expected >=17, got " $1 }'</automated>
    <automated>pnpm --filter web exec playwright test --project=chromium --reporter=line 2>&1 | tail -5</automated>
    <automated>grep -E "(chromium|webkit|firefox)" apps/web/playwright.config.ts | wc -l | awk '{ if ($1 >= 3) print "ok"; else print "missing project"}'</automated>
  </verify>
  <done>
    17+ Playwright specs exist, run green on chromium, axe-core integrated, cross-browser matrix configured.
  </done>
</task>

<task type="auto">
  <name>Task 5: Performance, observability, and gates — Sections 1.5, 1.8, 1.9, 1.10 of 06-PLAN.md</name>
  <files>.lighthouserc.cjs, load/k6-webhooks.js, load/k6-approvals.js, apps/web/sentry.{client,server}.config.ts, apps/web/app/api/health/route.ts, .github/workflows/test.yml, apps/web/.size-limit.json</files>
  <action>
1. Lighthouse CI:
   - Add `.lighthouserc.cjs` with assertions: performance/accessibility/best-practices/seo >=0.9 each. URLs: /, /dashboard, /onboarding, /modules/threshold, /modules/continuation.
   - Add CI job `lighthouse` that runs against the Vercel preview URL on PR builds (or `next build && next start` locally as fallback).
2. k6 load scripts:
   - load/k6-webhooks.js — 100 concurrent Calendly webhook deliveries, assert 100% accepted, no duplicate sequences (query Supabase post-run).
   - load/k6-approvals.js — 50 concurrent approve-draft requests on the same draft, assert exactly 1 success and 49 conflict responses (advisory lock).
   - Document run command: `k6 run load/k6-webhooks.js -e BASE=https://staging...`. CI does not run k6 (cost); runs are manual or scheduled.
3. Sentry (scaffold only — beforeSend body is owned by 06-02 Task 6):
   - apps/web/sentry.client.config.ts + sentry.server.config.ts initialized with DSN, source maps via `withSentryConfig` in next.config.ts, and an empty `beforeSend(event) { return event }` stub.
   - **Hard handoff:** 06-02 Task 6 replaces the stub body with the redactor. Do not duplicate the redactor here.
4. Health endpoint:
   - apps/web/app/api/health/route.ts: GET → JSON `{ ok, deps: { supabase, inngest, gmail_api, twilio } }`. Each dep does a cheap probe (Supabase: SELECT 1, Inngest: ping, Gmail: token presence, Twilio: account fetch). Cache-Control: no-store.
   - Auth: public but rate-limited (Upstash). No PII leaked.
5. Build gates:
   - Add `size-limit` to apps/web devDependencies. Config: dashboard JS <=300KB gzipped.
   - Add `pnpm size` script and `size` CI job blocking merge.
   - **Note:** ESLint `no-console` rule is owned by 06-02 Task 6 (PII audit). Do not write that rule here.
6. Migration integrity:
   - Add CI job `db-integrity`: `supabase db reset` from fresh, then `supabase db diff` returns empty. Verifies migrations apply cleanly.
   - Add a script `scripts/check-orphans.sql` that lists orphaned FKs; CI runs it and fails if any rows.
7. Observability dashboard:
   - Document in README that Inngest dashboard, Vercel logs, Sentry, and an uptime monitor (BetterStack free tier) are the canonical surfaces. Add a one-time setup script `scripts/setup-uptime.md` checklist.
8. CI workflow update (.github/workflows/test.yml):
   - Jobs: typecheck, lint, unit, integration (services: supabase + redis), e2e (matrix: chromium, webkit, firefox), size, db-integrity, lighthouse (PR-only).
   - `needs:` graph so e2e depends on unit + integration passing.
   - Concurrency group cancels in-progress runs on push to the same branch.
   - Cache: pnpm store + playwright browsers.
   - Block-on-required: all jobs except lighthouse (warn only).
  </action>
  <verify>
    <automated>test -f .lighthouserc.cjs && test -f load/k6-webhooks.js && test -f load/k6-approvals.js</automated>
    <automated>test -f apps/web/sentry.client.config.ts && test -f apps/web/sentry.server.config.ts && grep -q "beforeSend" apps/web/sentry.client.config.ts</automated>
    <automated>test -f apps/web/app/api/health/route.ts && grep -q "no-store" apps/web/app/api/health/route.ts</automated>
    <automated>grep -E "(typecheck|lint|unit|integration|e2e|size|db-integrity|lighthouse)" .github/workflows/test.yml | wc -l | awk '{ if ($1 >= 7) print "ok"; else print "missing jobs"}'</automated>
    <automated>cd apps/web && pnpm size 2>&1 | tail -5</automated>
  </verify>
  <done>
    Lighthouse, k6, Sentry, /api/health, size-limit, DB integrity gate, and full CI matrix all wired up and passing.
  </done>
</task>

<task type="auto">
  <name>Task 5.5: §1.1 type safety + lint audit gates</name>
  <files>scripts/audit-types.sh, apps/web/tsconfig.json (verify), .github/workflows/test.yml</files>
  <action>
1. Verify apps/web/tsconfig.json has `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`. If missing, add them and fix any resulting type errors.
2. Write `scripts/audit-types.sh`:
   - Fails on any `:\s*any` (parameter or return type) in apps/web or packages, excluding test files and lines marked `// any-ok: <reason>`
   - Fails on `@ts-ignore` or `@ts-expect-error` without an inline `// reason:` justification on the same line
   - Fails on `eslint-disable` without an inline justification comment
   - Detects duplicate type definitions — names that appear as `export type` or `export interface` in BOTH `packages/shared/` and apps/web; flags for consolidation
3. Add `pnpm audit:types` script that runs the audit. Add CI job `type-audit` to .github/workflows/test.yml. Block merge on failure.
4. Run audit locally; remediate all findings (fix code or add explicit justification annotation).
  </action>
  <verify>
    <automated>test -f scripts/audit-types.sh && bash scripts/audit-types.sh 2>&1 | tail -5</automated>
    <automated>grep -E "(strict|noUncheckedIndexedAccess|noImplicitOverride)" apps/web/tsconfig.json | wc -l | awk '{ if ($1 >= 3) print "ok"; else print "missing strict flags" }'</automated>
    <automated>grep -q "type-audit" .github/workflows/test.yml</automated>
  </verify>
  <done>
    Zero unjustified `any`, `@ts-ignore`, or `eslint-disable`. Strict-mode flags verified. CI gates on audit-types.sh. Section 1.1 of 06-PLAN.md fully covered.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 6: Section 1 green-light review</name>
  <what-built>
    - 17+ unit tests, 16+ integration tests, 17+ Playwright specs covering 06-PLAN.md §1.1–1.4
    - Lighthouse CI, k6 load scripts, Sentry with PII stripping, /api/health, size-limit, DB integrity gate
    - CI workflow runs full matrix on every PR and blocks merge
  </what-built>
  <how-to-verify>
    1. Open a draft PR with a trivial whitespace change. Confirm CI fires typecheck, lint, unit, integration, e2e (chromium/webkit/firefox), size, db-integrity, lighthouse.
    2. Confirm a forced-fail (introduce a `expect(true).toBe(false)` in a unit test, push) blocks merge.
    3. Run `pnpm --filter web test:unit && pnpm --filter web test:integration && pnpm --filter web test:e2e` locally — all green.
    4. Visit /api/health locally — JSON includes status for supabase, inngest, gmail_api, twilio.
    5. Check Sentry dashboard receives a test event; confirm `email` field is redacted in payload.
    6. Run `pnpm size` — under 300KB gzipped.
    7. Run `k6 run load/k6-webhooks.js -e BASE=http://localhost:3000` against a local dev stack; confirm no duplicate sequences.
    8. Run `pnpm audit:types` — zero findings (covers §1.1).
    9. Confirm every checkbox in 06-PLAN.md §1.1, §1.2, §1.3, §1.4, §1.5, §1.6, §1.7, §1.8, §1.9, §1.10 has a test or gate referenced.
  </how-to-verify>
  <resume-signal>Type "approved" or list any §1 boxes still uncovered</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CI runner → production secrets | CI uses test secrets only. No production env vars exposed to test jobs. |
| Local dev → local Supabase | Tests run against `supabase start` instance, isolated from production. |
| Sentry SaaS → app | beforeSend strips PII before egress. No raw lead/coach data sent. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-01-01 | Information Disclosure | Test fixtures leak real coach data | mitigate | Factories generate synthetic data only. Snapshot tests exclude PII fields. |
| T-06-01-02 | Tampering | CI workflow tampered to skip checks | mitigate | Workflow file in repo; protected branch policy requires review. |
| T-06-01-03 | Repudiation | Flaky test masks regression | mitigate | Retries=0 in CI for unit/integration; Playwright retries=1 with trace-on-retry. Flake budget tracked. |
| T-06-01-04 | Information Disclosure | Sentry leaks PII | mitigate | beforeSend strips email/phone/name. Unit test asserts strip behavior on fixture payload. |
| T-06-01-05 | DoS | k6 load run against production | mitigate | k6 scripts hard-coded to require `BASE` env; CI does not run k6. README warns explicitly. |
</threat_model>

<verification>
- 17+ unit, 16+ integration, 17+ E2E test files exist
- `pnpm test:unit`, `test:integration`, `test:e2e` all green locally
- CI workflow blocks merge on any failure
- Lighthouse, k6, Sentry, /api/health, size-limit, DB integrity all wired
- Every checkbox in 06-PLAN.md §1.1–1.10 maps to a concrete test or gate
- Human-verify checkpoint passed
</verification>

<success_criteria>
- Section 1 of 06-PLAN.md is fully automated and gating
- CI is green on `main` after this plan ships
- No flaky tests above the agreed budget (target: 0 retries needed in unit/integration)
- Sentry confirmed scrubbing PII
</success_criteria>

<output>
After completion, create `.planning/phases/06-testing/06-01-SUMMARY.md`:
- Test counts (unit/integration/E2E)
- CI workflow jobs added
- Lighthouse + k6 + Sentry status
- Any §1 boxes deferred (with reason) → must be picked up in 06-02 or 06-03
- Confirmation Section 1 is launch-ready
</output>

## Dependencies

- **No hard deps.** Section 1 work is independent of security (06-02) and UAT prep (06-03), but does benefit from the 05-04 Playwright baseline.
- **Soft depends on 05-04:** extends the existing Playwright config + global setup.
- **Blocks Phase 6 exit.** Section 1 sign-off requires this plan complete.

## Risks + Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Integration suite flakes against ephemeral Supabase | Use `supabase db reset` between specs; pin CLI version | Mark individual specs `.skip` with linked GitHub issue + remove-by date |
| Playwright browser matrix triples CI time | Cache browsers + run webkit/firefox only on PRs labeled `cross-browser` | Reduce matrix to chromium-only on every PR, full matrix nightly |
| Lighthouse score blocks merge for legitimate visual change | Configure as `assert: warn` initially; promote to `error` after 1 week of green baseline | Lower threshold to 85; raise once baseline understood |
| k6 accidentally run against production | BASE env required; README warning; CI never runs k6 | Rotate any leaked credentials; document incident |
| Sentry quota exceeded by test events | Use a dev DSN for local; production DSN gated by NODE_ENV | Disable Sentry init in test env |
