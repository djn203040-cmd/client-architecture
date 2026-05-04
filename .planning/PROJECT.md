# The Client Architecture

## What This Is

A software-delivered service for coaching businesses — not SaaS. Daniel operates the system; coaches interact through a dashboard. The core product is Module 1: The Intake Sequence — an AI follow-up system that catches post-call leads in the coach's exact communication voice before they go cold. Modules 2 and 3 (The Threshold Experience and The Continuation) are built and visible in the dashboard at launch as locked upsell screens, not placeholders.

## Core Value

Every warm lead gets a timely, voice-accurate follow-up — in the coach's words, reviewed by the coach, sent at the right moment — so no lead dies from silence.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Module 1 — The Intake Sequence**
- [ ] Coach can connect Gmail account via OAuth
- [ ] System monitors coach's Gmail for lead replies, opens, and coach-sent emails
- [ ] Lead profiles tracked with full timeline (stage, events, conversation history)
- [ ] Lead state machine: identified → call_booked → no_show → in_sequence → replied/closed
- [ ] Calendar webhook (Calendly) triggers no-show detection and starts sequence
- [ ] AI drafts generated using coach voice model + full lead context
- [ ] Drafts surface to coach 24h before intended send across all connected channels
- [ ] Coach can approve, edit, or hold drafts from dashboard
- [ ] Pre-send safety check runs immediately before every send
- [ ] Autonomous mode toggle available (not default, explicitly not recommended in UI)
- [ ] Smart scheduler respects lead timezone and optimal send windows
- [ ] Coach dashboard: lead list, lead profile, draft approval queue
- [ ] Admin dashboard at /admin for Daniel (all coaches, usage, system health)

**Voice Model**
- [ ] Two-layer voice model per coach: structured profile + 10–15 few-shot examples
- [ ] Built from: Gmail exports, LinkedIn CSV, WhatsApp .txt, Instagram DMs
- [ ] Voice model referenced on every AI draft generated

**Locked Modules (sell screens)**
- [ ] Module 2 visible in dashboard with active CTA: "The Threshold Experience — your client's first 48 hours, built from your sales call. [Book a call]"
- [ ] Module 3 visible in dashboard with active CTA: "The Continuation — thirty days before they leave, we remind them why they stayed. [Book a call]"

### Out of Scope

- Instagram DM sending — Phase 2+ (scaffold early for Meta app review timeline)
- Browser extension approval channel — Future scope
- Stripe billing — Not blocking Phase 1
- Module 2 & 3 functionality — Only sell screens at launch
- Mobile app — Web-first
- Self-serve signup — Invite-only, Daniel manages coach accounts

## Context

**Operator model:** Daniel onboards coaches manually. 5–10 coaches at launch. This shapes auth (invite-only, no public signup) and admin (Daniel needs visibility across all coaches).

**Voice fidelity is the product.** Every draft must reference real conversation history. Generic outputs are a product failure, not an edge case.

**Approval philosophy:** Human in the loop by default. Autonomous mode exists but is framed as non-recommended. Pre-send safety check is non-negotiable — up to 24h passes between approval and send, a lot can happen.

**Calendar integrations in scope:** Calendly, Cal.com, Acuity, Setmore, Square Appointments, MS Bookings, TidyCal — all 7, through a unified abstraction layer.

**Notification channels for draft approval:** Dashboard queue, Email (Resend), Slack webhooks, Twilio (WhatsApp + SMS).

**Transcript integrations:** Fathom, Fireflies.ai, Otter.ai APIs + manual upload fallback.

## Constraints

- **Security**: RLS on every Supabase table, scoped to `coach_id`. OAuth tokens in Supabase Vault. Service role key server-side only. Zod validation on every API boundary. Webhook signature verification on all incoming webhooks.
- **AI**: Anthropic claude-sonnet-4-6 server-side only — never in client code.
- **TypeScript**: Strict mode, no `any`, shared types in `packages/shared/`.
- **Component size**: Under 200 lines — extract if longer.
- **Design**: Glass/frosted cards, warm colors, dark/light toggle, custom swappable backgrounds. Run `/impeccable audit` before any component ships.
- **Hosting**: Vercel (Next.js native). EU region for Supabase.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Email sends AS coach via Gmail API OAuth | Deliverability + trust — emails come from coach's real address | — Pending |
| Inngest replaces n8n | TypeScript-native, no execution limits, scales per-coach, no infra to manage | — Pending |
| Vercel Cron Jobs → Inngest events for scheduling | Zero extra services, native to the stack | — Pending |
| Twilio for WhatsApp + SMS notifications | Multi-channel reach without extra platforms | — Pending |
| All 7 calendar tools via unified abstraction | Single interface regardless of coach's tool | — Pending |
| Two-layer voice model (structured + few-shot) | Structured profile for consistency, examples for style fidelity | — Pending |
| Draft approval: 24h window → HOLD on timeout | Explicit coach consent model — never auto-sends without action by default | — Pending |
| Admin at /admin, Daniel-only | Operational visibility across all coaches without building a separate tool | — Pending |
| Instagram scaffolded in Phase 2 | Meta app review takes time — start early even if functionality is Phase 2+ | — Pending |
| Invite-only auth | Managed product, not SaaS — Daniel controls who gets access | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-04 after initialization*
