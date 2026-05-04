# The Client Architecture — Project Overview & Claude Code Setup

> **Sonorous Digital / The Modern Architect's Office**  
> Software-delivered service for coaching businesses.  
> Primary: Module 1 — The Intake Sequence (follow-up system)  
> Stack: Next.js 15 · Supabase · n8n · Resend · Gmail API · Meta Graph API

---

## 1. What This Is

A software-delivered service — not SaaS. Daniel operates the system. Coaches interact through a dashboard. The distinction matters for architecture: this is a managed product, not a self-serve platform.

**Three modules, one live at launch:**

| Module | Name | Status | Description |
|---|---|---|---|
| 1 | The Intake Sequence | **Ship first** | AI follow-up system for post-call leads |
| 2 | The Threshold Experience | Locked (upsell) | Post-purchase onboarding |
| 3 | The Continuation | Locked (upsell) | End-of-program re-engagement |

Modules 2 and 3 are visible in the dashboard with active sell copy — not "coming soon" placeholders. The lock screen is a sales page.

---

## 2. The Follow-Up System — Detailed Spec

### 2.1 The Problem It Solves

Leads don't go cold because they lost interest. They go cold because nobody caught them at the right moment, in the right voice. The Intake Sequence catches them — using the coach's exact communication style, built from real conversation history.

### 2.2 Data Sources & Onboarding

**Voice model inputs (one-time setup per coach):**
- Email thread exports (Gmail OAuth or manual .mbox upload)
- LinkedIn message export (Settings → Data Privacy → Get a copy → CSV)
- Instagram DM export (manual, or Meta Graph API with `instagram_manage_messages`)
- WhatsApp export (.txt file)

**Transcription tool integrations (coach's existing stack):**
- Fathom — API integration (preferred)
- Fireflies.ai — API integration
- Otter.ai — API integration
- Fallback: manual upload via dashboard (coach pastes or uploads transcript)

**Service information:**
- Coach's offer, program structure, outcomes, pricing (collected via onboarding wizard — structured form or call)

**All of this feeds a persistent voice model stored per coach. Referenced on every message the system ever generates.**

### 2.3 Lead Intelligence Layer

Every lead gets a tracked profile with:

```
lead_id
coach_id
name, email, instagram_handle, linkedin_url
source (DM / referral / content / etc.)
stage: 'identified' | 'dm_conversation' | 'call_booked' | 'no_show' | 
        'call_completed' | 'ghosted' | 'in_sequence' | 'replied' | 
        'coach_responded' | 'closed_won' | 'closed_lost' | 'dead'
timeline: array of dated events (first DM, call booked, no-show, etc.)
conversation_history: full message threads (email + DM) with timestamps
call_transcripts: array of transcript records
open_events: email open timestamps
reply_events: email reply timestamps  
coach_sent_events: manual emails sent by coach outside the system
```

**The timeline is critical.** The system understands that a follow-up after a no-show is different from a follow-up after a completed call. It uses event dates and types to determine what to send and when.

### 2.4 Trigger Events

| Trigger | Source | Action |
|---|---|---|
| No-show | Calendly webhook | Start Intake Sequence |
| Lead ghosted | No reply after X days | Resume sequence with escalation |
| Email opened, not replied | Gmail API | Adjust next touchpoint copy |
| Coach sent manual email | Gmail API (sent folder monitor) | Pause sequence |
| Lead replied | Gmail API webhook | Stop sequence, notify coach |
| 30 days before program end | Internal scheduler | Trigger Module 3 (when built) |
| New purchase | Webhook (Stripe/ThriveCart) | Trigger Module 2 (when built) |

### 2.5 AI Draft Engine

**Input package per draft:**
1. Coach voice model (built from their actual historical communications)
2. Lead conversation history (full thread, chronologically ordered)
3. Call transcript(s)
4. Lead's current stage and timeline
5. Previous messages sent in this sequence
6. Coach's service information
7. Which touchpoint this is (1st, 2nd, 3rd follow-up, etc.)

**Output:**
- Draft message (email or DM) in the coach's exact voice
- Suggested send time based on scheduling logic
- Confidence note if relevant (e.g., "limited conversation history available")

**Non-negotiable principle:** The system references what was actually discussed. Not templates. Not "just checking in." Every message earns the right to the coach's voice by using real context.

### 2.6 Four-Channel Human Approval System

Drafts are surfaced to the coach **24 hours before** intended send time via all four channels simultaneously. Coach approves or adjusts on whichever channel they're already in.

| Channel | Mechanism | UX |
|---|---|---|
| **Browser extension** | Grammarly-style overlay | Appears when coach visits Gmail/LinkedIn in browser |
| **Slack / Discord / WhatsApp / Email** | Push notification with draft preview | One-click approve or edit inline |
| **Dashboard** | Full review queue with edit functionality | Default fallback |
| **MCP server** | Claude integration | "Any drafts to handle?" → AI reads queue |

**Autonomous mode toggle exists.** Visible in settings. Not recommended framing is explicit. Legal cover by design.

### 2.7 Pre-Send Safety Check

Even after approval, the system runs a final check immediately before sending:

1. Has the lead replied since approval? → Cancel send, notify coach
2. Has the coach manually emailed the lead since approval? → Cancel send
3. Is the lead's stage still appropriate for this message? → Verify
4. Is the send time still optimal? → Adjust if needed

This is non-negotiable. Up to 24 hours can pass between approval and send. A lot can happen.

### 2.8 Smart Scheduler

Send time determined by, in priority order:

1. **Lead's timezone** (inferred from email headers, location data, or manually set)
2. **Reply window analysis** — if enough data, when the prospect historically replies
3. **General optimal windows** — Tuesday–Thursday, 9–11am or 1–3pm local time
4. **Exclusions** — weekends, holidays, outside business hours (configurable)

### 2.9 State Machine — Lead Stages

```
identified
    → dm_conversation (first interaction logged)
    → call_booked (calendar event detected)
        → no_show (webhook from Calendly)
            → in_sequence (Intake Sequence starts)
                → replied (sequence pauses, coach notified)
                → coach_responded (sequence pauses)
                → ghosted (sequence escalates)
                → dead (coach marks manually)
                → closed_won (coach marks)
                → closed_lost (coach marks)
        → call_completed (coach marks or AI detects via transcript)
            → ghosted (no follow-up reply after X days)
```

---

## 3. Tech Stack — Decisions & Rationale

### 3.1 Frontend
| Choice | Why |
|---|---|
| **Next.js 15 (App Router)** | Server components, RSC, edge-ready. Best-in-class for dashboard + marketing hybrid. |
| **TypeScript (strict)** | Non-negotiable. 30 years of experience says untyped code is a liability. |
| **Tailwind CSS v4** | Utility-first, no runtime overhead. |
| **shadcn/ui** | Unstyled primitives, full control, accessible by default. |
| **Framer Motion** | Dashboard micro-interactions. Not for decoration — for feedback. |

### 3.2 Backend
| Choice | Why |
|---|---|
| **Supabase** | Postgres + Auth + Realtime + Row Level Security out of the box. Not Firebase. |
| **Supabase RLS** | Every query scoped to `coach_id`. No accidental data cross-contamination. |
| **Next.js API Routes + Server Actions** | Co-located with frontend. Type-safe end-to-end via tRPC or direct. |
| **n8n (self-hosted)** | Workflow automation engine. Handles webhooks, scheduling, API orchestrations. Not Zapier — you own it. |
| **Resend** | Transactional email (system emails). Clean API, excellent deliverability. |

### 3.3 External Integrations
| Integration | Purpose |
|---|---|
| **Gmail API (OAuth 2.0)** | Monitor inboxes, detect replies, track opens, send approved emails |
| **Meta Graph API** | Instagram DM thread read + send (`instagram_manage_messages` permission) |
| **Calendly Webhooks** | No-show detection (primary trigger for Module 1) |
| **Fathom / Fireflies / Otter APIs** | Transcript ingestion |
| **Anthropic API (Claude)** | Draft generation engine |
| **Stripe** | Billing (when needed) |

### 3.4 Infrastructure
| Choice | Why |
|---|---|
| **Vercel** | Next.js native, edge functions, zero config |
| **Supabase Cloud** | Managed Postgres, handles backups, point-in-time recovery |
| **n8n Cloud or self-hosted on Railway** | Workflow engine with persistent state |
| **Redis (Upstash)** | Rate limiting, queue management, session state |

---

## 4. Security — Non-Negotiables

These are not optional. They are the foundation.

### 4.1 Authentication & Authorization
- Supabase Auth with RLS on every table — `coach_id` scoped by default
- Service role key never exposed to client — server-side only
- OAuth tokens (Gmail, Instagram) encrypted at rest using AES-256, stored in Supabase Vault
- Refresh token rotation enforced
- API routes protected with middleware auth check — no exceptions

### 4.2 Data Handling
- All PII (lead data, conversation history, transcripts) stored in EU-region Supabase instance (GDPR compliance)
- Conversation data encrypted at rest
- Transcripts processed server-side only — never passed to client
- Anthropic API calls made server-side, API key in environment variables only
- Data retention policy defined per tier (configurable, default 24 months)

### 4.3 API Security
- Rate limiting on all endpoints via Upstash Redis
- Webhook signature verification on all incoming webhooks (Calendly, Stripe, Meta)
- Input validation with Zod on all API boundaries
- CSRF protection on all mutations
- Content Security Policy headers
- No `console.log` in production with sensitive data

### 4.4 Third-Party OAuth
- Minimal scopes — request only what is needed
- Token storage in Supabase Vault, not in application database columns
- OAuth state parameter validated on callback
- Revocation endpoint implemented so coaches can disconnect at any time

---

## 5. Project File Structure

```
client-architecture/
├── CLAUDE.md                    # Claude Code instructions (this document feeds it)
├── PROJECT.md                   # GSD project spec
├── REQUIREMENTS.md              # GSD requirements
├── .claude/
│   ├── skills/                  # All installed skills
│   │   ├── get-shit-done/       # GSD - spec-driven dev system
│   │   ├── impeccable/          # Design quality enforcement
│   │   ├── huashu-design/       # High-fidelity UI prototyping
│   │   ├── taste-skill/         # Frontend taste & premium UI
│   │   ├── playwright-skill/    # E2E browser testing
│   │   └── interface-design/    # Persistent design system memory
│   └── commands/                # Custom slash commands
├── apps/
│   └── web/                     # Next.js 15 app
│       ├── app/
│       │   ├── (auth)/          # Login, onboarding
│       │   ├── (dashboard)/     # Main coach dashboard
│       │   │   ├── leads/       # Lead list + profiles
│       │   │   ├── sequences/   # Active sequences view
│       │   │   ├── approvals/   # Draft review queue
│       │   │   ├── settings/    # Integrations, voice model, profile
│       │   │   └── modules/     # Module 2 & 3 locked screens
│       │   └── api/             # API routes
│       │       ├── webhooks/    # Calendly, Stripe, Meta webhooks
│       │       ├── gmail/       # Gmail OAuth flow + monitoring
│       │       ├── instagram/   # Meta Graph API
│       │       ├── drafts/      # Draft generation + approval
│       │       └── leads/       # Lead CRUD + state transitions
│       ├── components/
│       │   ├── ui/              # shadcn/ui primitives
│       │   ├── leads/           # Lead-specific components
│       │   ├── approvals/       # Draft approval components
│       │   └── onboarding/      # Onboarding wizard components
│       └── lib/
│           ├── supabase/        # Client, server, middleware
│           ├── ai/              # Anthropic API wrapper + voice model
│           ├── gmail/           # Gmail API client
│           ├── instagram/       # Meta Graph API client
│           ├── scheduler/       # Smart send time logic
│           └── security/        # Encryption, validation, rate limits
├── packages/
│   ├── database/                # Supabase types, migrations, RLS policies
│   ├── shared/                  # Shared types, utils, validators
│   └── ai-engine/               # Voice model builder + draft engine
├── n8n/
│   └── workflows/               # n8n workflow definitions (JSON exports)
│       ├── intake-sequence.json
│       ├── gmail-monitor.json
│       ├── instagram-monitor.json
│       └── scheduler.json
└── tests/
    ├── e2e/                     # Playwright E2E tests
    ├── unit/                    # Vitest unit tests
    └── integration/             # API integration tests
```

---

## 6. Claude Code Skills — Installation

Install these before writing a single line of code. In this order.

### 6.1 GSD — Get Shit Done
**What it does:** Spec-driven development system. Creates PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md. Runs structured planning phases with context engineering. Prevents scope creep and context window drift.

```bash
git clone https://github.com/gsd-build/get-shit-done.git
cd get-shit-done
npm run build:hooks
node bin/install.js --claude --local
```

**Key commands once installed:**
```
/gsd-new-project        # Kick off the project spec
/gsd-discuss-phase 1    # Lock in phase 1 preferences
/gsd-plan-phase 1       # Plan phase 1 tasks
/gsd-execute-phase 1    # Execute
/gsd-progress           # See where you are
/gsd-quick "fix X"      # Targeted fixes
```

---

### 6.2 Impeccable — Design Quality Enforcement
**What it does:** Audits UI against 24 design quality rules. Catches AI slop before it ships — purple gradients, side-tab borders, bounce easing, cramped padding, skipped headings. Commands: `/audit`, `/polish`, `/normalize`, `/distill`.

```bash
# Download from impeccable.style or:
cp -r dist/claude-code/.claude ~/.claude/
```

**Use it on every component before considering it done:**
```
/impeccable audit dashboard
/impeccable polish approval-card
/impeccable harden lead-form
```

---

### 6.3 Huashu Design — High-Fidelity UI Prototyping
**What it does:** HTML-native design skill. 20 design philosophies. Produces production-quality prototypes, animated demos, and slide decks from a single sentence. Useful for building the locked module screens and dashboard wireframes before engineering them.

```bash
npx skills add https://github.com/alchaincyf/huashu-design
```

**Use for:**
- Locked module sell screens (Modules 2 & 3)
- Onboarding wizard flow
- Dashboard layout exploration before building

---

### 6.4 Taste Skill — Premium Frontend UI
**What it does:** Frontend taste skill. Premium UI generation with GSAP motion, brutalist/minimalist/soft variants, 3-dial parameterization (variance, motion, density). Prevents generic AI aesthetic output.

```bash
npx skills add https://github.com/Leonxlnx/taste-skill
```

**Use for:** Any component that the coach sees. This is a premium product — it needs to feel premium.

---

### 6.5 Interface Design — Persistent Design System Memory
**What it does:** Maintains a persistent design system file across sessions. Slash commands for init/audit/extract. Enforces token consistency between sessions so the dashboard doesn't drift visually as it grows.

```bash
git clone https://github.com/Dammyjay93/interface-design ~/.claude/plugins/interface-design
```

**Run on day one:**
```
/interface-design:init   # Creates your design system file
/interface-design:audit  # Checks consistency
```

---

### 6.6 Playwright Skill — E2E Testing
**What it does:** Claude autonomously writes and executes Playwright automation on-the-fly. Model-invoked — Claude decides when to test. Visible browser by default (headless: false). Handles login flows, form submissions, approval workflows, responsive testing.

```bash
# Primary (2.2k stars, general purpose):
npx skills add https://github.com/lackeyjb/playwright-skill --skill playwright-skill

# Comprehensive test library (70+ guides):
npx skills add testdino-hq/playwright-skill
```

**Critical tests to write for this project:**
- Onboarding wizard complete flow
- Gmail OAuth connection
- Draft approval (all four channels)
- Lead stage transitions
- Autonomous mode toggle
- Locked module CTA click → booking flow

---

## 7. CLAUDE.md — Project Instructions

Create this at the project root. Claude Code reads it on every session.

```markdown
# The Client Architecture — Claude Code Instructions

## Project Context
This is a software-delivered service for coaching businesses. Daniel operates 
the backend. Coaches interact via dashboard. Not SaaS — managed product.

Primary module being built: The Intake Sequence (Module 1 — follow-up system).
Modules 2 & 3 are dashboard-visible, locked, with active sell copy.

## Non-Negotiable Rules

### Security First
- RLS on every Supabase table, always scoped to coach_id
- Service role key server-side only, never in client code
- OAuth tokens encrypted via Supabase Vault — never plain database columns
- Zod validation on every API boundary
- Webhook signature verification on every incoming webhook
- No sensitive data in console.log in any environment

### TypeScript
- Strict mode. Always.
- No `any`. If you're tempted to use `any`, stop and fix the type.
- Shared types live in packages/shared

### Code Quality
- Components under 200 lines. Extract if longer.
- Server components by default. Client components only when needed (interactivity, browser APIs).
- Error boundaries on every major section.
- Loading states on every async operation.
- Empty states on every list/table.

### Voice & Copy
- The product is premium. The dashboard copy must match.
- Module 2 lock screen CTA: "The Threshold Experience — your client's first 48 hours, 
  built from your sales call. [Book a call]"
- Module 3 lock screen CTA: "The Continuation — thirty days before they leave, 
  we remind them why they stayed. [Book a call]"
- No generic placeholder text anywhere visible to coaches.

### Architecture Decisions Already Made
- Next.js 15 App Router (no Pages Router)
- Supabase for database, auth, realtime
- n8n for workflow automation (self-hosted)
- Resend for transactional email
- Gmail API for coach inbox monitoring
- Anthropic Claude for draft generation (claude-sonnet-4-6)
- Upstash Redis for rate limiting and queuing

## File Conventions
- Components: PascalCase
- Utilities: camelCase
- API routes: kebab-case
- Database tables: snake_case
- Types: PascalCase with `T` prefix for types, `I` for interfaces

## Skills Loaded
- GSD: use /gsd-* commands for planning and execution phases
- Impeccable: run /impeccable audit before any component is considered done
- Taste: apply to all coach-facing UI
- Interface-design: run /interface-design:audit when adding new components
- Playwright: write E2E tests for every user flow

## Current Build Phase
Phase 1: Core infrastructure + Lead management + Gmail integration
See ROADMAP.md for full phase breakdown.
```

---

## 8. Database Schema — Core Tables

```sql
-- Coaches (one per customer)
coaches (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  business_name text,
  voice_model jsonb,           -- Built from their communication history
  service_info jsonb,          -- Offer, program, outcomes, pricing
  settings jsonb,              -- Autonomous mode, timezone, preferences
  created_at timestamptz DEFAULT now()
)

-- Leads tracked per coach
leads (
  id uuid PRIMARY KEY,
  coach_id uuid REFERENCES coaches(id),
  name text,
  email text,
  instagram_handle text,
  linkedin_url text,
  source text,
  stage text NOT NULL DEFAULT 'identified',
  timeline jsonb DEFAULT '[]',          -- Dated events array
  conversation_history jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Sequences (one active sequence per lead at a time)
sequences (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES leads(id),
  coach_id uuid REFERENCES coaches(id),
  module int DEFAULT 1,
  status text DEFAULT 'active',        -- active | paused | completed | cancelled
  touchpoint_count int DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
)

-- Drafts (one per scheduled touchpoint)
drafts (
  id uuid PRIMARY KEY,
  sequence_id uuid REFERENCES sequences(id),
  coach_id uuid REFERENCES coaches(id),
  lead_id uuid REFERENCES leads(id),
  content text NOT NULL,
  channel text NOT NULL,              -- email | instagram_dm
  status text DEFAULT 'pending',      -- pending | approved | sent | cancelled
  scheduled_send_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  cancelled_reason text,
  created_at timestamptz DEFAULT now()
)

-- Email events (opens, replies, sends)
email_events (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES leads(id),
  coach_id uuid REFERENCES coaches(id),
  draft_id uuid REFERENCES drafts(id),
  event_type text,                    -- open | reply | coach_sent | bounce
  gmail_message_id text,
  occurred_at timestamptz,
  metadata jsonb DEFAULT '{}'
)

-- Integrations (per coach)
integrations (
  id uuid PRIMARY KEY,
  coach_id uuid REFERENCES coaches(id),
  provider text NOT NULL,             -- gmail | instagram | fathom | fireflies | otter
  status text DEFAULT 'disconnected',
  encrypted_tokens text,              -- Supabase Vault reference, not raw tokens
  scopes text[],
  connected_at timestamptz,
  expires_at timestamptz
)
```

**RLS policy example (all tables follow this pattern):**
```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_leads" ON leads
  FOR ALL USING (coach_id = auth.uid());
```

---

## 9. Build Phases

### Phase 1 — Foundation (Weeks 1–3)
- Supabase setup with full RLS
- Next.js 15 project scaffolding
- Auth flow (login, invite-only onboarding)
- Lead management (CRUD, stage transitions, timeline)
- Gmail OAuth connection
- Basic dashboard layout (lead list, lead profile)

### Phase 2 — Intelligence (Weeks 4–6)
- Voice model builder (ingest email/conversation exports)
- Anthropic integration (draft engine)
- Transcript tool integrations (Fathom, Fireflies, Otter)
- Lead conversation history import

### Phase 3 — Automation (Weeks 7–9)
- Calendly webhook → no-show trigger
- n8n workflow: sequence orchestration
- Gmail monitoring (reply detection, open tracking, coach-sent detection)
- Smart scheduler

### Phase 4 — Approval Channels (Weeks 10–12)
- Dashboard approval queue
- Email notification channel
- Slack/Discord webhook notification
- Browser extension (Grammarly-style overlay)
- MCP server integration

### Phase 5 — Polish & Locked Modules (Weeks 13–14)
- Module 2 & 3 locked screens with sell copy
- Onboarding wizard (full flow)
- Settings: autonomous mode toggle, integrations page
- Playwright E2E test suite
- Impeccable audit — full dashboard pass

---

## 10. First Commands to Run in Claude Code

```bash
# 1. Install GSD first
git clone https://github.com/gsd-build/get-shit-done.git && cd get-shit-done && npm run build:hooks && node bin/install.js --claude --local

# 2. Install design skills
npx skills add https://github.com/alchaincyf/huashu-design
npx skills add https://github.com/Leonxlnx/taste-skill

# 3. Install Playwright
npx skills add https://github.com/lackeyjb/playwright-skill --skill playwright-skill

# 4. Install Impeccable (download from impeccable.style, then:)
cp -r dist/claude-code/.claude ~/.claude/

# 5. Start the project
/gsd-new-project
```

Then let GSD run its intake — answer the questions about the project, preferences, and constraints. It will generate PROJECT.md, REQUIREMENTS.md, ROADMAP.md, and CONTEXT.md automatically. From that point, every phase has a plan before execution starts.

---

## 11. Key Principles — Carry Into Every Build Session

1. **This is premium.** Every coach-facing surface must feel like it. Run `/impeccable audit` before shipping any component.

2. **Voice fidelity is the entire product.** The AI engine must reference real conversation history on every draft. Generic outputs are a product failure.

3. **Semi-automatic, always.** Human approval in the loop. The autonomous toggle exists — it is not the default.

4. **Security is the foundation, not an afterthought.** RLS, encrypted tokens, Zod validation, webhook verification. Non-negotiable from day one.

5. **Locked modules must sell.** Modules 2 and 3 in the dashboard are not placeholders. They are sales assets. The copy must convert.

6. **Build for the inch-to-a-mile principle.** The coach changes as little as possible in their existing workflow. The system fits around them.

---

*Built by Sonorous Digital — The Modern Architect's Office*
