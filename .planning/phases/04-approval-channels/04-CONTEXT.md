# Phase 4: Approval Channels - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver every coach-facing approval surface for AI-generated drafts:

1. **Dashboard approval queue (full)** — completes the Realtime queue scaffolded in Phase 1 with Approve+Next, separate Held tab, urgency ordering, and celebration empty-state.
2. **Resend email notifications** — full draft inline + tokenized review link.
3. **Slack app + interactivity** — per-coach OAuth, Block Kit message with Approve/Edit/Hold buttons, atomic approve-and-send.
4. **Twilio WhatsApp + SMS** — Meta-approved WhatsApp template with review link; SMS short-link fallback.
5. **Multi-channel notification dispatcher** — parallel fan-out, per-channel logging, channel preferences UI.
6. **24h follow-up + HOLD cascade** — second-window CTA, terminal HOLD state surfaced in a Held tab.
7. **Autonomous modes A and B** — toggle in Settings, Postgres-level CAS lock on draft status transitions.

Phase 4 turns drafts that Phase 3 generates into messages that actually go out — through any device the coach happens to have open.

</domain>

<decisions>
## Implementation Decisions

### Slack approval mechanism

- **D-01:** Slack install is **per-coach OAuth**. Each coach installs the "Sonorous" Slack app to their own workspace via OAuth 2.0 (same connect pattern as Gmail). Bot user OAuth token stored in Supabase Vault per coach. App requires scopes: `chat:write`, `im:write`, `commands` (reserved for future), `users:read`.
- **D-02:** Notifications land in a **DM from the bot to the coach** by default. No channel picker at install time — DM only for Phase 4. (Channel override is deferred to Phase 5 polish.)
- **D-03:** Slack message format — **Block Kit message with full draft body inline + three action buttons** (Approve / Edit / Hold). Body is NEVER truncated (matches DRAFT-013). Confidence badge surfaces when `confidence_level = "low"`. The "Edit" button opens a Slack modal pre-filled with the draft text; submitting saves the edit and approves in one step.
- **D-04:** Slack Approve action is **atomic — approve in place, send email immediately**. Flow: button tap → Slack interactivity webhook (`X-Slack-Signature` verified) → Postgres advisory-lock acquire on `drafts.id` → status transition `pending → approved → sent` → Gmail send → Slack message updates to `✅ Approved — sent at {time}`. Same atomic path as the dashboard Approve button — no separate "Slack-side" approval state.
- **D-05:** Slack signing secret stored in **per-app env vars** (`SLACK_SIGNING_SECRET`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`). Per-coach bot tokens go through Supabase Vault (existing pattern from Gmail OAuth).

### Email & WhatsApp/SMS notification UX

- **D-06:** Email link goes to a **tokenized review page**, not a magic-link login. Token = signed JWT with `draft_id`, `coach_id`, 7-day expiry. Page renders the same `DraftCard` component as the dashboard with Approve / Edit / Hold actions. Pattern reuses `apps/web/lib/unsubscribe-token.ts` (HMAC signing already built in Phase 3 D-19).
- **D-07:** Resend email body contains the **full draft inline** (subject + body, never truncated) plus a "Review draft" button. Coach can read the draft entirely in their inbox without clicking. Email template lives in `apps/web/lib/email/template.ts` (already scaffolded for transactional emails).
- **D-08:** WhatsApp uses a **Meta-approved utility template** for the first message to each coach. Template has exactly two variables: `{{lead_name}}` and `{{send_time}}`. Template body: `"Draft ready for {{lead_name}} — scheduled to send at {{send_time}}. Review: {{review_link}}"`. Link → same tokenized review page as email. Meta template approval is initiated during Phase 4 implementation; the WhatsApp Business Number provisioning is a prerequisite Daniel handles outside the codebase.
- **D-09:** SMS fallback is a **short alert + short-link to review page**. Single SMS, no multi-part: `"Sonorous: Draft for {lead} ready. {review_link}"`. Short-link is a tokenized URL on our own domain (`/r/{token}`) → 302 to the full review page. Avoids both Twilio multi-part costs and Meta WhatsApp template re-approval if copy changes.
- **D-10:** Review-page tokens are **single-use for state-changing actions** (Approve, Hold). Once the coach takes an action, the token's nonce is consumed (stored in a small `consumed_tokens` table). Re-using the link after action shows a "This draft has already been actioned" state with a link to the dashboard. Read-only viewing of the draft (`GET /review/{token}`) does NOT consume the nonce.

### Notification channel preferences UX

- **D-11:** Channel routing rule — **enabled channels fire for every event type**. If a coach has Slack + email enabled, every event (draft ready, lead replied, integration broken, hard bounce) fires on Slack + email + dashboard. Disabled channels never fire. This matches NOTIFY-006's "all connected channels simultaneously" with the coach controlling the "connected" set.
- **D-12:** Settings UI — **single "Notifications" tab on Settings page**. Rendered as a 4 × 5 matrix (rows = event types; columns = dashboard / email / Slack / WhatsApp / SMS). Default state: every cell checked for any connected channel. Disconnected channels render as greyed-out columns with a "Connect" inline CTA. Per-cell override is supported (advanced: a coach who finds bounces too noisy in Slack can uncheck the bounce × Slack cell) but the default-loud behavior is the headline.
- **D-13:** Dashboard column is **always locked ON** — coach cannot disable dashboard notifications. Dashboard is the source of truth for what's pending.
- **D-14:** Dispatch model — **parallel fan-out via Inngest**. One `notification/draft_ready` (or similar) Inngest event per logical notification. Inngest function uses `Promise.all` of `step.run("send-channel-X", ...)` for each enabled channel. Channel failures do NOT block the others. Each `step.run` returns a result that becomes one `notification_log` row.
- **D-15:** WhatsApp + SMS are **independent channels**, NOT sequential fallback within a single "mobile" channel. NOTIFY-005's "SMS fallback if WhatsApp delivery fails" is interpreted as: SMS fires immediately in parallel with WhatsApp when both are enabled; if a coach wants only one, they uncheck the other in Settings. The literal "fallback" framing is preserved for the **hard bounce** event only, where SMS fires unconditionally even if WhatsApp is disabled (bounces are operationally critical — see D-20 in Phase 3).
- **D-16:** `notification_log` granularity — **one row per channel attempt**. Columns already deployed in the Phase 1 schema cover this: `coach_id`, `draft_id` (nullable for non-draft events), `channel`, `status` (`'pending' | 'sent' | 'delivered' | 'failed'`), `external_id` (Twilio SID / Resend message ID / Slack message `ts` / our own UUID for dashboard), `error_message`, `sent_at`, `created_at`. Powers ADMIN-002 "approval rates" per channel.

### HOLD state, Approve+Next, and queue UX

- **D-17:** HOLD is the **terminal parked state** for two paths: (1) coach taps Hold (H key or button) on a pending draft; (2) the 48h silent cascade — DRAFT-007 follow-up CTA fires at +24h, second 24h passes with no action, draft auto-moves to HOLD per DRAFT-008. Both paths set `drafts.status = 'held'` and `drafts.held_at = now()`. Held drafts NEVER auto-expire.
- **D-18:** Held drafts live in a **separate "Held" tab inside `DraftQueueScaffold`**, alongside the existing "Pending" and "Unmatched" tabs. The Held tab shows a badge with the count of held drafts (no badge when empty). Each held draft renders as a full `DraftCard` with three actions: **Re-approve** (acquires lock, runs pre-send safety check from Phase 3 D-25, sends immediately), **Edit** (opens `InlineDraftEditor` — same component as pending drafts — saves and approves), **Cancel** (sets `drafts.status = 'cancelled'`; the sequence's next touchpoint is unaffected and continues on schedule).
- **D-19:** Approve+Next queue ordering — **most-urgent first** (`scheduled_send_at` ASC). Drafts about to send float to the top. Tiebreaker: `created_at` ASC. Same ordering everywhere drafts are listed (dashboard queue, email batch summaries if any, Slack `/sonorous-drafts` slash command if added later).
- **D-20:** Empty-queue state after Approve+Next — **celebration with "Back to dashboard" CTA**. Animated checkmark, copy `"You're all caught up."`, plus one high-signal stat below (e.g., `"3 leads responded this week"`). On click → dashboard root. Reuses the Phase 1 animation patterns (Framer Motion already in `DraftCard.tsx`).
- **D-21:** The "no-action follow-up CTA" notification fired at +24h (DRAFT-007) uses the **same dispatcher** as the initial draft-ready notification, with a different copy template — `"Reminder: Draft for {lead} is still waiting. {review_link}"`. Same channel routing. Increments a `drafts.followup_count` integer column (new column — see D-23 schema migration) so the +48h HOLD cascade can be detected.

### Autonomous mode + lock pattern (no gray-area discussion, but locked here for downstream agents)

- **D-22:** Both autonomous modes use **Postgres advisory locks keyed by `drafts.id`** (`pg_try_advisory_xact_lock(hashtextextended(draft_id, 0))`) inside a transaction. This is the lock pattern referenced by DRAFT-011 and the schema's pre-existing `drafts.status_locked_at` column. CAS path: BEGIN → `pg_try_advisory_xact_lock(...)` → SELECT status → if status still `pending`, UPDATE to target status + set `status_locked_at = now()` → COMMIT. Concurrent attempts from a second channel see status no longer `pending` and abort gracefully with a "Already approved" toast / Slack ephemeral.
- **D-23:** Mode B (24h auto-send on timeout) is implemented as an **Inngest `step.sleepUntil(scheduled_send_at)`** scheduled when the draft is created. On wake, the step runs the same lock + CAS path as a coach approval. If coach already approved manually, the wake step exits gracefully.
- **D-24:** Mode A (auto-send no review) — drafts are created with `status = 'approved'` directly and surface in `notification_log` as `sent` immediately on Gmail-send success. They DO still appear briefly in the dashboard for visibility but cannot be edited or held (auto-sent before coach could act). Coach setting `autonomous_mode = 'mode_a'` requires a confirmation modal: "This will send messages without any review — are you sure?" (CLAUDE.md frames this as non-recommended).

### Schema additions

- **D-25:** Phase 4 requires **one new migration** adding:
  - `drafts.followup_count INTEGER NOT NULL DEFAULT 0` — increments at +24h follow-up CTA fire; at value `2`, the next Inngest step moves the draft to HOLD.
  - `drafts.review_token_nonce UUID DEFAULT gen_random_uuid()` — rotates whenever a review token is consumed; powers single-use token semantics (D-10).
  - `notification_preferences` table — `(coach_id, event_type, channel) → enabled BOOLEAN`. Composite PK. Default rows seeded for every connected channel × every event type on channel-connect. RLS scoped to `coach_id`.
  - `consumed_tokens` table — `(token_id UUID PRIMARY KEY, coach_id, draft_id, action, consumed_at)`. Powers single-use review-link nonce tracking. RLS scoped to `coach_id`.
- **D-26:** No changes needed to the existing `notification_log` table — Phase 1 schema already matches D-16.

### Claude's Discretion

- Exact JWT signing algorithm for review tokens — recommendation is HS256 with `JWT_REVIEW_SECRET` env var (new), but planner picks final.
- Slack Block Kit JSON structure of the draft-notification message — planner generates from the template.
- Exact short-link route shape (`/r/{token}` vs `/review/{token}`) — pick one and stick to it.
- Whether to extract a generic `lib/notifications/dispatcher.ts` now or inline channel sends in Inngest functions — recommendation is a thin dispatcher with one function per channel (`sendEmail`, `sendSlack`, `sendWhatsApp`, `sendSMS`); planner finalizes.
- Whether the Meta template approval is in scope of Phase 4 implementation or treated as an external task — researcher should verify Twilio Business API requirements before planning settles on a template ID.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture decisions (locked)
- `CLAUDE.md` — Architecture table: Resend for email notifications, Twilio for WhatsApp + SMS, Slack via webhooks for now (Phase 4 elevates to a Slack app), Inngest for all async fan-out, Supabase Vault for OAuth tokens. Autonomous mode A/B framing under "Autonomous mode."
- `.planning/ROADMAP.md` — Phase 4 plans list (6 plans), requirements covered (DRAFT-001/002/007/008/009/010/011, COMPLY-006, NOTIFY-001 through NOTIFY-008), exit criteria.
- `.planning/REQUIREMENTS.md` — REQ-IDs covered above with full text.

### Schema (deployed — check before adding columns)
- `supabase/migrations/20260505000001_enums.sql` — `notification_channel` enum (`email`, `slack`, `whatsapp`, `sms`) already deployed. `draft_status` enum includes `held` and `cancelled`. `integration_provider` enum includes `slack` and `twilio`.
- `supabase/migrations/20260505000002_tables.sql` — `notification_log` table (Phase 4 scaffold). `coaches.autonomous_mode` column. `drafts.status_locked_at` column. `integrations` table (per-provider OAuth + Vault). All RLS scoped to `coach_id`.
- Phase 4 requires a new migration per D-25 above: `drafts.followup_count`, `drafts.review_token_nonce`, `notification_preferences` table, `consumed_tokens` table.

### Existing code (reuse and extend)
- `apps/web/components/drafts/DraftCard.tsx` — Approve/Skip/Hold (A/S/H) keyboard shortcuts, inline edit, regenerate, confidence badge, Framer Motion enter/exit. Reused on dashboard queue, Held tab, and tokenized review page. **Do not duplicate this component for any new surface.**
- `apps/web/components/drafts/DraftQueueScaffold.tsx` — existing tab pattern (Pending / Unmatched). Phase 4 adds a "Held" tab here.
- `apps/web/components/drafts/draft-realtime.tsx` — Supabase Realtime subscription filtered by `coach_id`. Reused for both Pending and Held tabs.
- `apps/web/components/drafts/InlineDraftEditor.tsx` — inline edit component. Used by Held tab Edit action + Slack Edit modal submit handler (server-side reuse of the same validation).
- `apps/web/lib/unsubscribe-token.ts` — HMAC signing + nonce + Vercel-friendly token pattern from Phase 3 D-19. Phase 4 review-link tokens copy this shape (just different payload schema + secret).
- `apps/web/lib/email/template.ts` — transactional email template scaffolding.
- `apps/web/inngest/functions/bounce-handler.ts` and `apps/web/lib/gmail/error-handler.ts` — established pattern of inserting `notification_log` rows. Phase 4 generalizes into a shared dispatcher.
- `apps/web/inngest/client.ts` + `apps/web/app/api/inngest/route.ts` — Inngest serve() registration point for new Phase 4 functions (`notification-dispatcher`, `draft-followup-cta`, `draft-hold-cascade`, `autonomous-mode-b-timer`).
- `apps/web/app/(dashboard)/settings/page.tsx` — Settings page entry point. Phase 4 adds a "Notifications" tab here.

### Phase 3 decisions that carry forward
- `.planning/phases/03-automation/03-CONTEXT.md` D-10 — Pending Actions section above DraftQueueScaffold (already mounted).
- `.planning/phases/03-automation/03-CONTEXT.md` D-16 / D-19 / D-20 — reply / unsubscribe / bounce handlers already write `notification_log` rows. Phase 4 unifies these into the dispatcher pattern (D-14).
- `.planning/phases/03-automation/03-CONTEXT.md` D-25 — pre-send safety check (terminal states + non-active sequence status) runs inside every send path. Phase 4 Re-approve from the Held tab and Mode B auto-send both pass through it.

### External docs (researcher should verify during research phase)
- Slack Block Kit Builder + Interactivity & Shortcuts API reference.
- Slack OAuth v2 install flow (`xoxb-` bot tokens, signing-secret verification).
- Twilio WhatsApp Business API: template approval, template variables, sandbox vs production.
- Twilio Programmable Messaging API: SMS pricing, short-link best practices.
- Resend Node.js SDK: HTML templates, transactional headers, webhook for delivery tracking.
- Postgres advisory locks: `pg_try_advisory_xact_lock` semantics, hashtextextended for non-bigint keys.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DraftCard.tsx` is the single source of truth for the draft surface. The tokenized review page, the Held tab, and the dashboard queue all render this same component. Editing, approval, hold, and regenerate all go through the same `/api/drafts/[id]` PATCH route (already built in Phase 1).
- `unsubscribe-token.ts` provides the HMAC-token signing pattern. Phase 4's review tokens are a near-clone with a different payload (`{ draft_id, coach_id, exp, nonce }`) and a different env var (`JWT_REVIEW_SECRET`).
- `notification_log` schema already supports per-channel attempt logging (D-16 maps 1:1 to existing columns).
- `coaches.autonomous_mode` enum column already deployed — Settings just needs to write to it.
- `drafts.status_locked_at` already deployed — used by the Postgres advisory-lock CAS path (D-22).

### Established Patterns
- **Webhook signature verification** (calendar provider webhooks in Phase 3) — Phase 4's Slack interactivity webhook and Twilio status callbacks follow the same `verifySignature → exit-early-on-mismatch → parse → enqueue Inngest event` shape.
- **OAuth + Vault** (Gmail in Phase 1) — Slack OAuth install follows the identical flow: `/api/auth/slack/install` redirect → `/api/auth/slack/callback` exchange → write bot token to Vault → update `integrations` row with `vault_secret_id` and `status = 'connected'`.
- **Inngest fan-out** (Phase 3 sequence steps) — `step.run` per channel with `Promise.all` for parallel dispatch. Each step writes its own `notification_log` row inside the step body.
- **Realtime queue** (Phase 1 DraftQueueScaffold) — `useSupabaseClient` subscribed to `drafts` table filtered by `coach_id`. Phase 4 reuses identically for the Held tab (filter where `status = 'held'`).
- **Settings tabs** (Phase 2 voice settings) — Settings page uses a tab-based sub-route pattern. Phase 4 adds `/settings/notifications` and `/settings/autonomous` (or one combined tab — planner decides) following the same shape.

### Integration Points
- `apps/web/app/api/inngest/route.ts` — register Phase 4 Inngest functions here.
- `apps/web/app/api/webhooks/slack/interactivity/route.ts` (new) — Slack button-click webhook.
- `apps/web/app/api/auth/slack/[install|callback]/route.ts` (new) — Slack OAuth.
- `apps/web/app/api/webhooks/twilio/status/route.ts` (new) — Twilio delivery status callback → updates `notification_log.status`.
- `apps/web/app/(review)/r/[token]/page.tsx` (new) — tokenized public review page. Outside the `(dashboard)` group — no auth gate, token-gated instead.
- `apps/web/app/(dashboard)/settings/notifications/page.tsx` (new) — Notifications matrix UI.
- `apps/web/lib/notifications/dispatcher.ts` (new) — `sendNotification({ coachId, eventType, payload })` → reads `notification_preferences`, fans out to enabled channels.
- `apps/web/lib/notifications/channels/{email,slack,whatsapp,sms}.ts` (new) — one file per channel implementation.

</code_context>

<specifics>
## Specific Requirements

- **Slack OAuth scopes** — exactly: `chat:write`, `im:write`, `users:read`. Reserve `commands` for future Phase 5+ work; do NOT add it in Phase 4.
- **Slack Block Kit message** must include: lead name (header), subject (section), full draft body (section, `markdown` text), confidence badge (context block, only when `confidence_level = "low"`), three action buttons (actions block with `value = "approve" | "edit" | "hold"` and `action_id` carrying the `draft_id`).
- **Resend email template** — HTML version with full draft body in a styled card, plain-text version with the same draft body. From address: `drafts@<coach-domain-or-sonorous>.com` (configurable per coach in a future phase; for Phase 4 use Sonorous-owned from address with reply-to set to coach's email).
- **WhatsApp template** — exact body: `"Draft ready for {{1}} — scheduled to send at {{2}}. Review: {{3}}"`. Category: UTILITY. Approved during onboarding for each coach's WhatsApp Business Number.
- **SMS body** — keep under 160 chars to avoid multi-part. Format: `"Sonorous: Draft for {lead} ready. {short_link}"`.
- **Postgres advisory lock key** — `hashtextextended(draft_id::text, 0)` so the lock identifier is a stable bigint derived from the draft UUID.
- **Review token expiry** — 7 days. Single-use for state-changing actions; multi-use for read-only viewing.
- **Held tab badge** is hidden when the held count is zero. Do not render an empty Held tab with "0" badge.
- **Empty-queue celebration copy** — exact: `"You're all caught up."` with one supporting stat. No exclamation marks.
- **Autonomous Mode A confirmation modal** — coach must type "send without review" verbatim into a confirm input before the toggle accepts (high-friction by design — CLAUDE.md frames this as non-recommended).
- **Notification matrix UI** — dashboard column is rendered with a locked padlock icon and a tooltip explaining it can't be disabled.

</specifics>

<deferred>
## Deferred Ideas

- **Per-event override of channel routing inside an enabled channel** — coach can technically uncheck specific cells in the matrix (e.g., bounce × Slack), but the headline UX is "channel ON = all events" with the matrix as advanced. Per-event UI affordances stay minimal in Phase 4; if coaches complain about noise, surface a "Per-event filtering" button in Phase 5.
- **Slack channel destination (vs DM)** — coach picking a channel during OAuth install is deferred to Phase 5 polish. Phase 4 ships DM-only.
- **Slack slash command** (`/sonorous draft <lead>`) — deferred to Phase 5+.
- **Twilio Conversations API for reply-to-approve** — coach replying "A" in WhatsApp to approve. Deferred because it requires Conversations webhook, Meta-approved interactive template, and additional message-cost — Phase 4 ships review-link approve.
- **Per-coach "from address" on Resend** — coach owns the from address (e.g., `drafts@theircoachingbiz.com`). Requires SPF/DKIM setup per coach. Deferred to Phase 5+ onboarding wizard.
- **Voice memo notifications** — coach receives a Twilio voice call with TTS of the draft body. Out of scope.
- **Push notifications to a coach's phone (native app)** — out of scope for Phase 4. PWA push could be evaluated for Phase 5.
- **Bulk-approve all pending drafts** — coach taps "Approve all 7 pending" in the queue. Deferred — risky enough that the safety story (state checks, dry-run preview) would be a phase of its own.

</deferred>

---

*Phase: 4-approval-channels*
*Context gathered: 2026-05-20*
