# Phase 3 Discussion Log

**Date:** 2026-05-19
**Areas discussed:** Sequence cadence, Calendar provider gaps, Reply → sequence resume, Lead intake monitoring scope

---

## Area 1: Sequence Cadence

| Question | Options | Selected |
|---|---|---|
| No-show touchpoints | 3 / **5** / 2 / You decide | 5 messages |
| No-show spacing | Day 1,3,7,14,21 / Day 1,3,7,14,30 / Day 1,2,5,10,20 / You decide | **Day 1, 3, 7, 14, 21** |
| Call-completed track | 3 msgs Day 1,4,10 / 2 msgs / 5 msgs / You decide | **3 messages: Day 1, 4, 10** |
| Terminal state after no reply | Auto-close lead / Notify coach / Move to do_not_contact / You decide | **Auto-close lead** |
| Per-coach cadence | Fixed for now / **Per-coach from day one** / Fixed forever | Per-coach from day one |
| Cadence UI location | **Settings → Sequence Settings** / /settings/sequences / Inline on lead profile | Settings → Sequence Settings |
| Enrollment trigger | **Calendar webhook (auto)** / Manual only / Auto with 10-min grace | Calendar webhook auto (+ manual button) |
| Re-enrollment | **Yes — new event = new sequence** / No, one per lead / Coach decides | Yes — new sequence, concurrency key prevents overlap |

---

## Area 2: Calendar Provider Gaps

| Question | Options | Selected |
|---|---|---|
| Fallback for Setmore/MS Bookings/TidyCal | **Manual trigger** / Polling / Accept the gap | Manual trigger only |
| Provider capability disclosure | Yes — badge / No — docs only / **Tooltip + onboarding emphasis** | Tooltip on hover; heavily in onboarding wizard |
| Call-completed webhook | Same fallback / Manual only | **Manual only — always** (with Pending Actions card) |
| Call follow-up card location | **Pending Actions above Draft Queue** / Phase 4 only / Notification bell | New Pending Actions section above DraftQueueScaffold |
| Card options | **Closed / Start follow-up / Rescheduled** / 2 options / 4 options | 3 options exactly |
| Card delay | **30 min after end time** / Immediate / 2 hours | 30 min after scheduled end time (step.sleepUntil) |
| Card persistence | **Stays until acted on** / Auto-enroll at 48h / Auto-dismiss at 48h | Persistent — never auto-dismisses |

---

## Area 3: Reply → Sequence Resume

| Question | Options | Selected |
|---|---|---|
| Post-reply sequence | **Sequence ends — manual re-enroll** / Coach chooses at approval / Auto-resume after 3 days | Sequence ends permanently |
| Reply draft location | **Draft queue (same tab)** / Pending Actions / Separate Replies tab | Existing DraftQueueScaffold |
| Pause SLA | **Within 60 seconds** / Within 5 minutes / Best effort | 60 seconds (exit criteria) |
| Gmail monitoring | **Pub/Sub from day one** / Polling-first then Pub/Sub / Polling only | Pub/Sub from day one |
| Reply scope | **System-sent emails only** / All emails from known leads | System-sent emails only (Message-ID tracking) |
| Unsubscribe mid-sequence | **Cancel all immediately via cancelOn** / Let current draft send / Pause + notify coach | Cancel all immediately |
| Pub/Sub architecture | **One shared topic** / One watch per coach | One shared topic, route by email address |
| Hard bounce | **lead.bounced → cancel → notify** / Pause first | lead.bounced = true → sequence cancelled → coach notified |
| Polling fallback | **Every 5 minutes** / Every 2 min / Every 15 min | Every 5 minutes per coach |

---

## Area 4: Lead Intake Monitoring Scope

| Question | Options | Selected |
|---|---|---|
| Trigger signal | **Known lead emails coach (email match)** / Any inbound email / NLP keyword detection | Email address match from leads table |
| Prompt location | **Pending Actions card** / Phase 4 notification / Lead profile banner | Pending Actions section |
| Lead already in_sequence | **Treated as reply → pauses sequence** / Ignored / Surface both | Treated as reply |
| Pre-send safety check blocks | **Terminal states** + **Sequence cancelled externally** / Terminal states only | Terminal states + externally cancelled sequence |
| Inngest function organization | **apps/web/inngest/functions/ — one file per event** / One monolithic file / packages/ai-engine | One file per event type |
| Phase 3 migration | **Yes — sequence_config JSONB on coaches** / No migration / Yes + pending_actions table | sequence_config JSONB column added to coaches |

---

## Claude's Discretion

- Which specific calendar providers (Setmore, MS Bookings, TidyCal) support no-show webhooks — researcher determines; fallback behavior is locked
- Exact Inngest `cancelOn` event configuration syntax
- Idempotency handling approach when `calendar_events` UNIQUE constraint fires
- Token budget and timing arithmetic for `step.sleepUntil` calculations

## Deferred Ideas

- Per-lead cadence override at enrollment time — added per-coach Settings instead
- Multi-channel notifications for intake monitoring prompt — Phase 4 extends this
- Autonomous mode for sequences — Phase 4 scope
