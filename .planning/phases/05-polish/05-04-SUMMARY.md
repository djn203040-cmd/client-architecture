---
phase: 05-polish
plan: 04
status: complete
---

# 05-04 Playwright E2E Launch Suite — Summary

## Deliverables

### Infrastructure
- `apps/web/tests/global-setup.ts` — pre-flight Supabase health check; aborts with clear error if not running
- `apps/web/playwright.config.ts` — updated with `globalSetup`, `.env.test` loader, `NODE_ENV=test pnpm dev`
- `apps/web/.env.test` — committed placeholder file; CI overwrites with `supabase status -o env`
- `.github/workflows/playwright.yml` — CI workflow using `supabase/setup-cli@v2`, 15-min timeout, uploads artifact on failure
- `supabase/migrations/20260520000005_unique_active_sequence.sql` — partial unique index on `sequences(coach_id, lead_id, track) WHERE status = 'active'`

### Fixtures (`apps/web/tests/fixtures/`)
| File | Purpose |
|------|---------|
| `createCoach.ts` | Creates auth user + coach row + returns session cookies in @supabase/ssr base64url format |
| `createLead.ts` | Inserts lead via service-role admin |
| `createSequence.ts` | Inserts sequence row (required for pre-send approval tests) |
| `createDraft.ts` | Inserts draft with optional sequence_id |
| `cleanupCoach.ts` | Cascading delete: coaches row + auth user |
| `mockOauthCallback.ts` | Upserts integrations row (bypasses real OAuth) |
| `index.ts` | Composed `test` + `expect` with `coach` and `secondCoach` fixtures |

### E2E Specs (8 new — `apps/web/tests/e2e/`)

**5 Launch-critical (D-19):**

| Spec | What it tests |
|------|--------------|
| `duplicate-sequence-prevention.spec.ts` | DB partial unique index enforces at-most-one active sequence per (coach, lead, track); cancelled sequences allow re-enrollment; different tracks can coexist |
| `cross-tenant-isolation.spec.ts` | GET /api/leads/{coachB.id} returns 404 via RLS; PATCH /api/drafts/{coachB.id} returns 4xx; settings PATCH cannot update another coach |
| `pre-send-safety-check.spec.ts` | Approving a draft for leads in terminal states (do_not_contact, unsubscribed, converted, closed, bounced) returns 409 |
| `webhook-signature-bypass.spec.ts` | 9 endpoints reject invalid signatures with 401 (Slack, Twilio, 7 calendar providers — Gmail push excluded: intentionally has no sig check per T-03-13) |
| `full-approval-flow.spec.ts` | PATCH approve returns 200 + `new_status: approved`; DB reflects approved; Gmail mocked via `page.route`; idempotency guard rejects re-approval |

**3 Phase 5 feature (D-20):**

| Spec | What it tests |
|------|--------------|
| `onboarding-completion.spec.ts` | Full 4-step wizard via API (gmail→voice→first-lead→notifications); `onboarding_completed_at` set on completion; dashboard no redirect loop; no setup banner after completion |
| `locked-module-pages.spec.ts` | Threshold + Continuation render CLAUDE.md hero copy verbatim; sidebar deep-links navigate to module pages; cal.com network errors silently ignored |
| `settings-save.spec.ts` | Timezone PATCH persists; notifications matrix toggle persists; dashboard channel cannot be disabled; danger-zone disconnect requires exact confirm phrase; audit log created on disconnect |

## Implementation Decisions vs. Plan

| Spec | Plan assumed | Actual implementation |
|------|-------------|----------------------|
| duplicate-sequence-prevention | `/api/sequences/enroll` returns 409 | Route returns 202 (async Inngest). Test now validates the DB partial-unique-index invariant directly |
| webhook-signature-bypass | 10 endpoints including Gmail pubsub | Gmail push (`/api/webhooks/gmail/push`) has NO sig check by design (T-03-13). Tests cover 9 endpoints |
| full-approval-flow | Draft transitions to `sent` | `sent` requires Inngest processing (async). Tests verify `approved` status (the synchronous CAS) |
| cross-tenant drafts | 404 for cross-tenant | Drafts PATCH uses adminClient → returns 403. Test accepts `[403, 404]` |
| pre-send safety check | Draft without sequence | Route short-circuits with `no_sequence` reason before checking terminal states. Tests now create sequences via `createSequence` fixture |
| onboarding first-lead step | Call seed-demo + demo-approve via API | seed-demo calls Anthropic (with catch/fallback). Test seeds demo lead directly via admin to avoid AI dependency |

## Existing 12 Specs
No changes — all 12 specs in `apps/web/tests/e2e/` at time of implementation remain untouched.
