---
phase: 07-call-outcomes
verified: 2026-06-03T00:00:00Z
status: gaps_found
score: 6/7 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
gaps:
  - truth: "30 min after a call ends, the coach is prompted on /calls, the lead profile, AND Slack (+ email)"
    status: partial
    reason: >
      The dashboard surfaces (/calls queue + lead-profile panel) work — they are
      SSR + Supabase-realtime reads, not dispatcher-gated. The dashboard channel
      also fires (ALWAYS_ON). BUT the Slack and email prompts are silently
      disabled by default. computeEnabledChannels() default-DENIES any channel
      with no notification_preferences row (lib/notifications/dispatcher.ts:54-55),
      and call_outcome_pending was never added to the seed matrix
      (lib/notifications/seed-preferences.ts) NOR to the settings toggle UI
      (settings/notifications/NotificationMatrix.tsx EventType union + EVENT_LABELS).
      D-16 explicitly required adding call_outcome_pending to the
      notification_preferences matrix "so coaches can toggle the channel." The
      dispatcher branch, postCallOutcomeSlack, buildCallOutcomeBlocks, and the
      Slack interactivity branch are all fully built and correct — they are just
      gated off. Net effect: the headline "interactive Slack buttons" capability
      never reaches any coach without a manual DB insert, and the coach cannot
      enable it from the UI.
    artifacts:
      - path: "apps/web/lib/notifications/seed-preferences.ts"
        issue: "DEFAULT_MATRIX has no call_outcome_pending rows for any channel"
      - path: "apps/web/lib/notifications/dispatcher.ts"
        issue: "Default-deny (line 54-55): missing pref row => channel off; so Slack/email/whatsapp/sms are all false for call_outcome_pending"
      - path: "apps/web/app/(dashboard)/settings/notifications/NotificationMatrix.tsx"
        issue: "EventType union (line 22) + EVENT_LABELS (line 36) omit call_outcome_pending; no toggle row rendered"
    missing:
      - "Add call_outcome_pending rows (dashboard/email/slack/whatsapp/sms) to DEFAULT_MATRIX in seed-preferences.ts with sensible defaults (slack+email+dashboard on)"
      - "Add call_outcome_pending to the EventType union and EVENT_LABELS in NotificationMatrix.tsx so the coach can toggle it"
      - "Backfill notification_preferences for existing coaches (the 5-10 launch coaches already seeded without this event_type)"
---

# Phase 7: Call Outcomes Verification Report

**Phase Goal:** Close the post-call loop. Every calendar booking (all 7 providers) is monitored — it creates/updates a lead, sets `call_booked`, and opens a `call_outcomes` record. Thirty minutes after the call's scheduled end, the coach is asked one question — No Show / Call Completed / Converted — surfaced in a dedicated `/calls` queue, inside the lead profile, and as interactive Slack buttons. The chosen outcome drives lead status, writes to the timeline, and fires the right downstream sequence. Fixes the standing gap where calendar webhooks never auto-create leads.

**Verified:** 2026-06-03
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | A booking on any of the 7 providers creates/updates a lead + a `call_outcomes` row, with `call_booked` on the timeline | ✓ VERIFIED | All 7 webhook routes call `processCalendarEvent` (x2 = import+call each). `process-event.ts` booking_created branch: `upsertLeadFromBooking` → insert calendar_events → insert `call_booked` lead_event → upsert `call_outcomes` (status=scheduled, dedup onConflict coach_id,external_event_id) → fire `LEAD_CALL_BOOKED`. `upsert-lead.ts` creates with `source = provider`, `status = call_booked`, never-regress guard on converted/lost/do_not_contact, placeholder lead + `email_pending` when no email. |
| 2 | A `call_outcomes` table + 2 enums + FORCE RLS + atomic CAS RPC exists, with shared types + Slack blocks | ✓ VERIFIED | `20260603000001_call_outcomes.sql`: table (UNIQUE coach_id,external_event_id), `call_outcome_status`/`call_outcome_value` enums, `call_converted` added to lead_event_type, FORCE RLS `coach_id=auth.uid()`, `record_call_outcome_atomic` (advisory lock + FOR UPDATE + CAS on status='awaiting_outcome'). Realtime migration adds call_outcomes to publication. Shared types TCallOutcome*/enums present; DB types regenerated (4 refs). `buildCallOutcomeBlocks`/`buildCallOutcomeResolvedBlocks` present. |
| 3 | 30 min after a call ends, the coach is prompted on /calls, the lead profile, AND Slack | ✗ PARTIAL | Monitor + poller flip + emit work; `/calls` + lead-profile (realtime) + dashboard channel surface the prompt. **Slack + email are silently OFF by default** (default-deny dispatcher + missing seed matrix + missing UI toggle). See Gaps. |
| 4 | Each of the 3 outcomes drives the correct status, timeline event, and downstream sequence | ✓ VERIFIED | `downstream.ts`: no_show→LEAD_NO_SHOW, completed→LEAD_CALL_COMPLETED (sequence-call-completed simplified, pending_actions + wait-for-coach-decision removed, direct follow-up enroll), converted→cancel active sequences + status='converted' (NOT IN converted,lost,do_not_contact guard, never sets do_not_contact) + call_converted timeline + LEAD_CONVERTED. PATCH route + Slack branch both write the timeline with correct outcome→event mapping. |
| 5 | Converted leads stay live for replies + transcripts (not lumped with closed/do_not_contact) | ✓ VERIFIED | `state-machine.ts` splits SEND_BLOCK_STATES (no converted) from NURTURE_BLOCK_STATES (with converted). `runPreSendSafetyCheck` (sequence-step.ts:18) — the single send gate used by drafts PATCH, review token, Slack approve, autonomous-mode-b — gates on SEND_BLOCK_STATES, so converted leads still send. sequence-step internal guard uses SEND_BLOCK_STATES. Re-engagement (sequence-reengage.ts) only proceeds for status='replied' (positive allowlist) so converted is inherently excluded from auto-nurture. **D-01 verified at the real source of truth, not just the SUMMARY claim.** |
| 6 | Provider no-show auto-resolves; no-email bookings get a placeholder lead | ✓ VERIFIED | process-event.ts no_show branch: pre-arms scheduled→awaiting_outcome then `recordCallOutcomeAtomic(..., "provider")`, fires LEAD_NO_SHOW only on result.ok (idempotent). upsert-lead.ts: no email → placeholder name + `external_ids.email_pending=true`, dedup by phone, never fabricates email. `20260603000000_leads_email_nullable.sql` drops the NOT NULL. |
| 7 | Outcome decision is atomic + idempotent; resilience cron recovers stranded calls | ✓ VERIFIED | `record_call_outcome_atomic` CAS on status='awaiting_outcome' (advisory lock + FOR UPDATE). PATCH returns 409 on !ok; Slack branch retires but skips downstream on !ok. Monitor + poller both CAS-guarded (status='scheduled' [AND prompted_at IS NULL]). Poller cron `/api/cron/call-outcome-poll` (Bearer CRON_SECRET, 401 otherwise) → `cron/call_outcome_poll` → callOutcomePoller, registered in inngest route + vercel.json (`*/15 * * * *`). |

**Score:** 6/7 truths verified (1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `supabase/migrations/20260603000001_call_outcomes.sql` | table+enums+RLS+RPC | ✓ VERIFIED | All present, substantive |
| `supabase/migrations/20260603000002_call_outcomes_realtime.sql` | realtime publication | ✓ VERIFIED | ADD TABLE call_outcomes |
| `supabase/migrations/20260603000000_leads_email_nullable.sql` | placeholder leads | ✓ VERIFIED | DROP NOT NULL |
| `apps/web/lib/calendar/process-event.ts` | single ingestion path | ✓ VERIFIED | 4 event-type branches, wired |
| `apps/web/lib/calendar/upsert-lead.ts` | dedup + never-regress | ✓ VERIFIED | email/phone dedup, terminal guard |
| 7× `webhooks/calendar/*/route.ts` | delegate to processor | ✓ VERIFIED | all 7 import+call processCalendarEvent |
| `apps/web/lib/call-outcomes/record-atomic.ts` | RPC wrapper | ✓ VERIFIED | typed, calls rpc |
| `apps/web/lib/call-outcomes/config.ts` | per-coach buffer | ✓ VERIFIED | default 30, validated |
| `apps/web/lib/call-outcomes/downstream.ts` | 3-outcome wiring | ✓ VERIFIED | no_show/completed/converted |
| `apps/web/inngest/functions/call-outcome-monitor.ts` | sleepUntil→flip→notify | ✓ VERIFIED | cancelOn cancelled/rescheduled |
| `apps/web/inngest/functions/call-outcome-poller.ts` | stranded-row recovery | ✓ VERIFIED | CAS-guarded, JS buffer filter |
| `apps/web/app/api/cron/call-outcome-poll/route.ts` | cron handler | ✓ VERIFIED | Bearer auth, emits event |
| `apps/web/app/api/call-outcomes/[id]/route.ts` | PATCH resolve | ✓ VERIFIED | auth+Zod+IDOR+CAS+409+timeline+downstream+sync |
| `apps/web/lib/slack/sync-call-outcome-message.ts` | chat.update retire | ✓ VERIFIED | finds ts in notification_log |
| `apps/web/lib/slack/blocks.ts` (buildCallOutcomeBlocks) | 3 buttons + copy | ✓ VERIFIED | exact action_ids + spec copy |
| `webhooks/slack/interactivity/route.ts` (call_outcome_* branch) | resolve from Slack | ✓ VERIFIED | sig+team→coach+ownership+atomic+replace_original |
| `apps/web/app/(dashboard)/calls/page.tsx` | 3-tab SSR queue | ✓ VERIFIED | awaiting/scheduled/resolved buckets |
| `apps/web/components/calls/CallOutcomeCard.tsx` | 3 outcome buttons | ✓ VERIFIED | PATCHes /api/call-outcomes/[id] |
| `apps/web/components/calls/call-outcome-realtime.tsx` | realtime hook | ✓ VERIFIED | postgres_changes, leadId scoping |
| `apps/web/components/leads/LeadCallOutcomePanel.tsx` | panel + Module 2 CTA | ✓ VERIFIED | mounted in lead page; CTA copy = CLAUDE.md |
| `apps/web/components/leads/LeadEventIcon.tsx` | call_converted Trophy | ✓ VERIFIED | Trophy icon + gold tone |
| `apps/web/components/shell/SidebarNav.tsx` | /calls nav | ✓ VERIFIED | PhoneCall, label "Calls" |
| `apps/web/lib/notifications/seed-preferences.ts` | call_outcome_pending matrix | ✗ MISSING | DEFAULT_MATRIX has no call_outcome_pending rows (D-16 gap) |
| `settings/notifications/NotificationMatrix.tsx` | toggle row | ✗ MISSING | EventType union + EVENT_LABELS omit call_outcome_pending |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| 7 webhook routes | processCalendarEvent | direct call | ✓ WIRED | x2 each |
| process-event | upsertLeadFromBooking + call_outcomes + LEAD_CALL_BOOKED | adminClient + inngest | ✓ WIRED | |
| LEAD_CALL_BOOKED | call-outcome-monitor | inngest trigger | ✓ WIRED | registered |
| monitor | notification/call_outcome_pending | step.sendEvent | ✓ WIRED | |
| notification/call_outcome_pending | dispatcher | inngest trigger | ✓ WIRED | branch present |
| dispatcher | Slack/email channels | computeEnabledChannels | ✗ NOT_WIRED | default-deny + no seed row → Slack/email always false |
| CallOutcomeCard | PATCH /api/call-outcomes/[id] | fetch | ✓ WIRED | |
| PATCH route | recordCallOutcomeAtomic + downstream + Slack sync | imports | ✓ WIRED | |
| Slack interactivity | recordCallOutcomeAtomic + downstream | imports | ✓ WIRED | ownership-checked |
| send paths | SEND_BLOCK_STATES (converted excluded) | runPreSendSafetyCheck | ✓ WIRED | drafts/review/slack/autonomous all route through it |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| /calls page | initialAwaiting/Upcoming/History | SSR supabase select on call_outcomes by status | ✓ (real DB query, RLS-scoped) | ✓ FLOWING |
| CallQueueScaffold/Card | outcomes | useCallOutcomeRealtime postgres_changes | ✓ live merge | ✓ FLOWING |
| LeadCallOutcomePanel | outcomes / isConverted | realtime (leadId-scoped) + leadStatus prop | ✓ | ✓ FLOWING |
| dispatcher Slack/email | enabled.slack/email | computeEnabledChannels | ✗ always false (no pref row) | ⚠️ HOLLOW — wired but data path gated off |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| apps/web typecheck stays at baseline | `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` | 25 errors, all in pre-existing files (parse-speakers ×15, draft-generate-branching.test ×5, unsubscribe-token ×3, draft-hold/followup tests ×2); ZERO in any Phase 7 file | ✓ PASS |
| 7 handlers delegate | grep processCalendarEvent across 7 routes | all x2 | ✓ PASS |
| no anti-patterns in new files | grep TODO/FIXME/placeholder/empty-handler | none | ✓ PASS |
| computeEnabledChannels(call_outcome_pending) | code trace | dashboard=true, slack/email/whatsapp/sms=false (default-deny + no seed) | ✗ FAIL (Slack/email off) |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ---------- | ------ | -------- |
| CALL-001 (lead auto-create) | 07-01 | ✓ SATISFIED | upsertLeadFromBooking |
| CALL-002 (call_outcomes record) | 07-01 | ✓ SATISFIED | process-event upsert |
| CALL-003 (monitor prompt) | 07-02 | ✓ SATISFIED (data) | monitor flips + emits |
| CALL-004 (/calls queue) | 07-04 | ✓ SATISFIED | page + scaffold |
| CALL-005 (lead-profile panel) | 07-04 | ✓ SATISFIED | LeadCallOutcomePanel |
| CALL-006/007 (PATCH + Slack) | 07-03 | ✓ SATISFIED | route + interactivity |
| CALL-008 (downstream) | 07-02 | ✓ SATISFIED | downstream.ts |
| CALL-009 (idempotent/IDOR) | 07-01/03 | ✓ SATISFIED | CAS + 403 |
| CALL-010 (notification fan-out) | 07-02 | ⚠️ PARTIAL | dispatcher branch built but Slack/email gated off by default |
| CALL-011/012 (placeholder lead/never-regress) | 07-01 | ✓ SATISFIED | upsert-lead guards |
| CALL-013 (timeline) | 07-02/04 | ✓ SATISFIED | call_converted icon+label |
| CALL-014 (resilience poller) | 07-02 | ✓ SATISFIED | poller + cron |
| CALL-015 (dedup) | 07-01 | ✓ SATISFIED | UNIQUE constraint |
| CALL-016 (no PII in logs) | all | ✓ SATISFIED | IDs only on wire |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| downstream.ts | 68-74 | call_converted timeline event written unconditionally even when the status update is a no-op (already converted) | ℹ️ Info | On a double-call (e.g. late provider no_show after manual convert) a second call_converted timeline row could be written; the status guard prevents status regression but not a duplicate timeline entry. Cosmetic, non-blocking. |

(Pre-existing 25 tsc errors in lib/unsubscribe-token.ts, lib/voice/parse-speakers.ts, and 3 test files are NOT Phase 7 regressions — explicitly excluded per scope.)

### Human Verification Required

(Not the gating concern — the gap above is programmatically observable. These are deploy-time confirmations already tracked in resume-point #60.)

1. **Live booking end-to-end** — Book a real call on each provider after deploy; confirm a lead + call_outcomes row + call_booked timeline appear. Why human: needs deployed webhooks + live provider events.
2. **Authed /calls walkthrough** — Log in as a seeded coach with awaiting rows; confirm the 3 tabs, card buttons, realtime drop-on-resolve. Why human: needs a logged-in session + seeded data (the deferred 07-04 manual walkthrough).
3. **Slack prompt round-trip** — After the notification gap is fixed, confirm the 3-button Slack prompt posts and retires on click. Why human: needs live Slack workspace + bot token.

### Gaps Summary

The Call Outcomes data + decision pipeline is genuinely complete and correctly wired: the calendar→lead→call_outcomes path, the atomic/idempotent resolve (DB CAS RPC + PATCH 409 + Slack idempotency), the monitor + resilience poller, the 3-outcome downstream tracks, and — critically — the D-01 split-terminal-status logic verified at the real send gate (`runPreSendSafetyCheck` uses SEND_BLOCK_STATES, converted excluded). The `/calls` queue, lead-profile panel, Module 2 CTA, Trophy timeline, and Slack interactivity branch are all substantive and wired. Typecheck is at the documented 25-error baseline with zero new Phase 7 errors.

**The one gap is the notification fan-out for the prompt.** D-16 required adding `call_outcome_pending` to the notification_preferences matrix "so coaches can toggle the channel." It was added to the TNotificationEventType union and the dispatcher branch (both correct), but NOT to (a) the seed matrix `DEFAULT_MATRIX`, NOR (b) the settings toggle UI `NotificationMatrix.tsx`. Because `computeEnabledChannels` default-DENIES any channel without an explicit preference row, the Slack and email call-outcome prompts are off by default for every coach and cannot be enabled from the UI. The dashboard `/calls` page and lead-profile panel still surface the prompt (realtime, not dispatcher-gated) and the dashboard notification channel fires (ALWAYS_ON), so the coach is not entirely blind — but the goal explicitly names Slack as a prompt surface and "interactive Slack buttons" is a headline Phase 7 capability that will not reach any coach as shipped.

This is a deployment-blocking gap for the Slack/email prompt surface, but the core loop (dashboard prompt + decision + downstream + converted-stays-live) is sound. Phase 7 is the last roadmap phase, so this is not deferrable to a later phase.

---

_Verified: 2026-06-03_
_Verifier: Claude (gsd-verifier)_
