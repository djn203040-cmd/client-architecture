# Research Summary: The Client Architecture

## Stack (confirmed)

- **Next.js 15 App Router + Supabase + Inngest v3+ + Anthropic claude-sonnet-4-6 + Vercel** — full stack confirmed. Pin `@supabase/ssr` (not legacy client), `googleapis` for Gmail, `inngest` v3+ for App Router `serve()` pattern. Tailwind v4 + shadcn/ui + Framer Motion confirmed for UI.
- **Supabase Vault for all OAuth tokens** — refresh tokens stored encrypted via `vault.create_secret`, accessed only by service role through a `SECURITY DEFINER` function in the `private` schema. The `integrations` table stores only the Vault UUID reference, never the raw token.
- **Vercel Cron → Inngest fan-out** — Cron route sends one Inngest event per coach. The Inngest route handler must export `GET`, `POST`, `PUT` and set `export const maxDuration = 300`. The default 10s Vercel timeout breaks Inngest's long-polling model and is the single most common misconfiguration.

## Key Inngest Patterns

- **Per-coach concurrency key is non-negotiable** — `concurrency: { key: "event.data.coachId", limit: 3 }` gives every coach their own virtual queue.
- **`step.sendEvent()` inside functions, never `inngest.send()`** — `inngest.send()` inside a step body duplicate-sends on retry.
- **`cancelOn` for reply detection** — when `lead/replied` fires, in-flight sequences for that `leadId` cancel automatically. No polling needed.
- **Step IDs must be unique inside loops** — use `step.run(\`send-touchpoint-${dayOffset}\`, ...)`. Colliding IDs cause wrong memoized data to replay.
- **`step.sleepUntil(timestamp)` over `step.sleep(duration)`** — removes free-tier 7-day cap dependency and gives full DB visibility into scheduled sends.
- **Deterministic Inngest event `id`** — always include `id: \`no-show-${coachId}-${leadId}-${appointmentId}\`` when firing calendar events. Prevents duplicate sequences from webhook retries.

## Key Gmail API Patterns

- **Refresh token is delivered once** — must pass `access_type: 'offline'` AND `prompt: 'consent'` in the auth URL. Persist immediately on the `tokens` event.
- **`invalid_grant` = revoked, not transient** — catch specifically, mark integration disconnected, halt sequences, surface reconnect prompt. Do not retry.
- **Gmail watch expires every 7 days** — store `watch_expiry_at` per coach. Daily Vercel Cron → renewal. On failure, fall back to polling Gmail history API every 15 minutes.
- **OAuth scopes must be validated post-consent** — validate granted scopes after token exchange before marking coach connected. An under-scoped token silently fails on first send.
- **Google Image Proxy makes open tracking unreliable** — Gmail proxies all pixels. Treat opens as delivery confirmation only, not as behavior signal. Never gate sequence transitions on open detection.

## Table Stakes Features

Coaches will expect these on day one — missing any makes the product feel broken:

- Lead profile with contact details, source, current stage
- Chronological activity timeline with typed, distinct event icons
- Manual stage override
- Draft full-text visible immediately (not truncated)
- Inline draft editing (not in a modal)
- One-click approve with keyboard shortcuts (A = approve, S = skip, H = hold)
- Approve + Next flow (advance to next draft without returning to list)
- Reply detection with automatic sequence pause
- Unsubscribe / do-not-contact enforcement
- Sequence status per lead (active / paused / completed / held)
- Push notification when a lead replies
- Integration connection status with immediate reconnect prompt
- Manual lead entry (not every lead comes from Calendly)
- Lead search and filter with status tabs

## Differentiators

- Voice model from real messages (two-layer: structured profile + 10–15 curated few-shot examples)
- Call transcript as draft input, content referenced in the draft
- Stage-aware draft generation (no-show vs. post-call vs. re-engagement messaging)
- Pre-send safety check immediately before every send — no competitor does this
- 24h approval window with deliberate human-in-loop design
- Multi-channel draft notification with approve-from-Slack capability
- Sequence context injection (each draft knows its position, references prior messages)
- Confidence indicator on draft when voice context is thin

## Anti-Features (do NOT build)

- Bulk import + blast sequences — signals spam software, wrong product category
- A/B testing subject lines — volume optimization, not quality
- Inbox rotation / warmup — cold email infrastructure, liability for premium brand
- Open rate dashboards with trend charts — wrong register for coaching product
- Lead scoring / points systems — sales automation gimmick
- "Cadence" / "Touchpoint" vocabulary — replace with "sequence" / "message"
- Public Mailchimp-style unsubscribe pages — jarring for personal coach emails
- Lead temperature meters or emoji scoring

## Critical Architecture Decisions

- **Turborepo monorepo with 4 packages** — `apps/web`, `packages/shared` (types + Zod schemas + event constants), `packages/database` (Supabase types + migrations), `packages/ai-engine` (context assembler + Anthropic + voice model). `ai-engine` is server-side only.
- **Supabase schema must be finalized in Phase 1** — Inngest functions depend on `packages/database` types. Schema changes after Phase 3 starts cause function type regeneration cycles.
- **Unified calendar abstraction layer** — all 7 providers normalize to a single `CalendarEvent` type via provider-specific adapters. Build abstraction first, then adapters.
- **Gmail monitoring via Pub/Sub push, not polling** — one `users.watch()` per coach's Gmail. Renewal cron every 6 days.
- **Supabase Realtime for the approval queue** — `postgres_changes` on `drafts` table filtered by `coach_id`.
- **Admin at `/admin` uses service role server-side only** — cross-coach queries, protected at middleware and component level.
- **Every Inngest event payload must include both `coachId` and `leadId`** — Inngest functions have no RLS backstop; validate `coach_id` matches event payload on every function.

## Top Pitfalls to Avoid

1. **Gmail refresh token silently revoked** — daily integration health check cron in Phase 1; `invalid_grant` → mark disconnected, pause sequences, notify coach.
2. **Supabase service role key in client code** — `SUPABASE_SERVICE_ROLE_KEY` never gets `NEXT_PUBLIC_` prefix. CI check required.
3. **Duplicate sequences from webhook retries** — respond 200 immediately after signature verification. Store event UUID with unique constraint. Deterministic Inngest event `id` as second layer.
4. **Sending to a lead who replied after approval** — pre-send safety check is a hard synchronous `step.run()` gate immediately before every send.
5. **`inngest.send()` inside functions** — always `step.sendEvent()` inside Inngest functions or it duplicate-sends on retry.
6. **Gmail watch expiry** — store `watch_expiry_at`, run daily renewal cron, implement polling fallback when watch is inactive.
7. **Hallucinated lead facts in AI drafts** — wrap all lead-supplied content in XML delimiters. Explicit system instruction: only reference facts present in context.
8. **Context window overflow** — use `client.messages.countTokens()` before every generation. If over 150K, trim oldest conversation history. Target 8K total input.
9. **SECURITY DEFINER functions in the public schema** — all `SECURITY DEFINER` functions must live in `private` schema (not exposed by PostgREST).
10. **Supabase connection exhaustion** — use Supavisor (port 6543, transaction mode) for all Vercel function connections. Never direct connection strings (port 5432) in serverless.

## PRD Gaps to Add (v1)

**HIGH priority — add to requirements:**
- Coach notes on leads (private, injected into AI context)
- Manual sequence trigger (coaches meet leads outside Calendly)
- Sequence pause / resume button on lead profile
- Integration health monitoring with one-click reconnect flow
- Draft regeneration button (same context, single API call)
- Bounce / delivery failure handling (pause sequence, notify coach)
- Unsubscribe / do-not-contact enforcement (CAN-SPAM requirement)
- Email thread reply view in dashboard
- `call_completed` as distinct lead state (different messaging than no-show)

**MEDIUM priority — Phase 2+:**
- "What happened while I was away" dashboard home state
- Voice model feedback loop (scaffold `draft_edits` table in Phase 1, implement Phase 3)

## Phase Implications

**Phase 1 — Foundation:** Finalize FULL Supabase schema now. This is the most critical ordering constraint — every downstream phase depends on `packages/database` types. Include: coach notes field on leads, `call_completed` state, do-not-contact flag, `draft_edits` table scaffold, `watch_expiry_at` on integrations, integration health check scaffold. Google OAuth app review process must start here (can take weeks; 7-day token expiry in Testing mode blocks all sequences).

**Phase 2 — Intelligence:** `packages/ai-engine`: context assembler, draft generator, voice model builder. Minimum 8 voice examples before activating. XML delimiters for all lead-supplied content. Token counting with priority-based trimmer before every generation call. Draft regeneration button (low-complexity addition).

**Phase 3 — Automation:** Inngest functions with idempotency throughout. Calendar abstraction layer first, then 7 provider adapters. Gmail Pub/Sub watch + renewal cron. `cancelOn` for reply detection. Pre-send safety check as hard gate. Manual sequence trigger and sequence pause/resume.

**Phase 4 — Approval Channels:** Slack notifications must include full draft text + Approve/Hold buttons. Notification delivery tracking with fallback. Autonomous mode with Postgres-level lock on draft status transition.

**Phase 5 — Polish:** Locked module sell screens, onboarding wizard, settings. Playwright E2E: duplicate sequence prevention, cross-tenant isolation, pre-send safety check, webhook signature bypass.

## Open Questions

- **Inngest paid tier** — `step.sleepUntil` with DB-stored timestamps removes the free-tier 7-day sleep cap. Recommend this pattern unconditionally.
- **Calendar providers without no-show webhooks** — Setmore, MS Bookings, TidyCal may lack dedicated no-show events. Validate per provider before Phase 3.
- **Google OAuth app review timeline** — must exit "Testing" mode before launch. Initiate review in Phase 1.
- **Transcript provider APIs** — Fathom, Fireflies, Otter API patterns need dedicated research before Phase 2.
- **Voice model example selection UX** — should onboarding prompt coaches to find messages by category (no-show follow-up, hesitation response) or accept free-form paste? Validate with Daniel before Phase 2.

---
*Research completed: 2026-05-04*
*Confidence: HIGH — all critical stack/architecture decisions verified against official docs.*
