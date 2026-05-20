# Phase 4: Approval Channels — Discussion Log

**Date:** 2026-05-20
**Mode:** discuss (default)
**Areas discussed:** 4 of 4 surfaced gray areas

---

## Area 1 — Slack approval mechanism

### Q1.1 — How should coaches connect Slack?
**Options presented:**
- Per-coach OAuth install (Recommended)
- Single incoming-webhook URL per coach
- Single shared Sonorous Slack app

**Selected:** Per-coach OAuth install
**Notes:** Required for Block Kit interactive buttons. Bot token in Vault per coach. Same connect pattern as Gmail. Locks D-01.

### Q1.2 — When a coach clicks Approve in Slack, what happens?
**Options presented:**
- Approve in-place, send email immediately (Recommended)
- Approve in-place, but route through 'edit-before-send' confirmation
- Slack acts as a notification + deep link only

**Selected:** Approve in-place, send email immediately
**Notes:** Atomic path matching dashboard approval. Postgres advisory lock on draft.id. Locks D-04.

### Q1.3 — Slack message format
**Options presented:**
- Full draft body + Approve / Edit / Hold buttons (Recommended)
- Summary + Approve / Hold + 'Open in dashboard'
- Full body + Approve / Hold only (no Edit in Slack)

**Selected:** Full draft body + Approve / Edit / Hold buttons
**Notes:** Honors DRAFT-013 (never truncated). Edit opens Slack modal. Locks D-03.

### Q1.4 — Where in Slack do notifications land?
**Options presented:**
- DM from the bot to the coach (Recommended)
- Coach-chosen channel during install
- Both — DM is default, channel optional in Settings

**Selected:** DM from the bot to the coach
**Notes:** Phase 4 ships DM-only. Channel override deferred to Phase 5. Locks D-02.

---

## Area 2 — Email & WhatsApp/SMS review-link UX

### Q2.1 — What does the Resend email link take the coach to?
**Options presented:**
- Tokenized review page with Approve / Edit / Hold (Recommended)
- Magic link — always to dashboard
- One-tap approve direct from email

**Selected:** Tokenized review page
**Notes:** Reuses unsubscribe-token HMAC pattern from Phase 3. JWT, 7-day expiry. Locks D-06.

### Q2.2 — What should the Resend email body contain?
**Options presented:**
- Full draft inline (subject + body) + Review button (Recommended)
- Summary only — lead name + first 2 lines + Review button
- Full draft + inline Approve / Hold mailto buttons

**Selected:** Full draft inline + Review button
**Notes:** Coach can triage from inbox without clicking. Button only for actions. Locks D-07.

### Q2.3 — What does the WhatsApp message look like?
**Options presented:**
- Meta-approved template — lead name + send time + Review link (Recommended)
- Twilio Sandbox — ship now, defer Meta review
- Full draft body in WhatsApp + reply 'A' to approve

**Selected:** Meta-approved template
**Notes:** Utility category. Two variables + review link. Production-compliant from launch. Locks D-08.

### Q2.4 — What's the SMS fallback content?
**Options presented:**
- Short alert + short.link to review page (Recommended)
- Same as WhatsApp template but as SMS
- SMS just says 'Check Sonorous — 1 draft waiting'

**Selected:** Short alert + short.link to review page
**Notes:** Under 160 chars to avoid multi-part. Tokenized short-link `/r/{token}`. Locks D-09.

---

## Area 3 — Notification channel preferences UX

### Q3.1 — Default channel-routing rule
**Options presented:**
- All connected channels fire for every event (Recommended)
- Sensible defaults per event type
- Coach picks one primary channel during onboarding

**Selected:** Custom refinement — "only send to channels the coach has enabled as the notification tool. If multiple or all enabled, all enabled fire for every event."
**Notes:** Effectively the recommended option with explicit framing: enabling a channel = it fires for every event. Disabling = never. Per-event override exists in the matrix but the default-loud-per-channel behavior is the headline. Locks D-11.

### Q3.2 — Settings UI shape
**Options presented:**
- Matrix — 4 events × 4 channels with checkboxes (Recommended)
- Per-channel cards
- Two presets + 'Custom'

**Selected:** Matrix UI
**Notes:** Dashboard column locked ON. Disconnected channels render greyed with Connect CTA. Locks D-12, D-13.

### Q3.3 — Dispatch model
**Options presented:**
- Parallel fan-out, each channel logs independently (Recommended)
- Parallel for primary channels, SMS only if WhatsApp fails
- Sequential — dashboard first, then external in priority order

**Selected:** Parallel fan-out
**Notes:** Inngest `Promise.all` of `step.run` per channel. Locks D-14. WhatsApp + SMS as independent channels — bounce events are the only place SMS unconditionally fires (D-15).

### Q3.4 — notification_log granularity
**Options presented:**
- One row per channel attempt with provider IDs (Recommended)
- One row per logical event with channels JSON column
- Only log failures and delivery confirmations

**Selected:** One row per channel attempt
**Notes:** Matches the schema already deployed in Phase 1. Powers ADMIN-002. Locks D-16.

---

## Area 4 — HOLD UX + Approve+Next ordering

### Q4.1 — Where do HELD drafts live in the UI?
**Options presented:**
- Separate 'Held' tab in the queue with badge count (Recommended)
- Held drafts mixed into main queue with a 'Held' badge
- Held drafts only on the lead profile page

**Selected:** Clarification requested — user asked whether HOLD = no-action. Clarification provided in conversation distinguishing HOLD (explicit) vs no-action timeout (passive). User then selected separate 'Held' tab with Re-approve/Edit/Cancel actions. Locks D-17, D-18.

### Q4.2 — Queue ordering for Approve+Next
**Options presented:**
- Most-urgent first: scheduled_send_at ASC (Recommended)
- FIFO: oldest pending first
- Grouped by lead, then scheduled_send_at within group

**Selected:** Most-urgent first (scheduled_send_at ASC)
**Notes:** Tiebreaker on created_at. Same ordering everywhere drafts list. Locks D-19.

### Q4.3 — Empty-queue state
**Options presented:**
- Celebration empty-state + 'Back to dashboard' button (Recommended)
- Auto-redirect to dashboard with a toast
- Empty queue + 'Generate test draft' button

**Selected:** Celebration empty-state
**Notes:** Animated checkmark + "You're all caught up." + one supporting stat. Locks D-20.

### Q4.4 — HELD draft actions
**Options presented:**
- Re-approve / Edit / Cancel — no auto-expiry (Recommended)
- Re-approve / Cancel only; editing requires regen
- Held drafts auto-expire after 30 days

**Selected:** Re-approve / Edit / Cancel — no auto-expiry
**Notes:** Honors DRAFT-008 "waits indefinitely." Re-approve runs through pre-send safety check (Phase 3 D-25). Locks D-17, D-18.

### Q4.5 (follow-up after HOLD clarification) — HOLD behavior summary
**Options presented:**
- Separate 'Held' tab in queue, with Re-approve/Edit/Cancel actions (Recommended)
- Same + auto-regenerate a fresh draft alongside the held one
- Held in main queue with HELD badge — no separate tab

**Selected:** Separate Held tab with explicit coach actions
**Notes:** No auto-regeneration on entering HOLD. Coach drives all transitions out of HOLD. Locks D-17, D-18.

---

## Deferred Ideas (captured during discussion)

See `04-CONTEXT.md` `<deferred>` section. Highlights:
- Slack channel destination (vs DM) — Phase 5.
- Per-event override of channel routing — UI affordance deferred to Phase 5.
- Slack slash command — Phase 5+.
- Twilio Conversations API reply-to-approve — Phase 5+.
- Per-coach Resend "from address" — Phase 5+.
- Bulk-approve all pending — out of scope.

---

## Claude's Discretion (delegated to research / planner)

- JWT signing algorithm for review tokens (recommendation: HS256 with `JWT_REVIEW_SECRET` env var).
- Exact Slack Block Kit JSON structure for the draft message.
- Short-link route shape (`/r/{token}` vs `/review/{token}`).
- Whether to extract a generic `lib/notifications/dispatcher.ts` now or inline channel sends in Inngest functions (recommendation: thin dispatcher).
- Meta WhatsApp template approval timing — researcher should verify Twilio Business API prerequisites.

---

*Phase: 4-approval-channels*
*Discussion completed: 2026-05-20*
