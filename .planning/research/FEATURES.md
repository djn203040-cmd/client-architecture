# Features Research: Coaching AI Follow-Up System

**Domain:** Managed AI follow-up system for coaching businesses
**Researched:** 2026-05-04
**Confidence note:** WebSearch and WebFetch were unavailable in this environment. All findings draw on training data (knowledge through mid-2025) covering Instantly.ai, Lemlist, PersistIQ, Saleshandy, Close CRM, HubSpot Sales Hub, and coaching-specific tools (HoneyBook, Dubsado, Coaches Console). Confidence levels assigned per section.

---

## Table Stakes

Features coaches will expect on day one. Missing = product feels broken or unprofessional.

| Feature | Why Expected | Complexity | Confidence |
|---------|--------------|------------|------------|
| Lead profile with contact details + source | Every CRM has this — coaches need to know who this person is and where they came from | Low | HIGH |
| Chronological activity timeline per lead | Close CRM, HubSpot, Pipedrive all do this — coaches expect to see the full story | Medium | HIGH |
| Manual stage override | Coaches need to mark a lead "closed won" or "dead" without waiting for automation | Low | HIGH |
| Draft preview before approval | No approval product ships without showing the exact content before the coach commits | Low | HIGH |
| Inline draft editing in approval UI | Lemlist, Instantly — coaches edit directly, not in a separate editor | Medium | HIGH |
| One-click approve | Friction here is fatal — coaches abandon the queue | Low | HIGH |
| Email open indicator on lead profile | Gmail shows read receipts. Coaches expect to know if their message landed | Low | HIGH |
| Reply detection + sequence pause | Industry standard. Instantly.ai, Lemlist, PersistIQ all auto-pause on reply | Medium | HIGH |
| Unsubscribe / opt-out handling | CAN-SPAM / GDPR requirement. Every email tool handles this automatically | Medium | HIGH |
| Basic sequence status (active/paused/completed) | Coaches need to know if a lead is "in the system" or not | Low | HIGH |
| Notification when a lead replies | Coaches will not check the dashboard constantly — they need a push | Low | HIGH |
| Integration connection status (is Gmail connected?) | If Gmail disconnects, the whole product stops. Coaches need to know immediately | Low | HIGH |
| Basic analytics: open rate, reply rate per coach | Saleshandy, Lemlist — coaches will ask "is this working?" on day 3 | Medium | HIGH |
| Manual lead entry | Not all leads come from calendar no-shows. Coaches meet people at events, on calls they forgot to book | Low | HIGH |
| Lead search / filter | Once a coach has 50 leads, scrolling a flat list is unusable | Medium | HIGH |

---

## Differentiators

Features that make this better than generic sales automation. This is where the product earns its price.

| Feature | Value Proposition | Complexity | Confidence |
|---------|-------------------|------------|------------|
| Voice model built from real messages | Instantly/Lemlist use templates. This uses the coach's actual language. The output sounds like them, not a sales email | High | HIGH |
| Call transcript as draft input | No generic tool ingests a call transcript and writes a follow-up referencing what was actually discussed | High | HIGH |
| Stage-aware draft generation | Draft after a no-show is different from draft after a completed call. Generic tools don't know the difference | High | HIGH |
| Pre-send safety check (reply/send detection before each send) | Unique in the market. Generic tools will send even if the lead replied 10 minutes ago | Medium | HIGH |
| 24h approval window with configurable hold behavior | Instantly/Lemlist have no approval workflow — everything sends automatically. This is a deliberate human-in-loop design | Medium | HIGH |
| Multi-channel draft notification (WhatsApp, Slack, email, dashboard) | Coaches are not in their dashboard. Reaching them where they already are is a meaningful UX advantage | High | HIGH |
| Sequence context injection (touchpoint number, prior messages) | Each draft knows it's the 2nd or 3rd message and won't repeat itself — generic tools loop templates | High | HIGH |
| Lead source attribution visible on profile | Coaches need to know if this person came from a podcast, referral, or Instagram post to calibrate tone | Low | MEDIUM |
| Confidence indicator on draft ("limited history available") | Honest AI output. Coaches trust the system more when it tells them when it has thin context | Medium | HIGH |
| Autonomous mode with explicit non-recommendation framing | Exists in some tools (Instantly has full auto-send) but framing it as non-recommended is a trust differentiator for premium coaches | Low | HIGH |
| Transcript source selection (Fathom, Fireflies, Otter, manual) | Coaches have existing stacks. Meeting them where they are beats asking them to switch | Medium | HIGH |
| Per-lead timezone inferred from email headers | Saleshandy has timezone sending but requires manual input. Auto-inference is a meaningful quality-of-life win | Medium | MEDIUM |

---

## Anti-Features

Things generic sales automation tools do that would actively damage trust, brand, or quality for coaching clients.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Bulk import + blast sequences | Coaches are not SDRs. They have 5-30 warm leads, not 5,000 cold contacts. Bulk tooling signals "this is spam software" | Individual lead entry, max sequence personalization per person |
| A/B testing subject lines | Instantly.ai and Lemlist push A/B testing because they're optimizing for volume. Coaches need quality, not statistical significance across 400 sends | Remove entirely. If a coach wants to test phrasing, let them edit the draft manually |
| "Boost deliverability" inbox rotation / warmup | Cold email infrastructure features (Instantly's core product) are a liability signal for a premium coaching brand — they imply bulk cold outreach | Send from the coach's real Gmail. No warmup, no rotation, no fake inbox pool |
| Open rate / click rate dashboards with trend charts | Finance-dashboard-style analytics feel wrong for a coach whose relationship product succeeds one-at-a-time | Lead-level events (when did they open? did they reply?) not aggregate stats — or keep stats minimal and tucked away |
| Lead scoring / points systems | Sales automation gimmick. Coaches know which leads matter intuitively | Visible stage + last activity date is enough |
| "Cadence" / "Touchpoint" terminology | SDR vocabulary. Coaches don't speak this language | Use: sequence, message, follow-up, check-in |
| Public unsubscribe pages with brand logos | Clunky generic tools generate Mailchimp-style unsubscribe pages. For a coach sending personal emails, this is jarring | Handle unsubscribes quietly and gracefully, log the event, mark the lead, no public-facing page |
| Unlimited daily send volume settings | Another bulk-outreach feature. Irrelevant and looks cheap | No volume settings — the system sends one message per lead at a time, that's it |
| Lead "temperature" meters or emoji scoring | Gamification borrowed from consumer CRMs. Infantilizes the coach's judgment | Remove. Trust the coach's qualitative assessment |
| Social proof "X coaches sent Y emails today" | Instantly uses this. It signals you're in the same category as cold email spam tools | Never include social proof about volume or sends |

---

## Lead Management Patterns

UX patterns observed across Close CRM, HubSpot Sales Hub, Pipedrive, and Attio — distilled for what works in a coaching context.

**Confidence: HIGH for UX patterns, MEDIUM for coaching-specific adaptations**

### Lead Profile View — What Works

**Two-panel layout is the standard and correct choice.** Left or top: contact info, stage, quick actions. Right or bottom: full chronological timeline. This pattern appears in Close CRM, HubSpot, Attio, and Pipedrive for good reason — it matches how salespeople (and coaches) actually think: "who is this person, then what happened."

**Timeline events should be typed and iconographically distinct.** The coach needs to scan the timeline fast. Recommended event types with distinct visual treatment:
- Calendar booked (calendar icon)
- No-show (warning icon, warm amber)
- Email sent (outgoing arrow)
- Email opened (eye icon, subtle)
- Email replied (incoming arrow, highlighted — this is high signal)
- Call transcript attached (microphone icon)
- Stage changed (chevron icon)
- Draft approved (checkmark)
- Draft sent (sent icon)
- Sequence paused (pause icon)
- Coach note added (pencil icon — see Gaps section)
- Sequence held (hold icon, muted)

**Stage should be a pill/badge that coaches can click to override.** Dropdown with all valid transitions. Do not force them through the state machine when they know better. Log the manual override in the timeline with the coach's chosen reason.

**Last activity date is more useful than created date.** Coaches care about "has anything happened recently" not "when did I add this person." Surface "Last activity: 3 days ago" prominently.

**Conversation history should render as a chat-style thread, not a table of rows.** Coaches are used to iMessage / WhatsApp threading. A table of messages with timestamps is harder to scan than a threaded conversation view with in/out alignment (coach messages right, lead messages left, or vice versa).

**Transcript previews should be collapsed by default with expand-on-click.** A call transcript can be 8,000 words. Show a 3-line excerpt ("Call on March 4 — 32 minutes — 'She said she'd been thinking about this for six months...'") and let the coach expand.

**Draft history on the profile.** Coaches need to see what was sent to this person previously — not just what's pending. "Message 1 sent Feb 12 · approved by you · opened Feb 13" is essential context.

### Lead List View — What Works

**Default sort: last activity, most recent first.** Not alphabetical. Not created date.

**Status filter tabs across the top.** One-click to see: All / In Sequence / Awaiting Reply / Needs Attention / Closed. Do not bury filters in a sidebar dropdown.

**"Needs Attention" is a meaningful computed state.** A lead "needs attention" if: no activity in 7+ days while in sequence, or draft is in HOLD, or sequence errored. This is more useful than raw stage labels.

**Row-level preview.** Clicking a lead name opens the full profile. But the row itself should show enough to jog the coach's memory: name, stage, last event summary ("Opened email 2 days ago"), time in current stage.

**Inline stage badge with color.** in_sequence = blue. replied = green. ghosted = amber. dead = muted grey. closed_won = celebration. Coaches scan color before reading text.

---

## Draft Approval UX Patterns

The approval interface is the product's highest-frequency touchpoint. Friction here causes coaches to abandon the queue, leading to HOLD accumulation, leading to lost leads.

**Confidence: HIGH — pattern synthesized from HubSpot Conversations, Front, Superhuman, and Loom review workflows**

### What Makes Approval Fast

**Show the full context above the draft, not just the draft.** Before a coach can approve confidently, they need: lead name, how long ago the call/no-show was, what the last interaction was, what message number this is. Give them that in 3 lines at the top of the card. If they have to click away to the lead profile to understand context, the approval experience is broken.

**Never hide the draft text behind a "preview" click.** The draft content should be visible immediately — full text, not truncated. Coaches are approving human communication, not marketing emails. They need to read every word.

**Edit inline, not in a modal.** If a coach wants to change one word, they should be able to click into the text and type. Opening a separate editor or modal creates friction. Superhuman does inline editing well. Front does it badly (modal). Emulate Superhuman.

**Keyboard shortcuts are high-value for power users.** Approve = A or Enter. Skip = S. Edit = E. Hold = H. Coaches who are in a daily approval rhythm will use these. Make them discoverable but not required.

**Approve + Next pattern.** After approving one draft, immediately advance to the next one without returning to a list. This is how Superhuman handles email triage. It makes processing a queue feel like a task completed in a single flow rather than individual decisions.

**Show scheduled send time clearly, with timezone.** "Sending Tuesday, Feb 18 at 10:30am EST (lead's timezone)" — the coach needs to know when this will go out. If the time looks wrong, they'll hold it. Don't make them guess.

**Hold with a reason field.** When a coach holds a draft, offer 3 quick reasons (not a free-text box): "Not ready yet" / "I'll handle this manually" / "Need to revise significantly." This generates useful data for Daniel to improve the system. But also allow free-text.

**Visual queue progress.** "3 of 7 drafts reviewed" at the top. Coaches need to know how much is left. Absence of this makes the queue feel bottomless.

**Notification content must include enough to approve from the notification itself.** A Slack notification that says "You have a draft to review" is useless. The Slack message should include: lead name, message number, the full draft text, and Approve / Hold buttons. Coaches should be able to approve from Slack without opening the dashboard. This is technically harder but the UX payoff is enormous.

**Empty state with positive framing.** "No drafts pending — all caught up." Not "No drafts found." The empty queue should feel like an accomplishment.

---

## Voice Model Patterns

Research on what actually works for "write in my style" features — synthesized from products that ship this (Lex, Jasper Brand Voice, Writer.com, Grammarly's "voice" features, and custom GPT persona work).

**Confidence: MEDIUM — based on training data, no live product verification available**

### What Works in Production

**Few-shot examples outperform style description alone.** Telling an LLM "write in a warm, direct, non-corporate style" produces mediocre output. Providing 10–15 actual messages the coach has sent produces significantly better stylistic alignment. The two-layer approach in the PRD (structured profile + few-shot examples) is the correct architecture — do not collapse it to one layer.

**The examples must be curated, not bulk-dumped.** Lemlist's AI personalization and similar tools that ingest bulk history produce generic outputs because the model averages over too many examples including the coach's off-brand or rushed messages. Curating 10–15 best examples beats ingesting 500 mediocre ones. The onboarding should help coaches identify their best, most representative messages.

**Example selection criteria to surface in onboarding:**
- Warm follow-up after a great call (not a no-show)
- Response to a lead who expressed hesitation
- A message where the coach explained their philosophy or program in their own words
- A check-in that felt natural and not salesy
The system should prompt coaches to find these categories, not just "paste some messages."

**Structured voice profile fields that actually matter:**
- Sentence length preference: short punchy / medium flowing / long rich
- Opener style: direct jump in / brief acknowledgment / warm check-in
- Closer style: soft CTA / direct ask / open question / no ask
- Formality: fully informal / conversational professional / formal
- Emoji usage: never / occasionally for warmth / frequently
- Never-say list: words/phrases that don't fit the coach's brand ("synergize", "touch base", "circle back")
- Personal markers: do they use their name at sign-off? Do they reference their methodology by name? Do they use a trademark phrase?

**Voice model needs a feedback loop — this is usually the missing piece.** Tools like Jasper Brand Voice ship the model but don't learn from coach edits. Every time a coach edits a draft before approving, those edits are signal. Capturing diff between generated draft and approved draft and feeding it back to refine the voice model over time is a meaningful differentiator. This is high-complexity but phases well: ship without it, add it in Phase 3–4.

**"Confidence note" when context is thin.** If a coach has only provided 3 example messages and the lead has no conversation history, the output will be generic. The system should say so: "Limited voice context available — draft is based on your structured profile only. Consider adding more example messages in Settings." This builds trust. Hiding the limitation erodes it.

**Voice model preview / "test your voice"** — let the coach type a prompt ("Write a follow-up after a no-show") and see what the system generates before they encounter it on a real lead. This is a high-value onboarding feature that builds confidence in the product. Complexity: medium.

**Segment examples by message type if possible.** "This is your 'no-show follow-up' style" vs "this is your 'warm close' style." The coach's voice is not identical across every type of message — a no-show follow-up sounds different from a post-call nurture. Segmented examples improve output quality noticeably.

---

## Gaps in Current PRD

Features not explicitly mentioned that coaches would reasonably expect or that operational experience with similar products reveals as necessary.

**Confidence: HIGH on identification of gaps, MEDIUM on implementation priority**

### Gap 1: Coach Notes on Leads

**Not in PRD.** Every coach will want to add a private note to a lead: "She mentioned her husband is skeptical — don't reference financials." "He's dealing with a health situation — hold sequence until I hear from him." "Referred by Sarah K." These notes need to be in the lead profile, visible before drafts are generated, and injected into the AI context. Without this, coaches will feel the system is flying blind on context they know. Complexity: Low. Priority: High.

### Gap 2: Manual Sequence Trigger

**Not in PRD.** The current architecture triggers sequences from calendar no-shows. But coaches will want to manually trigger a sequence: "I just had a great call with someone who wasn't booked through Calendly — start the follow-up sequence." Without a manual trigger, the product only works for one trigger type and coaches will perceive it as inflexible. Complexity: Low. Priority: High.

### Gap 3: Sequence Pause / Resume (Manual)

**Partially in PRD** (sequences have a status field including `paused`) but the UX for manually pausing and resuming is not specified. Coaches need a big obvious "Pause Sequence" button on a lead profile for cases like: "I just got off a follow-up call with her, I'll handle this manually for now." And "Resume" when they're done. Without this, coaches fear the system will interfere with conversations they're managing personally. Complexity: Low. Priority: High.

### Gap 4: Integration Health Monitoring with Recovery Flow

**Not in PRD.** Gmail OAuth tokens expire. Calendar webhooks go stale. Coaches are not technical — they won't know why their sequences stopped working unless the system tells them clearly and walks them through fixing it. An integration health indicator ("Gmail disconnected 2 days ago — sequences paused") with a one-click reconnect flow is table stakes for a managed service. Complexity: Medium. Priority: High.

### Gap 5: "What Happened While I Was Away" Summary View

**Not in PRD.** Coaches check in irregularly. A coach who hasn't logged in for 4 days needs an instant summary: "3 leads opened emails. 1 replied (sequence paused, needs your response). 2 sequences completed. 1 draft is in HOLD." This is a dashboard home state, not a detailed lead list. Complexity: Medium. Priority: Medium.

### Gap 6: Email Thread Reply View

**Not in PRD.** When a lead replies to a sequence email, that reply lands in the coach's Gmail inbox. But the coach also needs to see it in the dashboard — the full reply thread, in context, alongside the original sequence messages. Without this, coaches have to leave the dashboard to understand what the lead said before they can respond manually. Complexity: Medium. Priority: High.

### Gap 7: Sequence Template Library (Daniel-Managed)

**Not in PRD.** Right now the system generates drafts per-lead from scratch. But Daniel (the operator) may want to provide base sequence frameworks — not templates, but structural guidance: "Message 1 should acknowledge the no-show and open the door. Message 2 should anchor to the lead's stated goal. Message 3 should include a soft close." These are injected as instructions to the AI, not as fixed text. This gives Daniel operational control over quality without removing the voice model. Complexity: Medium. Priority: Medium.

### Gap 8: Unsubscribe / Do Not Contact Handling

**Not in PRD explicitly.** Any outbound email system needs a mechanism for leads to opt out, and for that opt-out to be respected by the system immediately and permanently. This includes: logging the opt-out event on the lead profile, marking the lead as "do not contact," preventing any future sequences from starting for that lead, and surfacing the opt-out status clearly if the coach manually tries to restart a sequence. CAN-SPAM compliance. Complexity: Low. Priority: High.

### Gap 9: Coach Onboarding Progress Indicator

**Not in PRD.** The onboarding wizard is mentioned but its completion state is not tracked visibly. Coaches should see "Your setup is 60% complete — connect Gmail to start sequences" with clear steps remaining. Without this, partially-onboarded coaches don't know what they're missing or why the system isn't working. Complexity: Low. Priority: High.

### Gap 10: Draft Regeneration

**Not in PRD.** When a coach reviews a draft and doesn't like it — not wrong, just not right — they need a "Regenerate" button that produces a new version without losing the approval context. This is table stakes in every AI writing tool. One-shot output with only "edit it yourself" as the alternative will frustrate coaches. Complexity: Low (single API call with same context). Priority: High.

### Gap 11: Sequence History / Audit Log (per coach, for Daniel)

**Not in PRD.** The admin dashboard tracks usage metrics but the PRD doesn't specify an audit trail of what was sent on behalf of each coach. For liability and trust reasons, Daniel needs to be able to see: what was sent, when, who approved it, what the pre-send check found. This is an operator-level view, not a coach-level feature. Complexity: Medium. Priority: Medium.

### Gap 12: Bounce / Delivery Failure Handling

**Not in PRD.** When an email bounces (hard bounce = invalid address, soft bounce = mailbox full), the system needs to: log the bounce event, pause the sequence, notify the coach, and suggest they verify the email address. Without this, the system silently fails and coaches assume the lead is just not responding. Complexity: Medium. Priority: High.

---

## Confirmed In-Scope Items (refined from PRD review)

The following PRD items are confirmed correct — research supports them as the right approach:

- **Lead state machine** — correct. The specific states (identified, call_booked, no_show, in_sequence, replied, closed_won, closed_lost, dead) match industry patterns. Add `call_completed` as a distinct state (not the same as in_sequence) — a lead who completed a call but hasn't enrolled needs different messaging than a no-show.
- **Draft approval queue** — correct architecture. The 24h window is an unusual but defensible product decision for the premium coach market.
- **24h approval window** — correct. Coaches need breathing room but sequences can't stall indefinitely.
- **Autonomous mode toggle** — correct. Must be opt-in, must be framed as non-recommended. Position in settings, not on the dashboard home.
- **Pre-send safety check** — correct and differentiating. No competitor does this.
- **Smart scheduler** — correct. Timezone inference from email headers is the right approach.
