# The Client Architecture — Claude Code Instructions

> **FIRST ACTION EVERY SESSION:** Run `gh issue list --label resume-point --state open` and read any open resume-point issues before doing anything else. That's where the last session left off.

---

## What This Is

Software-delivered service for coaching businesses. **Daniel operates the system. Coaches interact via dashboard.** This is a managed product, not SaaS.

**Three modules, one live at launch:**
- **Module 1 — The Intake Sequence** → Build this first. AI follow-up system for post-call leads.
- Module 2 — The Threshold Experience → Locked (upsell). Visible in dashboard with sell copy.
- Module 3 — The Continuation → Locked (upsell). Visible in dashboard with sell copy.

**Operator:** Daniel (djn203040@gmail.com) — 5–10 coaches at launch.

---

## Architecture Decisions (Final — Do Not Re-Debate)

| Decision | Choice | Reason |
|---|---|---|
| Email sending | Gmail API, sends AS coach | Deliverability + trust |
| Email open tracking | Tracking pixel, our server logs | Industry standard |
| Workflow engine | **Inngest** (not n8n) | TypeScript-native, no execution limits, scales per-coach |
| Cron triggers | Vercel Cron Jobs → Inngest events | Zero extra services |
| Notifications to coach | Twilio (WhatsApp + SMS) + Slack webhooks + Resend | Multi-channel |
| Calendar integrations | Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal | All 7, unified abstraction |
| AI drafts | Anthropic claude-sonnet-4-6, server-side only | Never in client code |
| Database | Supabase (Postgres + Auth + RLS + Vault) | coach_id-scoped everywhere |
| Frontend | Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui, Framer Motion | |
| Hosting | Vercel | |
| Rate limiting | Upstash Redis | |
| Instagram | Phase 2+ (scaffold early for Meta review) | Not blocking Phase 1 |
| Browser extension | Future scope | Not blocking any phase |

---

## Voice Model Architecture

Two-layer system stored as JSONB per coach:
- **Layer 1:** Structured profile — tone adjectives, formality, sentence length, emoji habits, opener/closer phrases, never-say list
- **Layer 2:** 10–15 curated real message examples as few-shot context, injected into every Claude prompt
- Built from: Gmail exports, LinkedIn CSV (manual, onboarding tutorial guides coach), Instagram DMs, WhatsApp .txt

---

## Draft Approval Flow

1. Draft surfaces **24h before** intended send → coach notified on all connected channels
2. Coach approves or adjusts → send proceeds
3. No action after 24h → follow-up CTA sent → another 24h window
4. Still no action → draft goes to **HOLD** (waits indefinitely)

**Autonomous mode** (settings toggle):
- Option A: Auto-send, no review at all
- Option B: 24h window → auto-sends on timeout if not approved

---

## Non-Negotiable Rules

### Security
- RLS on **every** Supabase table, always scoped to `coach_id`
- Service role key server-side only — never in client code
- OAuth tokens in Supabase Vault — not plain database columns
- Zod validation on every API boundary
- Webhook signature verification on every incoming webhook
- No sensitive data in `console.log` anywhere

### TypeScript
- Strict mode. Always.
- No `any`. Fix the type, don't skip it.
- Shared types live in `packages/shared/`

### Code Quality
- Components under 200 lines — extract if longer
- Server components by default, client only when needed
- Error boundaries on every major section
- Loading states on every async operation
- Empty states on every list/table

### Design
- Glass/frosted cards (`backdrop-blur-md`, `bg-white/10`)
- Warm uplifting colors — NOT neon green, NOT dark purple, NOT tech-bro
- Dark/light toggle — both modes supported
- Custom swappable backgrounds (CSS `--bg-image` on `:root`)
- Simple — not chart-heavy. Coaches are the users, not finance teams.
- Run `/impeccable audit` before any component is considered done

### Copy
- Premium throughout. No generic placeholder text visible to coaches.
- Module 2 lock CTA: "The Threshold Experience — your client's first 48 hours, built from your sales call. [Book a call]"
- Module 3 lock CTA: "The Continuation — thirty days before they leave, we remind them why they stayed. [Book a call]"

---

## Admin Dashboard

Route: `/admin` — protected, Daniel-only.
Shows: all coaches, usage metrics, integration health, sequence activity, approval rates, system health.

---

## Skills Installed

| Skill | Command | Use for |
|---|---|---|
| GSD | `/gsd-*` | Planning, phases, progress tracking |
| Impeccable | `/impeccable` | Audit every component before shipping |
| Huashu Design | auto | High-fidelity HTML prototypes |
| Taste Skill (×12) | auto | Premium frontend UI generation |
| Playwright | auto | E2E test writing and execution |
| Interface Design | `/interface-design:*` | Design system consistency |

---

## File Conventions

- Components: `PascalCase`
- Utilities: `camelCase`
- API routes: `kebab-case`
- Database tables: `snake_case`
- Types: `PascalCase` with `T` prefix for types, `I` for interfaces

---

## GitHub Issue Workflow

Track everything in GitHub Issues. Labels:
- `phase-1` through `phase-5` — which phase
- `in-progress` — actively being built
- `completed` — done and working
- `blocked` — waiting on external dependency
- `resume-point` — **context handoff marker** (read these first, always)
- `architecture` — key decisions made

When context window is filling up, create a `resume-point` issue before stopping.

---

## Build Phases

| Phase | Focus | Weeks |
|---|---|---|
| 1 | Foundation: Supabase, auth, lead management, Gmail OAuth, basic dashboard, admin view | 1–3 |
| 2 | Intelligence: Voice model builder, Anthropic draft engine, transcript integrations | 4–6 |
| 3 | Automation: Calendar webhooks (all 7), Inngest sequences, Gmail monitoring | 7–9 |
| 4 | Approval channels: Dashboard queue, Email, Slack, Twilio WhatsApp | 10–12 |
| 5 | Polish: Locked module sell screens, onboarding wizard, Playwright tests | 13–14 |

---

*Built by Sonorous Digital — The Modern Architect's Office*
