# Phase 2: Intelligence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 02-Intelligence
**Areas discussed:** Voice example input UX, Transcript match failure, Stage-aware draft prompts, Email thread view placement

---

## Voice Example Input UX

| Option | Description | Selected |
|--------|-------------|----------|
| Free-form paste | Single textarea, raw text, add button | ✓ (initial) |
| Category-guided | Labeled categories per message type | |
| Bulk import (file) | Upload Gmail export or multi-email file | |

**User's choice (expanded in follow-up):** Mix — labeled per channel (Gmail, LinkedIn, Instagram, WhatsApp), paste + optional file upload per channel.

**Key reveal:** The voice model builder is an **AI-analyzed import flow**, not a manual form. Coach imports raw communication data → AI derives Layer 1 profile + selects Layer 2 examples → coach reviews and confirms/tweaks. This is fundamentally different from manually filling in a form.

**Additional questions and answers:**

| Question | Options | Selected |
|----------|---------|----------|
| Per-example labels? | Raw text only / Optional label / You decide | Raw text only |
| Layer 1 input style | Guided form / Free-text bio / You decide | User described AI-analyzed import (see above) |
| Same corpus for Layer 2? | Separate corpus (analysis-only) / Same data doubles as Layer 2 | Same data |
| Re-analyze after more data? | Re-analyze anytime / One-shot + manual edits | Re-analyze anytime |
| Location in dashboard | Settings → My Voice / Onboarding wizard step / Standalone nav item | Onboarding wizard when starting, Settings → My Voice afterward |
| Layer 2 examples visible? | Yes — show + allow swap/remove / Black box | Yes — show selected, allow swap/remove |
| Confidence indicator behavior | Warn only / Block generation | Warn only |
| Import interface | Labeled per channel / One generic area | Labeled per channel |

**Notes:** User clarified that the onboarding wizard placement is the ideal first-time experience, but Phase 2 delivers Settings → My Voice only. Onboarding wizard is Phase 5.

---

## Transcript Match Failure

| Option | Description | Selected |
|--------|-------------|----------|
| Unmatched queue in dashboard | New tab in DraftQueueScaffold | ✓ |
| Notify + discard if not acted on | Slack/WhatsApp notification, dropped if ignored | |
| Store + silently wait | Stored but not surfaced | |

**User's choice:** Unmatched queue — new tab in the existing DraftQueueScaffold panel.

**Additional questions and answers:**

| Question | Options | Selected |
|----------|---------|----------|
| Queue placement | Draft queue tab / Separate sidebar item / Badge on lead list | Draft queue area (same panel) |
| Assignment UI | Preview + lead search/select / Full transcript + dropdown | Preview + lead search/select |
| Fuzzy matching | Yes — fuzzy with low-confidence flag / No — exact only | Yes — fuzzy match with "Did you mean?" |
| Post-match action | Auto-trigger draft / Manual request / Depends on state | Auto-trigger draft |
| Manual upload location | Lead profile / Unmatched queue | Lead profile |

---

## Stage-Aware Draft Prompts

| Option | Description | Selected |
|--------|-------------|----------|
| no_show + call_completed only | Two post-call states | |
| All lead states | Every state has distinct prompt framing | ✓ |
| You decide | Claude's judgment | |

**User's choice:** All lead states have distinct prompts.

**State intent descriptions (user's own words, polished for prompt guide):**

- `identified`: Generic, voice-heavy, no context from lead's conversation
- `call_booked`: Review conversation for pain points; welcoming, excited, authoritative (not begging)
- `no_show`: Understanding but determined; "I understand something came up" + rebook, last chance, firm
- `call_completed`: Full transcript context; understanding + uplifting + determined; bridge interest to commitment
- `in_sequence`: Calibrate to current conversation position and situation; living conversation not templates
- `replied`: Hard-tailor to specific reply; their exact words; reference pain points from lead description
- `converted`: Trigger onboarding if available; else tailored welcome message
- `closed`: Same as converted

**New capability raised by user:** AI Lead Description — AI writes and auto-updates a free-form summary of each lead (pain points, goals, emotional context). Plain text, stored in new `ai_summary TEXT` column on `leads`, visible above tabs in lead profile, coach-editable with edits protected from AI overwrites.

| Question | Options | Selected |
|----------|---------|----------|
| ai_summary storage + display | New column, visible in lead profile / drafts only / etc. | New column, visible in lead profile |
| Coach edit access | Yes — annotate/override, edits protected / Read-only | Yes — coach can annotate/override |
| ai_summary format | Plain text / Structured JSON | Plain text |

---

## Email Thread View Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Tab in lead profile: Thread \| Timeline \| Notes | Tab bar added to lead profile | ✓ |
| Expandable panel below header | Collapsed accordion below lead header | |
| Slide-over drawer | Right-side drawer from lead profile button | |

**User's choice:** Tab in lead profile — Thread | Timeline | Notes.

**Additional questions and answers:**

| Question | Options | Selected |
|----------|---------|----------|
| Email display style | Collapsed by default, expand on click / All expanded | Collapsed by default, most recent expanded |
| AI summary placement | Pinned above tabs / 4th tab / Inside Timeline tab | Pinned above tabs — always visible |

---

## Claude's Discretion

- Token budget priority when context exceeds limits — planner determines truncation order
- XML delimiter structure for AI prompt schema — researcher/planner determines

## Deferred Ideas

- **Voice model builder as onboarding wizard step** — Phase 5 (Polish) scope
- **Converted state → onboarding module trigger** — Onboarding module not yet built; Phase 2 sends a tailored welcome message instead
