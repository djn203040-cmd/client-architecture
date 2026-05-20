# Phase 4: Approval Channels - Research

**Researched:** 2026-05-20
**Domain:** Multi-channel notification delivery (Slack OAuth + Block Kit interactivity, Resend transactional email, Twilio WhatsApp + SMS), tokenized review-page UX, Postgres advisory-lock CAS for autonomous mode, Inngest parallel fan-out
**Confidence:** HIGH (all 5 priority surfaces verified against official docs + npm registry within last 24h)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Slack approval mechanism:**
- **D-01:** Per-coach Slack OAuth install. Bot user OAuth token in Supabase Vault per coach. Scopes: `chat:write`, `im:write`, `commands` (reserved), `users:read`.
- **D-02:** Notifications land in DM from bot to coach. No channel picker at install. DM-only for Phase 4.
- **D-03:** Block Kit message — full draft body inline (never truncated, matches DRAFT-013) + three action buttons (Approve / Edit / Hold). Confidence badge when `confidence_level = "low"`. Edit button → modal pre-filled with draft text; submit saves edit AND approves in one step.
- **D-04:** Slack Approve is atomic — approve in place, send email immediately. Flow: button tap → `X-Slack-Signature` verify → Postgres advisory-lock acquire on `drafts.id` → status `pending → approved → sent` → Gmail send → Slack message updates to `✅ Approved — sent at {time}`. Same atomic path as dashboard Approve.
- **D-05:** Slack signing secret in env vars (`SLACK_SIGNING_SECRET`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`). Per-coach bot tokens through Supabase Vault.

**Email / WhatsApp / SMS UX:**
- **D-06:** Email link → tokenized review page (NOT magic-link login). Token = signed JWT `{ draft_id, coach_id, exp, nonce }`, 7-day expiry. Page renders same `DraftCard` as dashboard. Pattern reuses `apps/web/lib/unsubscribe-token.ts` HMAC shape.
- **D-07:** Resend email contains full draft inline (subject + body, never truncated) + "Review draft" button. Coach reads entire draft in inbox without clicking.
- **D-08:** WhatsApp Meta-approved UTILITY template with two variables: `{{lead_name}}`, `{{send_time}}`. Body: `"Draft ready for {{1}} — scheduled to send at {{2}}. Review: {{3}}"`. Link → same tokenized review page. Meta template approval initiated during Phase 4; WhatsApp Business Number provisioning is Daniel's prerequisite outside the codebase.
- **D-09:** SMS short alert + short-link: `"Sonorous: Draft for {lead} ready. {short_link}"`. Single SMS, no multi-part. Short-link on our domain (`/r/{token}`) → 302 to full review page.
- **D-10:** Review-page tokens single-use for state-changing actions. Once acted (Approve/Hold), nonce consumed (`consumed_tokens` table). Re-using shows "Already actioned" state. Read-only viewing (`GET /review/{token}`) does NOT consume nonce.

**Notification channel preferences:**
- **D-11:** Enabled channels fire for every event type. Channel ON = all events; channel OFF = nothing.
- **D-12:** Single "Notifications" tab on Settings. 4 × 5 matrix (rows = event types; cols = dashboard/email/Slack/WhatsApp/SMS). Default: every cell checked for any connected channel. Disconnected channels = greyed-out columns with inline "Connect" CTA. Per-cell override supported (advanced).
- **D-13:** Dashboard column always locked ON. Coach cannot disable. Dashboard is source of truth.
- **D-14:** Parallel fan-out via Inngest. One `notification/*` event per logical notification. Inngest function uses `Promise.all` of `step.run("send-channel-X", ...)` for each enabled channel. Channel failures do NOT block others. Each `step.run` returns a `notification_log` row.
- **D-15:** WhatsApp + SMS are INDEPENDENT channels (not sequential fallback within a "mobile" channel). NOTIFY-005 reinterpretation: both fire in parallel when both enabled; coach unchecks one if they want only one. Hard bounce event is the one exception — SMS fires unconditionally even if WhatsApp disabled (bounces operationally critical per Phase 3 D-20).
- **D-16:** `notification_log` granularity — one row per channel attempt. Existing Phase 1 schema columns cover this 1:1.

**HOLD, Approve+Next, queue UX:**
- **D-17:** HOLD is terminal parked state for two paths: (1) coach taps Hold; (2) 48h silent cascade (DRAFT-007 +24h, DRAFT-008 +24h more). Both set `status = 'held'`, `held_at = now()`. Held drafts NEVER auto-expire.
- **D-18:** Held drafts in separate "Held" tab inside `DraftQueueScaffold`. Badge with count when > 0 (no badge when empty). Each held draft is full `DraftCard` with three actions: **Re-approve** (lock + pre-send safety check + send), **Edit** (opens `InlineDraftEditor`, saves+approves), **Cancel** (sets `status = 'cancelled'`; next sequence touchpoint unaffected).
- **D-19:** Approve+Next ordering — most-urgent first (`scheduled_send_at` ASC). Tiebreaker: `created_at` ASC. Same ordering everywhere.
- **D-20:** Empty-queue celebration — animated checkmark, copy exactly `"You're all caught up."`, one supporting stat below, "Back to dashboard" CTA. Reuses Framer Motion already in `DraftCard.tsx`.
- **D-21:** Follow-up CTA at +24h uses SAME dispatcher with different copy: `"Reminder: Draft for {lead} is still waiting. {review_link}"`. Same routing. Increments `drafts.followup_count` (new column).

**Autonomous mode + lock pattern:**
- **D-22:** Both autonomous modes use Postgres advisory locks keyed by `drafts.id` via `pg_try_advisory_xact_lock(hashtextextended(draft_id::text, 0))` inside a transaction. CAS path: BEGIN → try-lock → SELECT status → if still `pending`, UPDATE to target + set `status_locked_at = now()` → COMMIT. Concurrent attempts see status no-longer-`pending` and abort gracefully with "Already approved" toast / Slack ephemeral.
- **D-23:** Mode B = Inngest `step.sleepUntil(scheduled_send_at)` scheduled when draft is created. On wake, runs same lock+CAS path as coach approval. If coach already approved manually, wake step exits gracefully.
- **D-24:** Mode A — drafts created with `status = 'approved'` directly. Briefly visible in dashboard but cannot be edited/held. Mode A toggle requires high-friction confirmation: coach must type "send without review" verbatim.

**Schema additions (D-25, D-26):**
- New migration adds: `drafts.followup_count INTEGER NOT NULL DEFAULT 0`, `drafts.review_token_nonce UUID DEFAULT gen_random_uuid()`, `notification_preferences (coach_id, event_type, channel) → enabled BOOLEAN` composite PK, `consumed_tokens (token_id UUID PK, coach_id, draft_id, action, consumed_at)`. RLS scoped to `coach_id`. Default rows seeded for every connected channel × every event type on channel-connect.
- No changes to existing `notification_log` table.

### Claude's Discretion

- Exact JWT signing algorithm for review tokens (recommendation: HS256 with `JWT_REVIEW_SECRET` env var, but planner picks)
- Exact Block Kit JSON structure of the draft-notification message
- Exact short-link route shape (`/r/{token}` vs `/review/{token}`) — pick one
- Whether to extract a generic `lib/notifications/dispatcher.ts` now or inline channel sends in Inngest functions (recommendation: thin dispatcher with one function per channel)
- Whether Meta template approval is in scope of Phase 4 implementation or treated as external task (researcher verified — see Open Questions)

### Deferred Ideas (OUT OF SCOPE)

- Per-event override of channel routing inside an enabled channel (matrix supports it but is advanced; headline UX is channel ON = all events)
- Slack channel destination vs DM (channel picker deferred to Phase 5)
- Slack slash command `/sonorous draft <lead>` (Phase 5+)
- Twilio Conversations API for reply-to-approve (deferred — Phase 4 ships review-link approve)
- Per-coach "from address" on Resend (requires per-coach SPF/DKIM; deferred to Phase 5+ onboarding)
- Voice memo notifications (out of scope)
- Push notifications to coach's phone (PWA could be Phase 5)
- Bulk-approve all pending drafts (risky enough to be its own phase)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-001 | Draft surfaces to coach 24 hours before intended send | Inngest sequence already sets `drafts.scheduled_send_at`; notification dispatcher fires `notification/draft_ready` at draft insert time. See `## Architecture Patterns`. |
| DRAFT-002 | Coach notified on all connected channels when draft is ready | Inngest parallel fan-out via `Promise.all` (see ## Architecture Patterns → Pattern 2). Dispatcher reads `notification_preferences` (D-25). |
| DRAFT-007 | If no action after 24h: follow-up CTA sent, another 24h window opens | Inngest `step.sleepUntil(draft.created_at + 24h)` → re-fire dispatcher with `notification/draft_followup` event. Increments `drafts.followup_count` (D-25). |
| DRAFT-008 | If no action after second 24h: draft moves to HOLD | Second `step.sleepUntil(+24h)` after follow-up. CAS update `status → held` if still `pending`. Same advisory-lock pattern as autonomous mode. |
| DRAFT-009 | Autonomous Mode A: auto-sends without review | Draft inserts with `status = 'approved'`; Gmail send fires immediately (D-24). High-friction toggle confirmation. |
| DRAFT-010 | Autonomous Mode B: 24h window, auto-sends on timeout | `step.sleepUntil(scheduled_send_at)` scheduled at draft creation. Wake → advisory-lock CAS → if still `pending`, send (D-23). |
| DRAFT-011 | Draft status transitions use Postgres-level lock | `pg_try_advisory_xact_lock(hashtextextended(draft_id::text, 0))` inside RPC function. See ## Pattern 4. |
| COMPLY-006 | Hard bounce notification multi-channel with lead name, email, CTA | Existing `bounce-handler.ts` already inserts `notification_log` row with `status = 'pending'`. Phase 4 dispatcher picks it up and fans out to all channels. SMS unconditional per D-15. |
| NOTIFY-001 | Dashboard notifications: draft ready, lead replied, integration broken, bounce | Realtime on `notification_log` filtered by `coach_id` powers dashboard. Dashboard column locked ON (D-13). |
| NOTIFY-002 | Email via Resend: draft ready with direct link | Resend SDK `resend.emails.send({ from, to, replyTo, subject, html, text })`. Review link uses HS256 JWT. |
| NOTIFY-003 | Slack: draft notification with full text + Approve/Hold buttons | Block Kit `chat.postMessage` with header + section (body) + actions (3 buttons). Interactivity webhook handles button clicks. |
| NOTIFY-004 | Twilio WhatsApp: draft notification to coach's WhatsApp | Twilio Content API + ContentSid for approved template. ContentVariables `{"1": leadName, "2": sendTime, "3": reviewLink}`. |
| NOTIFY-005 | Twilio SMS: fallback if WhatsApp delivery fails | Per D-15 reinterpretation: SMS fires in parallel (not sequential fallback) unless coach disables; SMS unconditional for hard-bounce event. |
| NOTIFY-006 | Coach receives notification on all connected channels simultaneously | Inngest `Promise.all([step.run(...), step.run(...), ...])` pattern fans out. |
| NOTIFY-007 | Notification delivery tracked — failed delivery logged, fallback attempted | Each `step.run` writes `notification_log` row with `status` (`pending → sent → delivered` from status callback). Twilio + Resend webhooks update `notification_log.status` by `external_id`. |
| NOTIFY-008 | Approve-from-Slack: coach can approve draft directly in Slack | Block Kit Approve button → interactivity webhook → advisory-lock CAS path (D-04) → `response_url` update to "✅ Approved — sent at {time}". |

</phase_requirements>

## Summary

Phase 4 wires four independent third-party channels (Resend, Slack, Twilio WhatsApp, Twilio SMS) onto a single internal dispatcher that fans out via Inngest's parallel-step pattern. Every external surface has well-trodden Node SDKs (`resend@6.12.3`, `@slack/web-api@7.16.0` or `@slack/bolt@4.7.2`, `twilio@6.0.2`) with a 2025-current API. The non-obvious work is in the integration glue: Slack OAuth v2 install + per-coach bot-token storage in Supabase Vault, Block Kit interactivity webhook with `X-Slack-Signature` HMAC verification, Twilio Content API for the Meta-approved utility template, and a single HS256 JWT shape for the tokenized review page that mirrors the existing `unsubscribe-token.ts` HMAC pattern.

The highest-risk piece is **autonomous mode's Postgres advisory-lock CAS**. The project uses Supabase via `@supabase/supabase-js` (PostgREST/HTTP), which routes through Supavisor transaction-pooled connections under the hood. Session-mode `pg_advisory_lock` would NOT work across pooled connections, but **`pg_try_advisory_xact_lock` is transaction-scoped and safe** — every PostgREST RPC call runs in a single transaction. We expose the CAS path as a `SECURITY DEFINER` RPC in the `private` schema (per INFRA-003) that does `BEGIN → pg_try_advisory_xact_lock(hashtextextended(...)) → SELECT/UPDATE → COMMIT` atomically in one call.

The second risk is **Meta WhatsApp template approval timing**. Twilio's Content API submits the template to Meta, which usually approves utility templates in minutes but can take up to 48h — and template body changes require re-approval. The exact D-08 body has UTILITY-category-compliant copy (status update about a pending transaction) and is locked in CONTEXT.md, so the planner must submit once and not iterate. Daniel's WhatsApp Business Number provisioning is a prerequisite Daniel handles outside the codebase; the planner should scope template submission as a Phase 4 task but treat actual production sends as gated on approval status.

**Primary recommendation:** Build a thin `lib/notifications/dispatcher.ts` with one function per channel (`sendEmail`, `sendSlack`, `sendWhatsApp`, `sendSMS`), call it from a single Inngest function (`notification-dispatcher`) that reads `notification_preferences` and fans out via `Promise.all`. Reuse the existing `unsubscribe-token.ts` HMAC pattern for review tokens (don't introduce a new JWT library — `jose@6.2.3` is fine but adds a dep we don't need given the existing HMAC shape works). Wrap the advisory-lock CAS in a `private.approve_draft_atomic(p_draft_id UUID, p_actor TEXT)` RPC so every approval path (dashboard, Slack, Mode B wake, Held tab Re-approve) calls one verified function.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Slack OAuth install + token storage | API / Backend | Database (Supabase Vault) | OAuth secrets never touch the browser. Same pattern as Gmail OAuth in Phase 1. |
| Slack interactivity webhook (Approve button click) | API / Backend | Database (advisory lock RPC) | Webhook signature verification + atomic state transition are server-only. |
| Slack message dispatch (`chat.postMessage`) | API / Backend (Inngest worker) | — | Bot token is server-side; SDK call is server-only. |
| Slack modal (Edit) views.open + views_submission | API / Backend | — | Server holds the `trigger_id` from interactivity payload; opens + handles submit server-side. |
| Resend email send | API / Backend (Inngest worker) | — | API key in env; email body templating is server-side. |
| Resend webhook (delivery, bounce) | API / Backend | Database (`notification_log` update) | Svix signature verification + status update by `external_id`. |
| Twilio WhatsApp send | API / Backend (Inngest worker) | — | Twilio account credentials server-side. Content API call. |
| Twilio SMS send | API / Backend (Inngest worker) | — | Same — Twilio credentials server-side. |
| Twilio StatusCallback webhook | API / Backend | Database (`notification_log` update) | `X-Twilio-Signature` verification + status update by `external_id`. |
| Tokenized review page render | Frontend Server (SSR) | API / Backend (token verify) | Server reads token, verifies signature + nonce, hydrates `DraftCard` server-side. |
| Tokenized review page actions (Approve/Hold) | API / Backend | Database (advisory lock + consume nonce) | Same CAS path as dashboard. Nonce consumption in `consumed_tokens`. |
| Dashboard "Held" tab UI | Frontend Server (SSR) + Client | API / Backend | Server renders initial list, Realtime client filters `drafts` where `status = 'held'`. |
| Notification matrix Settings UI | Frontend Server (SSR) + Client | API / Backend | Server fetches `notification_preferences`; client toggles update via PATCH. |
| Postgres advisory-lock CAS | Database (RPC) | API / Backend (caller) | Lock must be transactional and centralized; expose as `SECURITY DEFINER` RPC in `private` schema. |
| Inngest `notification-dispatcher` function | API / Backend (Inngest worker) | — | Fan-out logic + per-channel retry semantics live in the Inngest runtime. |
| Inngest `draft-followup-cta` + `draft-hold-cascade` | API / Backend (Inngest worker) | — | Time-based state transitions via `step.sleepUntil`. |
| Inngest `autonomous-mode-b-timer` | API / Backend (Inngest worker) | Database (RPC) | `step.sleepUntil(scheduled_send_at)` → CAS RPC on wake. |
| Mode A "type-to-confirm" toggle | Client → API | Database | Client-side text-match validation + server-side write to `coaches.autonomous_mode`. |

## Project Constraints (from CLAUDE.md)

The planner MUST honor these directives without exception:

| Constraint | Source | Phase 4 implication |
|------------|--------|---------------------|
| RLS on every Supabase table, scoped to `coach_id` | CLAUDE.md Security | `notification_preferences` and `consumed_tokens` (new tables, D-25) both need `coach_id`-scoped RLS policies. |
| Service role key server-side only — never in client code | CLAUDE.md Security | `apps/web/lib/supabase/admin.ts` only — never imported into client components. |
| OAuth tokens in Supabase Vault — not plain database columns | CLAUDE.md Security | Slack bot token (`xoxb-...`) goes through the existing `private.upsert_integration_secret` Vault helper (already used for Gmail in `20260505000005_vault.sql`). |
| Zod validation on every API boundary | CLAUDE.md Security | Slack interactivity payload, Twilio status callback, Resend webhook, review-page token actions — all `z.object({...})` validated before processing. |
| Webhook signature verification on every incoming webhook | CLAUDE.md Security | `X-Slack-Signature` (HMAC-SHA256 over `v0:{timestamp}:{rawBody}`), `X-Twilio-Signature` (use `twilio.validateRequest`), Resend Svix signature (use `resend.webhooks.verify`). Reject all unsigned. |
| No sensitive data in `console.log` | CLAUDE.md Security | Never log full bot tokens, JWTs, draft bodies. Log shape: `{ coachId, eventType, channelCount }`. |
| TypeScript strict, no `any` | CLAUDE.md TypeScript | Shared types in `packages/shared/` — define `TNotificationEvent`, `TChannelResult` there. |
| Components under 200 lines | CLAUDE.md Code Quality | `NotificationMatrix` likely needs to split into `NotificationMatrix` + `ChannelColumn` + `EventTypeRow`. |
| Glass/frosted cards, warm uplifting colors | CLAUDE.md Design | Held tab cards reuse existing `DraftCard` glass treatment. Celebration empty-state uses warm tones, not neon. |
| Premium copy throughout — no generic placeholders | CLAUDE.md Copy | Empty-queue exact copy `"You're all caught up."`, type-to-confirm exact copy `"send without review"`, Slack approved-state exact copy `"✅ Approved — sent at {time}"` are all locked in CONTEXT.md. |
| All `SECURITY DEFINER` functions live in `private` schema | INFRA-003 | The new `approve_draft_atomic` advisory-lock RPC goes in `private`, not `public`. |
| Supavisor port 6543 transaction mode for Vercel function connections | INFRA-004 | This is why `pg_try_advisory_xact_lock` (not `pg_advisory_lock`) is mandatory — see Pitfall 1. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | 6.12.3 | Email send + webhook verification | `[VERIFIED: npm view resend version]` Official SDK; native React Email support; built-in Svix signature verification helper. |
| `@slack/web-api` | 7.16.0 | Slack Web API client (`chat.postMessage`, `views.open`, `oauth.v2.access`) | `[VERIFIED: npm view @slack/web-api version]` Official, lower-level than Bolt; matches our needs (we already have a Next.js route layer — Bolt's framework adapters would conflict). |
| `twilio` | 6.0.2 | WhatsApp Content API + SMS + StatusCallback signature validation | `[VERIFIED: npm view twilio version]` Official; `validateRequest` is the canonical X-Twilio-Signature verifier. |
| `inngest` | 4.4.0 | Already installed at 4.2.6 (upgrade optional) | `[VERIFIED: npm view inngest version + apps/web/package.json]` Phase 3 already uses this; Phase 4 adds 4 new functions to the same `serve()`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jose` | 6.2.3 | JWT sign/verify with HS256 | `[VERIFIED: npm view jose version]` ONLY if planner decides to use JWT instead of the existing HMAC pattern. **Recommendation: don't add — reuse `unsubscribe-token.ts` shape.** |
| `node:crypto` | builtin | HMAC-SHA256 for Slack signature + review token | Already used in `unsubscribe-token.ts`. No new dep. |
| `framer-motion` | 12.38.0 (installed) | Empty-state celebration animation | Already used in `DraftCard.tsx`. Same patterns. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@slack/web-api` (low-level) | `@slack/bolt` (framework) | Bolt 4.7.2 bundles a receiver (Express/HTTP). Conflicts with Next.js App Router route handlers. Bolt's value is the OAuth helpers + event-routing DSL — we can replicate the small subset we need (`/install`, `/callback`, `/interactivity`) with the lower-level `@slack/web-api` plus our own HMAC verify. **Recommend `@slack/web-api`.** `[CITED: https://docs.slack.dev/authentication/installing-with-oauth/]` |
| HMAC pattern in `unsubscribe-token.ts` | `jose` (JWT HS256) | JWT gives standard claims (`exp`, `iat`, `sub`) for free and well-trodden libs. HMAC is simpler and we already own the pattern. Both work. **Recommend HMAC for consistency with Phase 3; document the payload shape.** |
| Resend for email | SendGrid / Mailgun / Postmark | CLAUDE.md locks Resend. Don't re-debate. |
| Custom short-link service | Bitly / Rebrandly | Locked in D-09 to our own `/r/{token}` route. Avoids external dep + extra cost + extra logging surface. |

**Installation:**
```bash
pnpm --filter web add resend @slack/web-api twilio
# jose is NOT recommended — reuse existing HMAC pattern from unsubscribe-token.ts
```

**Version verification:**
```bash
npm view resend version          # 6.12.3 (verified 2026-05-20)
npm view @slack/web-api version  # 7.16.0 (verified 2026-05-20)
npm view twilio version          # 6.0.2  (verified 2026-05-20)
npm view jose version            # 6.2.3  (verified 2026-05-20)
npm view inngest version         # 4.4.0  (installed 4.2.6, upgrade optional)
```

## Architecture Patterns

### System Architecture Diagram

```
                                  ┌──────────────────────────────────┐
                                  │  Phase 3 source events           │
                                  │  • draft inserted (pending)      │
                                  │  • LEAD_REPLIED                  │
                                  │  • notification_log row (bounce) │
                                  │  • integration health change     │
                                  └─────────────┬────────────────────┘
                                                │
                                                ▼
                              ┌────────────────────────────────────┐
                              │ Inngest event: notification/{type} │
                              └─────────────┬──────────────────────┘
                                            │
                                            ▼
                          ┌────────────────────────────────────────┐
                          │ Inngest fn: notification-dispatcher    │
                          │                                        │
                          │ 1. Load coach + notification_prefs     │
                          │ 2. Enabled channels = prefs ∩ connected│
                          │ 3. Await Promise.all([                 │
                          │      step.run("send-dashboard", ...),  │
                          │      step.run("send-email", ...),      │
                          │      step.run("send-slack", ...),      │
                          │      step.run("send-whatsapp", ...),   │
                          │      step.run("send-sms", ...),        │
                          │    ])                                  │
                          │ 4. Each step writes notification_log   │
                          └─────────────┬──────────────────────────┘
                                        │
        ┌───────────────────┬───────────┼───────────────────┬───────────────────┐
        ▼                   ▼           ▼                   ▼                   ▼
┌──────────────┐ ┌────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│Dashboard     │ │Resend          │ │Slack         │ │Twilio        │ │Twilio        │
│Realtime push │ │emails.send()   │ │chat.post     │ │WhatsApp      │ │SMS Programm. │
│(no external) │ │HTML + plain    │ │Message()     │ │Content API   │ │Messaging API │
│              │ │+ review link   │ │Block Kit     │ │ContentSid    │ │160-char body │
│              │ │                │ │+ 3 buttons   │ │+ variables   │ │+ /r/{token}  │
└──────────────┘ └────────┬───────┘ └───────┬──────┘ └───────┬──────┘ └───────┬──────┘
                          │                 │                 │                 │
                          ▼                 ▼                 ▼                 ▼
                ┌────────────────────────────────────────────────────────────────┐
                │ Inbound webhooks (each with signature verification)            │
                │ • /api/webhooks/resend       (Svix sig) → update notification_log
                │ • /api/webhooks/slack/interactivity (X-Slack-Signature)
                │ • /api/webhooks/twilio/status (X-Twilio-Signature)
                └─────────────────────────────┬──────────────────────────────────┘
                                              │
                                              ▼ (Slack Approve button only)
                                  ┌──────────────────────────────────┐
                                  │ private.approve_draft_atomic RPC │
                                  │ BEGIN                            │
                                  │   pg_try_advisory_xact_lock(...) │
                                  │   SELECT status FROM drafts      │
                                  │   IF pending → UPDATE → approved │
                                  │ COMMIT                           │
                                  └─────────────┬────────────────────┘
                                                │
                                                ▼
                                  ┌──────────────────────────────────┐
                                  │ Gmail send (existing Phase 3)    │
                                  └──────────────────────────────────┘

Independent timer paths (Inngest sleepUntil):
  draft created → sleepUntil(+24h) → if still pending → fire follow-up CTA
                  sleepUntil(+48h) → if still pending → status → held (CAS)
  draft created (Mode B) → sleepUntil(scheduled_send_at) → CAS → send
```

### Recommended Project Structure

```
apps/web/
├── app/
│   ├── (review)/
│   │   ├── r/[token]/page.tsx              # short-link redirect → /review/[token]
│   │   └── review/[token]/page.tsx         # full review page (renders DraftCard)
│   ├── (dashboard)/
│   │   └── settings/
│   │       └── notifications/page.tsx      # 4×5 matrix UI
│   ├── api/
│   │   ├── auth/slack/
│   │   │   ├── install/route.ts            # GET → redirect to slack.com/oauth/v2/authorize
│   │   │   └── callback/route.ts           # GET → exchange code → vault write → redirect
│   │   ├── webhooks/
│   │   │   ├── slack/interactivity/route.ts  # POST → X-Slack-Signature verify → handle
│   │   │   ├── twilio/status/route.ts        # POST → validateRequest → update log
│   │   │   └── resend/route.ts               # POST → Svix verify → update log
│   │   ├── review/[token]/
│   │   │   ├── route.ts                    # PATCH approve/hold (consumes nonce)
│   │   │   └── data/route.ts               # GET draft data (read-only, doesn't consume)
│   │   └── inngest/route.ts                # register Phase 4 functions
├── components/
│   ├── drafts/
│   │   ├── DraftCard.tsx                   # REUSE — no changes
│   │   ├── DraftQueueScaffold.tsx          # EXTEND — add "Held" tab
│   │   ├── HeldDraftsTab.tsx               # NEW — wraps DraftCard with Re-approve/Edit/Cancel
│   │   └── EmptyQueueCelebration.tsx       # NEW — Framer Motion checkmark
│   ├── notifications/
│   │   └── NotificationMatrix.tsx          # NEW — 4×5 grid
│   └── settings/
│       └── AutonomousModeToggle.tsx        # NEW — type-to-confirm modal for Mode A
├── lib/
│   ├── notifications/
│   │   ├── dispatcher.ts                   # sendNotification({ coachId, eventType, payload })
│   │   ├── channels/
│   │   │   ├── email.ts                    # Resend wrapper
│   │   │   ├── slack.ts                    # Block Kit builder + chat.postMessage
│   │   │   ├── whatsapp.ts                 # Twilio Content API wrapper
│   │   │   ├── sms.ts                      # Twilio Programmable Messaging wrapper
│   │   │   └── dashboard.ts                # writes notification_log row (Realtime delivers)
│   │   └── templates/
│   │       ├── draft-ready.ts              # copy variants per channel
│   │       ├── draft-followup.ts
│   │       └── bounce.ts
│   ├── review-token.ts                     # NEW — HMAC sign/verify (mirrors unsubscribe-token.ts)
│   ├── slack/
│   │   ├── signature.ts                    # X-Slack-Signature verify
│   │   ├── oauth.ts                        # OAuth v2 install + callback helpers
│   │   └── blocks.ts                       # Block Kit builders
│   └── supabase/admin.ts                   # REUSE
├── inngest/
│   ├── functions/
│   │   ├── notification-dispatcher.ts      # NEW — Promise.all fan-out
│   │   ├── draft-followup-cta.ts           # NEW — sleepUntil(+24h)
│   │   ├── draft-hold-cascade.ts           # NEW — sleepUntil(+48h) → CAS → held
│   │   └── autonomous-mode-b-timer.ts      # NEW — sleepUntil(scheduled_send_at) → CAS → send
│   └── client.ts                           # REUSE
└── supabase/migrations/
    └── 20260520000001_phase4_approval.sql  # NEW per D-25/D-26
```

### Pattern 1: Slack Block Kit message + interactivity verify

**What:** Compose a Block Kit message with header + section (full body) + actions block. Verify inbound interactivity with HMAC-SHA256 over the **raw** request body.

**When to use:** Every Slack notification for a draft + every button click response.

**Example:**
```typescript
// Source: https://docs.slack.dev/reference/methods/chat.postMessage
// Source: https://docs.slack.dev/reference/block-kit/blocks

// apps/web/lib/slack/blocks.ts
export function buildDraftReadyBlocks(args: {
  draftId: string;
  leadName: string;
  subject: string;
  body: string;
  confidenceLevel: "high" | "low";
  scheduledSendAt: string;
}) {
  const blocks: Array<unknown> = [
    { type: "header", text: { type: "plain_text", text: `Draft ready: ${args.leadName}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Subject:* ${args.subject}` } },
    { type: "section", text: { type: "mrkdwn", text: args.body } }, // full body, never truncated
    {
      type: "actions",
      block_id: `draft_actions_${args.draftId}`,
      elements: [
        { type: "button", style: "primary", text: { type: "plain_text", text: "Approve" },
          action_id: "approve", value: args.draftId },
        { type: "button", text: { type: "plain_text", text: "Edit" },
          action_id: "edit", value: args.draftId },
        { type: "button", style: "danger", text: { type: "plain_text", text: "Hold" },
          action_id: "hold", value: args.draftId },
      ],
    },
  ];
  if (args.confidenceLevel === "low") {
    blocks.splice(1, 0, {
      type: "context",
      elements: [{ type: "mrkdwn", text: "⚠️ *Low confidence* — voice model has fewer than 8 examples." }],
    });
  }
  return blocks;
}
```

```typescript
// Source: https://docs.slack.dev/authentication/verifying-requests-from-slack/
// apps/web/lib/slack/signature.ts
import { createHmac, timingSafeEqual } from "crypto";

export function verifySlackSignature(args: {
  signingSecret: string;
  timestamp: string;            // X-Slack-Request-Timestamp header
  signature: string;            // X-Slack-Signature header
  rawBody: string;              // MUST be raw body, not parsed
}): boolean {
  // Replay-attack protection: 5 minute window
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(args.timestamp)) > 300) return false;

  const baseString = `v0:${args.timestamp}:${args.rawBody}`;
  const computed = "v0=" + createHmac("sha256", args.signingSecret).update(baseString).digest("hex");

  const a = Buffer.from(computed);
  const b = Buffer.from(args.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

```typescript
// apps/web/app/api/webhooks/slack/interactivity/route.ts
export async function POST(req: Request) {
  const rawBody = await req.text();                    // raw text BEFORE parsing
  const ts = req.headers.get("x-slack-request-timestamp") ?? "";
  const sig = req.headers.get("x-slack-signature") ?? "";
  if (!verifySlackSignature({ signingSecret: process.env.SLACK_SIGNING_SECRET!, timestamp: ts, signature: sig, rawBody })) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Body is application/x-www-form-urlencoded with a `payload` field that's a JSON string
  const params = new URLSearchParams(rawBody);
  const payload = JSON.parse(params.get("payload") ?? "{}");
  // Route by payload.type: "block_actions" | "view_submission"
  // For Approve: extract draft_id from payload.actions[0].value, call RPC, POST update to payload.response_url
}
```

### Pattern 2: Inngest parallel fan-out per channel

**What:** Build channel `step.run()` promises **without awaiting**, then `await Promise.all(...)`. Each step retries independently per function-level `retries` config.

**When to use:** `notification-dispatcher` for every notification event.

**Example:**
```typescript
// Source: https://www.inngest.com/docs/guides/step-parallelism
// apps/web/inngest/functions/notification-dispatcher.ts
import { inngest } from "@/inngest/client";

export const notificationDispatcher = inngest.createFunction(
  { id: "notification-dispatcher", retries: 3 },
  { event: "notification/dispatch" },
  async ({ event, step }) => {
    const { coachId, eventType, payload } = event.data;

    const prefs = await step.run("load-prefs", async () => loadEnabledChannels(coachId, eventType));

    // Build promises WITHOUT await — Inngest schedules them in parallel
    const channelSteps = [
      step.run("send-dashboard", () => sendDashboard({ coachId, eventType, payload })),
      ...(prefs.email    ? [step.run("send-email",    () => sendEmail({ coachId, eventType, payload }))] : []),
      ...(prefs.slack    ? [step.run("send-slack",    () => sendSlack({ coachId, eventType, payload }))] : []),
      ...(prefs.whatsapp ? [step.run("send-whatsapp", () => sendWhatsApp({ coachId, eventType, payload }))] : []),
      ...(prefs.sms      ? [step.run("send-sms",      () => sendSMS({ coachId, eventType, payload }))] : []),
    ];

    // Promise.allSettled — one failed channel does NOT fail the function
    const results = await Promise.allSettled(channelSteps);
    return { dispatched: results.length, results };
  }
);
```

### Pattern 3: Resend transactional send + Svix webhook verify

**What:** `resend.emails.send({ from, to, replyTo, subject, html, text })`. Receive delivery events via webhook with Svix signature verification.

**When to use:** Every email notification + every webhook callback.

**Example:**
```typescript
// Source: https://resend.com/docs/send-with-nextjs
// apps/web/lib/notifications/channels/email.ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(args: {
  coachId: string;
  to: string;
  replyTo: string;       // coach's gmail address (so replies route to coach)
  subject: string;
  html: string;
  text: string;
}) {
  const { data, error } = await resend.emails.send({
    from: "Sonorous Drafts <drafts@sonorous.app>",  // configurable; D-07 uses sonorous-owned for Phase 4
    to: args.to,
    replyTo: args.replyTo,
    subject: args.subject,
    html: args.html,
    text: args.text,                                 // plain text fallback required
  });
  if (error) throw error;
  return { external_id: data!.id };                  // store in notification_log.external_id
}
```

```typescript
// Source: https://resend.com/docs/webhooks/introduction
// apps/web/app/api/webhooks/resend/route.ts
import { Webhook } from "svix";  // peer dep, install if needed
export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
  let event;
  try { event = wh.verify(rawBody, headers); }
  catch { return new Response("Invalid signature", { status: 401 }); }

  // event.type: 'email.sent' | 'email.delivered' | 'email.bounced' | ...
  // event.data.email_id matches notification_log.external_id
}
```

### Pattern 4: Twilio WhatsApp Content API + SMS + StatusCallback

**What:** WhatsApp uses Content API (`ContentSid` of pre-approved template + `ContentVariables` map). SMS uses Programmable Messaging directly. Both expose `StatusCallback` URL for delivery tracking.

**When to use:** Every WhatsApp and SMS notification + every status webhook.

**Example:**
```typescript
// Source: https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates
// apps/web/lib/notifications/channels/whatsapp.ts
import twilio from "twilio";
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendWhatsApp(args: {
  toWhatsApp: string;            // "whatsapp:+1234567890"
  leadName: string;
  sendTime: string;
  reviewLink: string;
}) {
  const message = await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: args.toWhatsApp,
    contentSid: process.env.TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID!,
    contentVariables: JSON.stringify({
      "1": args.leadName,
      "2": args.sendTime,
      "3": args.reviewLink,
    }),
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
  });
  return { external_id: message.sid };
}
```

```typescript
// Source: https://www.twilio.com/docs/usage/webhooks/webhooks-security
// apps/web/app/api/webhooks/twilio/status/route.ts
import twilio from "twilio";
export async function POST(req: Request) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`;
  const sig = req.headers.get("x-twilio-signature") ?? "";

  const valid = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, sig, fullUrl, params);
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // params.MessageSid → notification_log.external_id
  // params.MessageStatus → 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'
}
```

### Pattern 5: Postgres advisory-lock CAS via SECURITY DEFINER RPC

**What:** Wrap the lock + state transition in a single `SECURITY DEFINER` function in `private` schema. Every approve path calls this one function. `pg_try_advisory_xact_lock` is **transaction-scoped** — safe with Supavisor transaction pooling.

**When to use:** Every state transition that must be atomic (Slack Approve, dashboard Approve, review-page Approve, Mode B wake step, Held-tab Re-approve, hold-cascade `pending → held`).

**Example:**
```sql
-- Source: https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS
-- Source: https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI
-- supabase/migrations/20260520000001_phase4_approval.sql

CREATE OR REPLACE FUNCTION private.approve_draft_atomic(
  p_draft_id UUID,
  p_actor TEXT                   -- 'dashboard' | 'slack' | 'review_link' | 'mode_b' | 'reapprove'
)
RETURNS TABLE (ok BOOLEAN, reason TEXT, new_status draft_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_lock_acquired BOOLEAN;
  v_current_status draft_status;
BEGIN
  -- Hash UUID → bigint key for the advisory lock
  v_lock_acquired := pg_try_advisory_xact_lock(hashtextextended(p_draft_id::text, 0));
  IF NOT v_lock_acquired THEN
    RETURN QUERY SELECT false, 'concurrent_attempt'::TEXT, NULL::draft_status;
    RETURN;
  END IF;

  SELECT status INTO v_current_status FROM drafts WHERE id = p_draft_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'draft_not_found'::TEXT, NULL::draft_status;
    RETURN;
  END IF;

  IF v_current_status != 'pending' THEN
    RETURN QUERY SELECT false, ('not_pending:' || v_current_status::TEXT)::TEXT, v_current_status;
    RETURN;
  END IF;

  UPDATE drafts
    SET status = 'approved', approved_at = now(), status_locked_at = now()
    WHERE id = p_draft_id;

  RETURN QUERY SELECT true, 'approved'::TEXT, 'approved'::draft_status;
END;
$$;

REVOKE ALL ON FUNCTION private.approve_draft_atomic FROM public;
GRANT EXECUTE ON FUNCTION private.approve_draft_atomic TO service_role;
```

```typescript
// apps/web/lib/drafts/approve-atomic.ts
import { adminClient } from "@/lib/supabase/admin";

export async function approveDraftAtomic(draftId: string, actor: string) {
  const { data, error } = await adminClient
    .schema("private")           // requires .schema() on @supabase/supabase-js v2.x
    .rpc("approve_draft_atomic", { p_draft_id: draftId, p_actor: actor });
  if (error) throw error;
  return data?.[0] ?? { ok: false, reason: "no_result" };
}
```

> NOTE on `.schema("private")`: the function lives in `private` per INFRA-003. `@supabase/supabase-js` v2 supports `.schema(name).rpc(...)`. Alternative: expose a thin `public.approve_draft_atomic` wrapper that calls the private function and rely only on the public wrapper from the app. Planner picks.

### Anti-Patterns to Avoid

- **Don't `await` each Inngest step.run() sequentially** — that serializes the channel sends. Build promise array first, then `Promise.all`. This is the bug the `Promise.all` pattern exists to prevent. `[CITED: https://www.inngest.com/docs/guides/step-parallelism]`
- **Don't use `pg_advisory_lock` (session form)** — it requires holding the same database connection across queries. Supavisor transaction mode breaks this. Always `pg_try_advisory_xact_lock`. `[CITED: https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI]`
- **Don't parse the Slack interactivity body before signature verify** — Slack hashes the raw body including whitespace. Read `await req.text()` first, verify, THEN parse. `[CITED: https://docs.slack.dev/authentication/verifying-requests-from-slack/]`
- **Don't hand-roll Twilio signature validation** — Twilio adds params over time without notice; `twilio.validateRequest` handles unknown params correctly. `[CITED: https://www.twilio.com/docs/usage/webhooks/webhooks-security]`
- **Don't store Slack bot token in `integrations.access_token` plain column** — use the existing `private.upsert_integration_secret` Vault helper. Same pattern as Gmail.
- **Don't bundle multiple SMS bodies** — the locked D-09 copy must fit in a single 160-char GSM-7 SMS to avoid multi-part billing. The `/r/{token}` short-link keeps it under budget.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slack signature verification | Custom HMAC + timestamp loop | The `verifySlackSignature` helper above (uses `crypto.timingSafeEqual`) | Timing attacks are real; use `timingSafeEqual` not `===`. 5-minute timestamp window is a non-obvious requirement. `[CITED: docs.slack.dev]` |
| Twilio webhook signature | Custom HMAC | `twilio.validateRequest(...)` | Twilio adds new params over time. SDK handles param sorting + URL normalization. `[CITED: twilio.com/docs/usage/webhooks/webhooks-security]` |
| Resend webhook signature | Custom HMAC | `new Webhook(secret).verify(body, headers)` from `svix` | Resend uses Svix's signing scheme. The Svix lib is the canonical verifier. `[CITED: resend.com/docs/webhooks/introduction]` |
| Slack OAuth code → token exchange | Custom POST to `oauth.v2.access` | `(new WebClient()).oauth.v2.access({ client_id, client_secret, code, redirect_uri })` | SDK handles content-type, error shapes, token field renames. `[CITED: docs.slack.dev/authentication/installing-with-oauth/]` |
| WhatsApp template payload variables | Hand-built JSON string | `{ contentSid, contentVariables: JSON.stringify({...}) }` via `client.messages.create` | The Content API has specific param names and string-vs-number quirks. `[CITED: twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates]` |
| Postgres advisory lock from app code | `client.query("SELECT pg_try_advisory_xact_lock(...)")` followed by separate UPDATE | Single `SECURITY DEFINER` RPC that wraps lock + CAS in one transaction | PostgREST → Supavisor → pooled connection: each HTTP call is one transaction. Splitting across calls loses the lock. Wrap it in an RPC. `[CITED: supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI]` |
| JWT for review tokens (if you skip jose) | Custom JWT encoder | Existing HMAC pattern from `apps/web/lib/unsubscribe-token.ts` | Already in the codebase; one less dep. Same security properties for our use case. |
| Per-coach RLS on `notification_preferences` | Manual coach_id filter in every query | RLS policy: `coach_id = auth.uid()` (or service-role bypass for admin Inngest contexts) | INFRA-001 mandate. Existing pattern from Phase 1. |

**Key insight:** Every external integration in Phase 4 has a 1st-party SDK with built-in signature verification. The biggest hand-rolling temptation is the advisory-lock CAS — and the correct answer is to push it into Postgres as a single RPC, not pull it up into Node.

## Common Pitfalls

### Pitfall 1: pg_advisory_lock loses lock across pooled connections
**What goes wrong:** You call `SELECT pg_advisory_lock(...)` from Node, then in a separate query do the state check + update. The second query runs on a different pooled connection. The lock isn't held there. Race condition unfixed.
**Why it happens:** Supavisor port 6543 (INFRA-004) is transaction mode. A "connection" from the app perspective is actually a checked-out connection per transaction. Session state (including session-scoped advisory locks) does NOT persist across transactions.
**How to avoid:** Use `pg_try_advisory_xact_lock` (transaction-scoped) inside a single transaction. Wrap the entire lock + check + update in one SQL function (SECURITY DEFINER RPC) so the whole thing is one PostgREST call = one transaction.
**Warning signs:** Concurrent approval attempts both "succeed" in tests. Both write to Gmail. Coach sees duplicate sends.

### Pitfall 2: Slack signature verification fails due to body parsing
**What goes wrong:** Next.js automatically parses JSON bodies. You receive `req.body` as an object. You stringify it back to compute the HMAC. The signature mismatch — because Slack hashed the original raw bytes including whitespace and key order.
**Why it happens:** Slack hashes raw bytes. `JSON.stringify(JSON.parse(...))` does not round-trip.
**How to avoid:** In the route handler, `await req.text()` to get the raw body. Verify signature on the raw text. Then `JSON.parse` or `URLSearchParams` for processing. Never re-stringify.
**Warning signs:** All Slack webhook calls return 401 in production but work locally with curl.

### Pitfall 3: Slack interactivity timeout (3-second response budget)
**What goes wrong:** You do the full advisory-lock CAS + Gmail send synchronously in the webhook handler. Takes 6 seconds. Slack times out at 3s and the user sees an error.
**Why it happens:** Slack requires HTTP 200 within 3 seconds. The button doesn't visibly fail, but Slack marks the interaction as errored.
**How to avoid:** Return `Response.json({ response_action: "clear" })` (or a 200 immediately) within 3s. Do the heavy work async — fire an Inngest event `slack/approve-clicked` and use `response_url` to update the message later (`response_url` is valid for 30 min, 5 updates max). Or: do the CAS quickly (it's a single RPC, ~50ms) and queue the Gmail send via Inngest event.
**Warning signs:** Slack shows "There was an error with this app" toast despite the backend working.

### Pitfall 4: WhatsApp template re-approval blocks production
**What goes wrong:** During Phase 4 testing, you tweak the template body. Each tweak requires re-approval (minutes to 48 hours). Production blocked.
**Why it happens:** Meta requires explicit approval of every utility template body. Changing the body changes the `ContentSid`. Once approved you can't edit in place.
**How to avoid:** Submit the locked D-08 body once, do not iterate. Store the approved `ContentSid` in env (`TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID`). Test send-path with Twilio sandbox templates BEFORE submitting the real template. `[CITED: twilio.com/docs/whatsapp/tutorial/message-template-approvals-statuses]`
**Warning signs:** Tests pass in sandbox; production sends fail with `63016` (template not found) or `63018` (template not approved).

### Pitfall 5: SMS body silently splits into multi-part
**What goes wrong:** Locked D-09 body `"Sonorous: Draft for {lead} ready. {short_link}"` is fine for short lead names + short tokens, but a long lead name like "Alessandro De Castellabate" plus a 25-char URL pushes past 160 chars. Twilio silently splits → 2x SMS billing.
**Why it happens:** GSM-7 encoding is 160 chars per part. Twilio charges per part, not per logical message.
**How to avoid:** Truncate lead name to 30 chars max. Keep `/r/{token}` route short — token should be a UUID4-base64 (~22 chars) or a short-id table lookup. Add a unit test: `expect(buildSmsBody({lead: "x".repeat(50), link: "https://sonorous.app/r/" + "a".repeat(22)}).length).toBeLessThanOrEqual(160)`.
**Warning signs:** Twilio billing dashboard shows 2x expected SMS count.

### Pitfall 6: Review token nonce race vs read-only viewing
**What goes wrong:** D-10 says read-only views DON'T consume the nonce, but state-changing actions DO. Implementation accidentally rotates the nonce on every page load. After one page view, the Approve button silently fails because the nonce in the JWT no longer matches `drafts.review_token_nonce`.
**Why it happens:** Easy to put nonce-consumption in the page load handler.
**How to avoid:** Nonce consumption happens ONLY in the PATCH `/api/review/{token}` handler (Approve/Hold), not the GET `/review/{token}` page handler. Write a Vitest case for the "view 3 times then approve" flow.
**Warning signs:** Coach reports "I clicked Approve from email and nothing happened."

### Pitfall 7: Notification matrix default-on for disconnected channels
**What goes wrong:** D-12 default is "every cell checked for any connected channel." Implementation seeds `notification_preferences` rows on coach creation for all channels, including disconnected ones. When the coach connects Slack later, every event fires on Slack with no opt-in moment.
**Why it happens:** Bulk seed at coach creation is simpler than per-channel-connect seed.
**How to avoid:** Seed `notification_preferences` rows in the OAuth callback for each provider (Slack callback seeds Slack rows; Twilio onboarding seeds WhatsApp + SMS rows). Idempotent upsert so re-connecting doesn't double-seed.
**Warning signs:** Coach: "I never asked to get Slack messages about bounces."

### Pitfall 8: Inngest step ID collisions in parallel fan-out
**What goes wrong:** All channels in `Promise.all` use the same step id (e.g., `"send-channel"`) — Inngest dedupes them and only one runs.
**Why it happens:** Inngest uses step IDs as memoization keys.
**How to avoid:** Use distinct step IDs per channel: `"send-dashboard"`, `"send-email"`, `"send-slack"`, etc. (matches the example in Pattern 2.) `[CITED: inngest.com/docs/reference/functions/step-run]`
**Warning signs:** Only one channel fires per event despite multiple being enabled.

## Code Examples

### Slack OAuth install + callback (per-coach)

```typescript
// Source: https://docs.slack.dev/authentication/installing-with-oauth/
// apps/web/app/api/auth/slack/install/route.ts
export async function GET(req: Request) {
  const coachId = await getCoachIdFromSession(req);
  const state = await signOAuthState({ coachId, t: Date.now() });   // HMAC-signed state
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID!);
  url.searchParams.set("scope", "chat:write,im:write,users:read");   // bot scopes — D-01
  url.searchParams.set("redirect_uri", `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/slack/callback`);
  url.searchParams.set("state", state);
  return Response.redirect(url.toString());
}
```

```typescript
// apps/web/app/api/auth/slack/callback/route.ts
import { WebClient } from "@slack/web-api";
export async function GET(req: Request) {
  const { code, state } = Object.fromEntries(new URL(req.url).searchParams);
  const { coachId } = await verifyOAuthState(state);

  const slack = new WebClient();   // no token — only used for oauth.v2.access
  const result = await slack.oauth.v2.access({
    client_id: process.env.SLACK_CLIENT_ID!,
    client_secret: process.env.SLACK_CLIENT_SECRET!,
    code,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/slack/callback`,
  });

  // result.access_token starts with "xoxb-"
  // result.bot_user_id, result.team.id are also stored
  const vaultId = await upsertIntegrationSecret(coachId, "slack", {
    bot_token: result.access_token!,
    bot_user_id: result.bot_user_id!,
    team_id: result.team!.id!,
    authed_user_id: result.authed_user!.id!,
  });
  // Seed notification_preferences rows for slack channel
  await seedNotificationPreferences(coachId, "slack");

  return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications?connected=slack`);
}
```

### Slack Approve button → response_url update

```typescript
// apps/web/app/api/webhooks/slack/interactivity/route.ts (excerpt — after signature verify)
const result = await approveDraftAtomic(draftId, "slack");
// Slack requires HTTP 200 within 3s. CAS is fast (~50ms) — synchronous is fine.

if (result.ok) {
  // Update the original message via response_url (no token needed — URL is auth)
  const sentAt = new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
  await fetch(payload.response_url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      replace_original: true,
      blocks: [{ type: "section", text: { type: "mrkdwn", text: `:white_check_mark: Approved — sent at ${sentAt}` } }],
    }),
  });
  // Fire Gmail send via Inngest event so we return 200 fast
  await inngest.send({ name: "draft/send-now", data: { draftId, coachId, source: "slack" } });
} else {
  await fetch(payload.response_url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ response_type: "ephemeral", text: `This draft is no longer pending (${result.reason}).` }),
  });
}
return new Response(null, { status: 200 });
```

### Review token shape (HMAC, mirrors unsubscribe-token.ts)

```typescript
// apps/web/lib/review-token.ts
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

interface ReviewPayload {
  draftId: string;
  coachId: string;
  nonce: string;          // matches drafts.review_token_nonce when first issued
  exp: number;            // unix seconds, 7-day expiry per D-06
}

export function generateReviewToken(p: Omit<ReviewPayload, "exp"> & { ttlSeconds?: number }): string {
  const secret = process.env.JWT_REVIEW_SECRET;          // new env var per Claude's Discretion
  if (!secret) throw new Error("JWT_REVIEW_SECRET not set");
  const exp = Math.floor(Date.now() / 1000) + (p.ttlSeconds ?? 7 * 24 * 60 * 60);
  const payload: ReviewPayload = { draftId: p.draftId, coachId: p.coachId, nonce: p.nonce, exp };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyReviewToken(token: string): ReviewPayload | null {
  const secret = process.env.JWT_REVIEW_SECRET;
  if (!secret) return null;
  const [encoded, providedSig] = token.split(".");
  if (!encoded || !providedSig) return null;
  const expectedSig = createHmac("sha256", secret).update(encoded).digest("hex");
  const a = Buffer.from(providedSig); const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ReviewPayload;
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch { return null; }
}
```

```typescript
// apps/web/app/api/review/[token]/route.ts (PATCH = state-changing → consumes nonce)
export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = verifyReviewToken(token);
  if (!payload) return Response.json({ error: "invalid_token" }, { status: 401 });

  // Atomic: check nonce matches, consume it, then run CAS
  const { data: nonceMatch } = await adminClient
    .from("drafts").select("review_token_nonce").eq("id", payload.draftId).single();
  if (nonceMatch?.review_token_nonce !== payload.nonce) {
    return Response.json({ error: "token_already_used" }, { status: 410 });   // Gone
  }

  // Insert to consumed_tokens BEFORE CAS — UNIQUE on (token_id) prevents replay
  const { error: consumeErr } = await adminClient.from("consumed_tokens").insert({
    token_id: payload.nonce,           // nonce serves as token_id
    coach_id: payload.coachId,
    draft_id: payload.draftId,
    action: req.headers.get("x-action") ?? "approve",
  });
  if (consumeErr) return Response.json({ error: "already_consumed" }, { status: 410 });

  // Rotate nonce so the link can't be reused
  await adminClient.from("drafts").update({ review_token_nonce: crypto.randomUUID() }).eq("id", payload.draftId);

  // Run the same atomic approve path
  const result = await approveDraftAtomic(payload.draftId, "review_link");
  return Response.json(result);
}
```

## Runtime State Inventory

Phase 4 is greenfield (new tables, new Inngest functions, new routes). No rename / refactor — this section is **non-applicable**, but for completeness:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — all new tables introduced by D-25 migration | None |
| Live service config | **Slack app registration** in Slack API console (Daniel creates app, sets redirect URI, sets signing secret, declares scopes — outside the codebase). **Twilio WhatsApp template submission** to Meta via Twilio console (Daniel/dev submits, awaits approval — see Pitfall 4). **Resend domain verification** (DNS records for `sonorous.app` — Daniel handles). **Resend webhook endpoint** registered in Resend dashboard pointing to `/api/webhooks/resend`. | Document in onboarding runbook; track as a Daniel-prereq checklist item alongside the WhatsApp Business Number provisioning already called out in D-08. |
| OS-registered state | None | None |
| Secrets/env vars | New env vars: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID`, `TWILIO_MESSAGING_SERVICE_SID` (for SMS), `JWT_REVIEW_SECRET`. All injected into Vercel project env. None reference renamed-things. | Add to `.env.example` + Vercel project config. |
| Build artifacts | None | None |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Resend account + verified domain | Email channel (NOTIFY-002) | Daniel-provisioned (external) | — | None — blocks email channel; can use Resend dev domain `onboarding@resend.dev` for testing |
| Slack app registered | Slack channel (NOTIFY-003, NOTIFY-008) | Daniel-provisioned (external) | — | None — blocks Slack channel; can use development workspace |
| Twilio account + WhatsApp Business Number + approved template | WhatsApp channel (NOTIFY-004) | Daniel-provisioned per D-08 (external) | — | Twilio sandbox `whatsapp:+14155238886` with pre-approved templates for dev |
| Twilio Messaging Service SID (for SMS) | SMS channel (NOTIFY-005) | Daniel-provisioned (external) | — | Twilio trial number for dev (US-only, requires verified destination) |
| `pg_try_advisory_xact_lock` Postgres function | Advisory-lock CAS (DRAFT-011) | ✓ (Postgres builtin) | Postgres 15+ on Supabase | — |
| `hashtextextended` Postgres function | Advisory-lock key derivation | ✓ (Postgres builtin) | Postgres 11+ | — |
| `supabase_vault` extension | Slack bot token storage | ✓ already enabled in `20260505000005_vault.sql` | — | — |
| `private` schema | RPC function location (INFRA-003) | ✓ existing convention from Phase 1 | — | — |
| Vercel Cron Jobs | Not required for Phase 4 (no time-based triggers other than Inngest sleepUntil) | ✓ but unused | — | — |
| Node `crypto` module | HMAC for Slack sig + review tokens | ✓ Node 22 builtin | 22.x | — |

**Missing dependencies with no fallback:** None inside the codebase — all blocking items are external (Daniel-handled per CONTEXT.md D-08, and the same pattern for Slack/Resend setup).

**Missing dependencies with fallback:** Production Twilio + production Resend domain can use sandbox/onboarding equivalents during development. Plan tasks accordingly: tests use sandbox; production deploy gated on Daniel-confirmed external setup.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (unit + integration) + Playwright 1.59.1 (E2E) |
| Config file | `apps/web/vitest.config.ts` (existing); `apps/web/playwright.config.ts` (existing) |
| Quick run command | `pnpm --filter web test:unit` |
| Full suite command | `pnpm --filter web test` (vitest + playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-001 | Draft surfaces 24h before send | integration | `pnpm --filter web vitest run tests/integration/notification-dispatcher.test.ts -t "fires draft_ready"` | ❌ Wave 0 |
| DRAFT-002 | Coach notified on all connected channels | integration | `pnpm --filter web vitest run tests/integration/notification-dispatcher.test.ts -t "fans out to all enabled"` | ❌ Wave 0 |
| DRAFT-007 | Follow-up CTA at +24h | integration | `pnpm --filter web vitest run tests/integration/draft-followup-cta.test.ts` | ❌ Wave 0 |
| DRAFT-008 | HOLD at +48h | integration | `pnpm --filter web vitest run tests/integration/draft-hold-cascade.test.ts` | ❌ Wave 0 |
| DRAFT-009 | Mode A auto-sends | unit + integration | `pnpm --filter web vitest run tests/unit/autonomous-mode.test.ts` | ❌ Wave 0 |
| DRAFT-010 | Mode B 24h auto-send | integration | `pnpm --filter web vitest run tests/integration/autonomous-mode-b.test.ts` | ❌ Wave 0 |
| DRAFT-011 | Advisory-lock CAS prevents double-send | integration | `pnpm --filter web vitest run tests/integration/approve-atomic.test.ts -t "concurrent attempts"` | ❌ Wave 0 |
| COMPLY-006 | Hard bounce notification multi-channel | integration | `pnpm --filter web vitest run tests/integration/bounce-notification.test.ts` | ❌ Wave 0 |
| NOTIFY-001 | Dashboard notification appears | E2E | `pnpm --filter web playwright test tests/e2e/dashboard-notifications.spec.ts` | ❌ Wave 0 |
| NOTIFY-002 | Resend email send + link works | integration | `pnpm --filter web vitest run tests/integration/email-channel.test.ts` (mocks Resend) | ❌ Wave 0 |
| NOTIFY-003 | Slack message posts with Block Kit | integration | `pnpm --filter web vitest run tests/integration/slack-channel.test.ts` (mocks WebClient) | ❌ Wave 0 |
| NOTIFY-004 | WhatsApp template message sends | integration | `pnpm --filter web vitest run tests/integration/whatsapp-channel.test.ts` (mocks twilio) | ❌ Wave 0 |
| NOTIFY-005 | SMS sends with body under 160 chars | unit | `pnpm --filter web vitest run tests/unit/sms-body.test.ts` | ❌ Wave 0 |
| NOTIFY-006 | All channels fire simultaneously | integration | `pnpm --filter web vitest run tests/integration/notification-dispatcher.test.ts -t "parallel"` | ❌ Wave 0 |
| NOTIFY-007 | Failed delivery logged + status updated | integration | `pnpm --filter web vitest run tests/integration/webhook-status.test.ts` | ❌ Wave 0 |
| NOTIFY-008 | Approve-from-Slack updates draft to sent | E2E (with mocked Slack) | `pnpm --filter web vitest run tests/integration/slack-interactivity.test.ts -t "approve flow"` | ❌ Wave 0 |
| Pitfall 5 (SMS length) | SMS body ≤ 160 chars | unit | `pnpm --filter web vitest run tests/unit/sms-body.test.ts -t "long lead name"` | ❌ Wave 0 |
| Pitfall 2 (Slack sig) | Raw-body signature passes | unit | `pnpm --filter web vitest run tests/unit/slack-signature.test.ts` | ❌ Wave 0 |
| Pitfall 6 (nonce) | View 3x then approve still works | integration | `pnpm --filter web vitest run tests/integration/review-token.test.ts -t "read-only does not consume nonce"` | ❌ Wave 0 |
| Pitfall 7 (matrix seed) | Channel-connect seeds prefs idempotently | integration | `pnpm --filter web vitest run tests/integration/notification-preferences-seed.test.ts` | ❌ Wave 0 |
| Full E2E approval | Dashboard approve → Gmail send | E2E | `pnpm --filter web playwright test tests/e2e/dashboard-approve-flow.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter web test:unit` + targeted vitest file (e.g., `vitest run tests/integration/<file>.test.ts`)
- **Per wave merge:** `pnpm --filter web test:unit && pnpm --filter web test:integration`
- **Phase gate:** Full suite green (`pnpm --filter web test`) before `/gsd-verify-work`

### Wave 0 Gaps

All Phase 4 test files do not yet exist. Wave 0 should create:

- [ ] `tests/unit/slack-signature.test.ts` — HMAC verify, replay window, timing-safe equality
- [ ] `tests/unit/sms-body.test.ts` — body length under 160 with max-lead-name
- [ ] `tests/unit/autonomous-mode.test.ts` — Mode A direct-approved insert path
- [ ] `tests/unit/review-token.test.ts` — generate/verify, expiry rejection, tamper rejection
- [ ] `tests/integration/notification-dispatcher.test.ts` — parallel fan-out, prefs filtering, channel failure isolation
- [ ] `tests/integration/draft-followup-cta.test.ts` — sleepUntil + followup_count increment
- [ ] `tests/integration/draft-hold-cascade.test.ts` — second sleepUntil → status → held
- [ ] `tests/integration/autonomous-mode-b.test.ts` — wake + CAS + already-approved-by-coach case
- [ ] `tests/integration/approve-atomic.test.ts` — RPC call, concurrent attempts, not_pending handling
- [ ] `tests/integration/bounce-notification.test.ts` — bounce-handler output → dispatcher → SMS unconditional
- [ ] `tests/integration/email-channel.test.ts` — Resend SDK mocked, html+text payload assertion
- [ ] `tests/integration/slack-channel.test.ts` — Block Kit JSON structure assertion
- [ ] `tests/integration/whatsapp-channel.test.ts` — Twilio SDK mocked, ContentVariables shape
- [ ] `tests/integration/webhook-status.test.ts` — Twilio + Resend webhook → notification_log update by external_id
- [ ] `tests/integration/slack-interactivity.test.ts` — full button-click → CAS → response_url update mock
- [ ] `tests/integration/review-token.test.ts` — view N times, action consumes nonce
- [ ] `tests/integration/notification-preferences-seed.test.ts` — channel-connect seed, idempotent re-connect
- [ ] `tests/e2e/dashboard-notifications.spec.ts` — Realtime notification appears in dashboard
- [ ] `tests/e2e/dashboard-approve-flow.spec.ts` — Approve+Next on real DB seeded with draft
- [ ] `tests/integration/conftest`-equivalent helpers in `tests/utils/` — Inngest test runner, Supabase test client, Twilio mock, Resend mock, Slack mock

Framework install: **none** — Vitest + Playwright already installed (per `apps/web/package.json` verified at top of research).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Slack OAuth v2 install with HMAC-signed `state` param to prevent CSRF. Per-coach session check before initiating OAuth. |
| V3 Session Management | yes | Review-page token = HMAC-signed payload with `exp` (7 days) + nonce. Single-use for state-changing actions via `consumed_tokens` UNIQUE constraint. |
| V4 Access Control | yes | RLS on `notification_preferences`, `consumed_tokens` (`coach_id = auth.uid()`). Service-role bypass only inside Inngest worker context. Review-page actions verify `payload.coachId` matches `drafts.coach_id`. |
| V5 Input Validation | yes | Zod on every API boundary: Slack interactivity payload, Twilio status callback (parse params), Resend webhook event, review-page action body. |
| V6 Cryptography | yes | `crypto.createHmac("sha256", ...)` for review tokens and Slack signature. `crypto.timingSafeEqual` for comparison. SDKs handle signature verification for Twilio (`validateRequest`) and Resend (Svix `Webhook.verify`). Never hand-roll. |
| V7 Error Handling & Logging | yes | Never log full bot tokens, JWTs, draft bodies. Structured log shape: `{ coachId, eventType, channel, status }`. |
| V8 Data Protection | yes | Slack bot tokens via Supabase Vault (same pattern as Gmail). Twilio + Resend API keys server-side env only. |
| V13 API & Web Service | yes | Webhook signature verification on every webhook (Slack, Twilio, Resend). Reject unsigned with 401. Idempotency on dispatcher via Inngest `event.id`. |
| V14 Configuration | yes | All secrets in Vercel env. `NEXT_PUBLIC_` prefix prohibited on any of the new vars (CI check enforces). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged Slack interactivity request | Spoofing | `X-Slack-Signature` HMAC verify + 5-minute timestamp window |
| Forged Twilio status callback | Spoofing | `twilio.validateRequest` (SDK-provided) |
| Forged Resend webhook | Spoofing | Svix `Webhook.verify` (SDK-provided) |
| Replayed Slack interactivity | Tampering | 5-minute timestamp window rejects old payloads |
| Replayed review link (token reuse for double-approve) | Tampering | Single-use nonce + `consumed_tokens` UNIQUE constraint |
| Tampered review token payload | Tampering | HMAC over entire payload; `timingSafeEqual` comparison |
| Bot token leak via logs | Information Disclosure | No `console.log` of token; Vault storage; structured log redaction |
| Race condition double-send (Slack + dashboard concurrent approve) | Tampering | `pg_try_advisory_xact_lock` inside RPC |
| OAuth state CSRF | Spoofing | HMAC-signed `state` param with coach_id + timestamp |
| SMS toll fraud (high-volume sends to expensive destinations) | Denial of Wallet | Upstash rate-limit on dispatcher per coach (e.g., 50/hour); allow-list destination prefixes in coach onboarding |
| Phishing via review link | Spoofing | Display short-link domain prominently in SMS/WhatsApp body. Token domain matches Sonorous-owned domain; cert pinned via HSTS. |
| Cross-tenant data leak in notification_preferences | Information Disclosure | RLS policy `coach_id = auth.uid()` |
| Webhook replay (Resend Svix) | Tampering | Svix library handles idempotency via svix-id header; store + dedupe |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Slack incoming webhooks for notifications | Slack OAuth app + Web API (`chat.postMessage`) | Granular permissions and bot identity available since 2018; webhooks lack interactivity | Notifications can have Approve/Edit/Hold buttons (impossible with webhooks) |
| Slack legacy `dialog.open` for forms | `views.open` with Block Kit modals | 2019 | Edit modal uses Block Kit's `plain_text_input` + `rich_text_input` blocks; richer than legacy dialogs |
| Twilio sending raw WhatsApp messages | Twilio Content API + `ContentSid` for templates | 2023 onwards | Required for all utility/marketing templates; sandbox API still supports raw for dev |
| `pg_advisory_lock` (session) | `pg_try_advisory_xact_lock` (transaction) | Required since Supavisor transaction-mode rollout | Without this change, advisory locks silently fail in production |
| Custom JWT libraries | `jose` (Web Crypto API, edge-compatible) | 2022 onwards | We're skipping `jose` and reusing HMAC pattern — same security posture for our use case |
| Resend with no webhook verification | Resend + Svix-signed webhooks | Resend launched webhooks ~2024 | Use `resend.webhooks.verify` (or `svix` directly) |

**Deprecated/outdated:**
- Slack `xoxp-` user tokens for app actions — use `xoxb-` bot tokens.
- Twilio `from` raw number for WhatsApp templated sends — use `MessagingServiceSid` or `from + contentSid`.
- Supavisor session-mode port 5432 for general app use — keep on 6543 transaction mode (per INFRA-004) and use transaction-scoped Postgres features only.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Resend webhook uses Svix signing (lib `svix`) | Pattern 3 / Don't Hand-Roll | If Resend has switched to a built-in `resend.webhooks.verify` helper, we add an unnecessary dep. **[VERIFIED via WebSearch: Resend Docs + Svix customers page]** — both confirmed Resend uses Svix Dispatch under the hood. Resend may also ship a thin wrapper; check `resend@6.12.3` for `resend.webhooks.verify` before adding `svix` directly. |
| A2 | `pg_try_advisory_xact_lock` works with Supabase RPC over PostgREST | Pattern 5 | If PostgREST splits the function call into multiple statements somehow (it doesn't — it's one query), the lock would not span. **[VERIFIED via Supabase docs]** — RPC = single function call = single transaction. |
| A3 | SMS body exactly as locked in D-09 fits under 160 GSM-7 chars for typical names | Pitfall 5 | A coach with a very long short-link domain or a long lead name pushes past 160. **[ASSUMED]** — depends on chosen domain length. Add a length check + truncation in `buildSmsBody`. |
| A4 | Existing `unsubscribe-token.ts` HMAC pattern is sufficient for review tokens (don't need `jose`) | Standard Stack | If we discover edge runtime constraints in Next.js 16 route handlers that the existing pattern doesn't support, we'd need `jose`. **[VERIFIED via codebase grep]** — existing pattern uses Node `crypto` which is Node-only; review token routes will run in Node runtime per existing Phase 3 routes. Safe. |
| A5 | Meta WhatsApp template approval typically returns "approved" in minutes for UTILITY category with status-update copy | Pitfall 4 / Open Questions | Could take up to 48h. **[CITED: twilio.com/docs/whatsapp/tutorial/message-template-approvals-statuses]** — template approval can be "minutes" (ML-assisted) but up to 48h on edge cases. Planner should submit early in the phase. |
| A6 | Twilio `validateRequest` works with Next.js `req.headers.get('x-twilio-signature')` (case-insensitive) | Pattern 4 | Header casing differences could cause false signature failures. **[VERIFIED via Twilio docs]** — `validateRequest` takes the signature string directly; Next.js `Headers.get()` is case-insensitive. Safe. |
| A7 | Slack `response_url` accepts updates for up to 30 minutes / 5 times | Slack approve flow | If exceeded, the message update silently fails. **[CITED: docs.slack.dev/messaging/creating-interactive-messages/]** — 5 updates within 30 minutes is the documented limit. Our flow uses 1 update per click. Safe. |
| A8 | Hold-cascade timing: the +24h follow-up CTA and +48h hold-cascade should be separate `step.sleepUntil` blocks inside one Inngest function, not separate functions | Architecture diagram | If split into separate functions, coordination between them needs an explicit event link. **[ASSUMED]** — one function with two sleeps is simpler and Inngest supports it. Planner finalizes. |
| A9 | The `private` schema RPC call signature `.schema("private").rpc("approve_draft_atomic", ...)` works in `@supabase/supabase-js` v2.105 | Pattern 5 | If `.schema()` on the JS client only works for non-RPC queries, we'd need a `public` wrapper. **[ASSUMED]** — `@supabase/supabase-js` v2 docs show `.schema()` chainable before `.rpc()` since 2.x. **Verify in Wave 0 with a smoke test, or fall back to public wrapper.** |

## Open Questions

1. **Should Meta WhatsApp template approval be a Phase 4 implementation task or a Daniel-handled prereq?**
   - What we know: Daniel handles WhatsApp Business Number provisioning outside the codebase (CONTEXT.md D-08). Template approval is initiated *during* Phase 4 implementation per CONTEXT.md.
   - What's unclear: Who submits the template — the developer building Phase 4 or Daniel via Twilio console?
   - Recommendation: Planner schedules a Phase 4 task that **submits the template via Twilio Content API call** (programmatic) early in the phase, then continues other channel work in parallel. The `TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID` env var is filled in once approval lands. Production WhatsApp sends are smoke-tested at the end of the phase.

2. **Does `resend@6.12.3` expose a built-in `resend.webhooks.verify` helper, or do we install `svix` separately?**
   - What we know: Resend uses Svix infra. Recent Resend changelog mentions an SDK helper.
   - What's unclear: Whether the v6.12.3 SDK ships the helper or only later versions.
   - Recommendation: Wave 0 task — check `node_modules/resend/dist` for a `webhooks` export. If present, use it. If not, install `svix` (1 small dep, well-trodden).

3. **`.schema("private").rpc(...)` works on @supabase/supabase-js v2 — confirmed?**
   - What we know: Docs show `.schema()` is supported for queries; RPC is a separate call style.
   - What's unclear: Whether the chain works for RPC specifically in 2.105.
   - Recommendation: Wave 0 smoke test in `tests/integration/approve-atomic.test.ts`. If it doesn't work, expose a `public.approve_draft_atomic` thin wrapper that just calls `private.approve_draft_atomic`. Same security properties because the public wrapper is also `SECURITY DEFINER` and revokes `public` execute.

4. **For the "Held" tab Realtime subscription — should we extend the existing `draft-realtime.tsx` hook with a status filter, or create a parallel hook?**
   - What we know: Existing hook subscribes to all drafts for the coach.
   - What's unclear: Whether Phase 1 hook already filters by status or returns all rows.
   - Recommendation: Inspect `draft-realtime.tsx` during planning; extend with a `status` filter param (defaults to `'pending'`); avoid duplicate WebSocket subscriptions.

5. **Should the dispatcher fire one `notification/dispatch` event with `eventType` in payload, or one event per type (`notification/draft_ready`, `notification/lead_replied`, …)?**
   - What we know: Inngest supports both patterns. Phase 3 events tend to be specific (`LEAD_REPLIED`, `LEAD_BOUNCED`).
   - What's unclear: Which is cleaner for the dispatcher's switch-on-eventType logic.
   - Recommendation: Use one event per eventType (Phase 3 pattern). Each Inngest function trigger is more discoverable and supports per-event-type retries/concurrency. The "dispatcher" becomes a thin shared lib function called from each event-specific Inngest function. Planner decides.

## Sources

### Primary (HIGH confidence)
- Slack OAuth v2 install — `https://docs.slack.dev/authentication/installing-with-oauth/`
- Slack signature verification — `https://docs.slack.dev/authentication/verifying-requests-from-slack/`
- Slack Block Kit reference — `https://api.slack.com/block-kit` + `https://docs.slack.dev/reference/interaction-payloads/block_actions-payload/`
- Slack interactivity payloads — `https://docs.slack.dev/interactivity/handling-user-interaction/`
- Slack `views.open` and modals — `https://docs.slack.dev/surfaces/modals/`
- Inngest step parallelism — `https://www.inngest.com/docs/guides/step-parallelism`
- Inngest step.run — `https://www.inngest.com/docs/reference/functions/step-run`
- Twilio WhatsApp templates — `https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates`
- Twilio template approval — `https://www.twilio.com/docs/whatsapp/tutorial/message-template-approvals-statuses`
- Twilio webhook security — `https://www.twilio.com/docs/usage/webhooks/webhooks-security`
- Resend webhooks intro — `https://resend.com/docs/webhooks/introduction`
- Resend Next.js send — `https://resend.com/docs/send-with-nextjs`
- Supabase Supavisor FAQ (advisory lock + pooling) — `https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI`
- npm registry verification — `npm view {resend,@slack/web-api,twilio,jose,inngest} version`
- Existing codebase: `apps/web/lib/unsubscribe-token.ts`, `apps/web/lib/email/template.ts`, `apps/web/components/drafts/DraftCard.tsx`, `apps/web/components/drafts/DraftQueueScaffold.tsx`, `apps/web/inngest/functions/bounce-handler.ts`, `supabase/migrations/20260505000002_tables.sql`, `supabase/migrations/20260505000005_vault.sql`

### Secondary (MEDIUM confidence)
- Slack `oauth.v2.access` method reference — `https://api.slack.com/methods/oauth.v2.access` (verified via WebSearch)
- Slack Bolt OAuth helpers — `https://tools.slack.dev/bolt-js/concepts/authenticating-oauth` (used as reference; we're not using Bolt directly)
- WorkOS JWT-in-Next.js guide — `https://workos.com/blog/how-to-verify-jwts-in-nextjs-app-router` (for jose patterns if we adopt)

### Tertiary (LOW confidence — flag for validation in Wave 0)
- Whether `resend@6.12.3` ships `resend.webhooks.verify` (verify against actual SDK exports during Wave 0)
- Whether `.schema("private").rpc(...)` works on `@supabase/supabase-js@2.105.3` (verify via smoke test in Wave 0)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via `npm view` 2026-05-20; all SDKs current.
- Architecture: HIGH — patterns mirror existing Phase 1 (Vault, OAuth) and Phase 3 (Inngest fan-out, webhook signature) verified in codebase.
- Pitfalls: HIGH — every pitfall is sourced from an official doc page within the last 24h or from a known Phase 1 constraint (INFRA-004 Supavisor transaction mode is the root cause of Pitfall 1).
- Security: HIGH — all controls map to existing project patterns (Vault, RLS, signature verify on every webhook). ASVS categories validated against phase tech stack.

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (30 days — Slack/Twilio/Resend APIs are stable; revalidate if Meta announces June 2026 WhatsApp rollout breakage per Twilio support note).
