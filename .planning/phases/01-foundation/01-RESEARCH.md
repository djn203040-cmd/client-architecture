# Phase 1: Foundation — Research

**Researched:** 2026-05-05
**Domain:** Turborepo monorepo, Supabase schema + RLS + Vault, Next.js 15 App Router, Gmail OAuth 2.0, Inngest v3/v4, Invite-only auth
**Confidence:** HIGH — all critical claims verified against npm registry, official docs, and prior session research

---

## Summary

Phase 1 builds the structural skeleton that every downstream phase depends on. The Supabase schema written here is the highest-stakes artifact of the entire project — schema changes after Phase 3 Inngest functions exist create painful type regeneration cycles. Every table must be designed now for features that land in Phases 3–5.

The monorepo setup (Turborepo + pnpm + TypeScript strict) is well-understood territory, but has one important decision: Inngest v4 is now latest (not v3), and the serve pattern and `maxDuration` requirements are identical. The Gmail OAuth flow has sharp edges — refresh tokens are delivered exactly once, `invalid_grant` is not a transient error, and Google's OAuth verification process (which must begin in Phase 1) can take weeks. The testing mode 7-day token expiry is a real constraint that will break Phase 3 sequences if review is not initiated immediately.

The Instagram Basic Display API was permanently shut down by Meta on December 4, 2024. INFRA-010 ("Instagram API scaffolded early for Meta review") must use the Instagram Graph API with the Messenger Platform instead — the scaffolding approach changes accordingly, though the core intent (starting the Meta app review early) remains valid.

**Primary recommendation:** Write the schema first, generate types, then scaffold the application around those types. Never let schema drift behind Inngest function assumptions.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth (invite-only flow) | Frontend Server (SSR) | Database (Supabase Auth) | Cookie-based sessions; middleware refreshes tokens |
| Lead CRUD | API / Backend | Database (Postgres + RLS) | Zod-validated route handlers; RLS enforces tenant boundary |
| Gmail OAuth callback | API / Backend | Database (Vault) | Token exchange is server-only; tokens stored encrypted |
| Draft approval queue (UI) | Browser / Client | Frontend Server (SSR) | Realtime subscription requires client component; initial data SSR |
| Activity timeline (display) | Frontend Server (SSR) | — | Read-only, no interactivity needed — server render |
| Admin cross-coach queries | API / Backend | Database (service role) | Service role bypass is intentional and contained server-side |
| Integration health state | Frontend Server (SSR) | Browser / Client | Initial state SSR; reconnect button is client interaction |
| Inngest serve endpoint | API / Backend | — | GET/POST/PUT route handler; maxDuration = 300 |
| RLS enforcement | Database / Storage | — | Postgres-level; not duplicated in application code |
| Vault token storage | Database / Storage | — | pgsodium-encrypted; service role access only |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.4 | Framework — App Router, server components, route handlers | Project decision; latest stable |
| @supabase/supabase-js | 2.105.3 | Supabase JS client | Official client; version-aligned with @supabase/ssr |
| @supabase/ssr | 0.10.2 | SSR-safe Supabase client for Next.js | Replaces legacy auth-helpers; cookie-based sessions |
| inngest | 4.2.6 | Durable workflow engine | Project decision; v4 is latest (v3 patterns identical) |
| googleapis | 171.4.0 | Gmail API Node.js client | Official Google client |
| @upstash/ratelimit | 2.0.8 | Rate limiting on API routes | HTTP-based, Edge-compatible, Vercel-native |
| @upstash/redis | 1.37.0 | Redis client for Upstash | Paired with ratelimit |
| zod | 4.4.3 | Schema validation on all API boundaries | Project non-negotiable |
| tailwindcss | 4.2.4 | Utility CSS | Project decision |
| framer-motion | 12.38.0 | Spring animations, layout transitions | UI spec requirement |
| @phosphor-icons/react | 2.1.10 | Icon library (1.5 stroke weight) | UI spec requirement |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn (CLI) | 4.7.0 | Component scaffolding tool | Run once during init; not a runtime dependency |
| vitest | 4.1.5 | Unit and integration test runner | All server-side logic, Zod validators, RLS tests |
| @playwright/test | 1.59.1 | E2E browser testing | Auth flows, lead CRUD end-to-end |
| turbo | 2.9.9 | Monorepo task runner and cache | Build, dev, type-check pipeline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| inngest v4 | inngest v3 (3.54.2) | v3 still maintained; v4 adds checkpointing. Use v4 — it is current |
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated; ssr is the replacement |
| vitest | jest | vitest is ESM-native, faster, no babel config needed for Next.js 15 |
| Upstash ratelimit | express-rate-limit | express-rate-limit has no Edge runtime support |

**Installation (monorepo root then workspace packages):**
```bash
# Install pnpm globally first (required for workspace protocol)
npm install -g pnpm turbo

# Root
pnpm init
pnpm add -D turbo

# apps/web
pnpm add next@latest @supabase/supabase-js @supabase/ssr inngest googleapis zod \
  tailwindcss framer-motion @phosphor-icons/react @upstash/ratelimit @upstash/redis
pnpm add -D vitest @playwright/test typescript @types/node @types/react
```

**Version verification:** All versions above confirmed via `npm view [package] version` against live npm registry on 2026-05-05. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Coach Browser
  │ (cookie session)
  ▼
Next.js App Router (apps/web)
  ├─ Server Components ──────► Supabase (RLS-scoped, coach_id)
  │    (SSR initial data)            └─ Postgres tables
  ├─ Client Components               └─ Realtime (drafts table)
  │    (Realtime subscription)       └─ Auth (invite-only)
  ├─ Middleware ────────────► Supabase Auth (token refresh via getUser())
  │
  └─ API Routes (server-only)
       ├─ /api/auth/gmail/*  ──────► Google OAuth 2.0
       │    └─ callback stores       └─ Token exchange
       │       tokens to Vault
       ├─ /api/inngest        ──────► Inngest Cloud (GET/POST/PUT, maxDuration=300)
       │    (scaffold only, no       └─ Function registry
       │     functions yet)
       ├─ /api/leads/*        ──────► Supabase (service role OR RLS client)
       ├─ /api/webhooks/*     ──────► Upstash Redis (idempotency)
       │    (scaffold + HMAC            └─ Inngest (event fire, Phase 3)
       │     verification pattern)
       └─ /api/admin/*        ──────► Supabase (service role, RLS bypass)

packages/shared     ─── Types, Zod schemas, event name constants
packages/database   ─── Generated Supabase types, SQL migrations
packages/ai-engine  ─── (scaffold only in Phase 1, server-side only marker)
```

### Recommended Project Structure
```
client-architecture/
├── turbo.json                    # build/dev/lint/type-check pipeline
├── pnpm-workspace.yaml           # packages: ["apps/*", "packages/*"]
├── package.json                  # root — private: true, turbo devDep only
├── .env.example                  # all required env vars documented
├── apps/
│   └── web/
│       ├── next.config.ts        # transpilePackages, outputFileTracingRoot
│       ├── middleware.ts          # Supabase auth token refresh, admin route guard
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── invite/[token]/page.tsx   # accept invite + set password
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx               # auth check (getUser), coach data fetch
│       │   │   ├── leads/
│       │   │   │   ├── page.tsx             # Server: lead list initial data
│       │   │   │   ├── [id]/page.tsx        # Server: lead profile
│       │   │   │   └── [id]/not-found.tsx
│       │   │   ├── drafts/
│       │   │   │   └── page.tsx             # Server initial, Client Realtime
│       │   │   └── settings/page.tsx        # scaffold
│       │   ├── admin/
│       │   │   ├── layout.tsx               # forbidden() if not Daniel
│       │   │   └── page.tsx                 # all coaches, system health
│       │   └── api/
│       │       ├── inngest/route.ts          # GET/POST/PUT, maxDuration=300
│       │       ├── auth/gmail/
│       │       │   ├── authorize/route.ts
│       │       │   └── callback/route.ts
│       │       ├── leads/
│       │       │   ├── route.ts             # POST create
│       │       │   └── [id]/route.ts        # GET/PATCH/DELETE
│       │       ├── webhooks/
│       │       │   └── [provider]/route.ts  # signature verify scaffold
│       │       └── admin/
│       │           ├── coaches/route.ts
│       │           └── coaches/[id]/route.ts
│       ├── components/
│       │   ├── ui/                          # shadcn primitives
│       │   ├── leads/                       # LeadListTable, LeadProfilePage, etc.
│       │   ├── drafts/                      # DraftCard, InlineDraftEditor scaffold
│       │   ├── auth/                        # InviteLoginCard, InviteAcceptPage
│       │   └── admin/                       # CoachRosterTable, SystemHealthPanel
│       ├── lib/
│       │   ├── supabase/
│       │   │   ├── browser.ts               # createBrowserClient
│       │   │   ├── server.ts                # createServerClient (cookies)
│       │   │   └── admin.ts                 # service role client (server-only)
│       │   ├── gmail/
│       │   │   ├── auth.ts                  # OAuth2 client factory
│       │   │   └── client.ts                # getGmailClientForCoach
│       │   └── security/
│       │       ├── webhook.ts               # signature verification helpers
│       │       └── ratelimit.ts             # Upstash ratelimit instances
│       └── inngest/
│           └── client.ts                    # Inngest singleton (scaffold)
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/index.ts              # TLead, TDraft, TCoach, TIntegration, TLeadEvent
│   │   │   ├── validators/index.ts         # Zod schemas (all API boundaries)
│   │   │   └── constants/events.ts         # Inngest event name constants
│   │   └── package.json                    # name: @client/shared
│   ├── database/
│   │   ├── src/types.ts                    # supabase gen types typescript output
│   │   ├── migrations/
│   │   │   ├── 0001_schema.sql
│   │   │   └── 0002_rls.sql
│   │   └── package.json                    # name: @client/database
│   └── ai-engine/
│       ├── src/index.ts                    # exports only — no implementation yet
│       └── package.json                    # name: @client/ai-engine, sideEffects: false
└── tests/
    ├── e2e/                                # Playwright
    └── integration/                        # Vitest integration tests
```

### Pattern 1: Turborepo + pnpm Workspace Config

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "type-check": { "dependsOn": ["^build"] }
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**apps/web/next.config.ts:**
```typescript
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@client/shared", "@client/database", "@client/ai-engine"],
  // Required for Turborepo monorepo: Next.js standalone output traces from repo root
  outputFileTracingRoot: require("path").join(__dirname, "../../"),
  experimental: {
    // typedRoutes improves route type safety with App Router
    typedRoutes: true,
  },
};

export default config;
```

**Package name pattern (each packages/*/package.json):**
```json
{
  "name": "@client/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./validators": "./src/validators/index.ts",
    "./constants": "./src/constants/events.ts"
  }
}
```

`apps/web/package.json` references these as:
```json
{
  "dependencies": {
    "@client/shared": "workspace:*",
    "@client/database": "workspace:*",
    "@client/ai-engine": "workspace:*"
  }
}
```

[VERIFIED: Turborepo official docs, Next.js transpilePackages docs]

### Pattern 2: `packages/ai-engine` — Server-Side Only Enforcement

The `packages/ai-engine` package must never reach client bundles. Two enforcement layers:

**Layer 1: package.json marker** — `"sideEffects": false` plus a `"browser"` field that throws at import time:
```json
{
  "name": "@client/ai-engine",
  "browser": {
    "./src/index.ts": false
  }
}
```

**Layer 2: Runtime guard at top of entry file:**
```typescript
// packages/ai-engine/src/index.ts
if (typeof window !== "undefined") {
  throw new Error("@client/ai-engine must not be imported in client-side code");
}
```

**Layer 3: CI check** (lint script in turbo.json) that greps for `@client/ai-engine` imports in any file under `app/(dashboard)/**/*.tsx` that is a client component.

[ASSUMED] — Layer 1 browser field behavior in pnpm workspaces with transpilePackages is not fully documented. Layer 2 runtime check is the reliable backstop.

### Pattern 3: Supabase SSR Client Setup (Next.js 15)

**Three distinct clients — never mix:**

```typescript
// lib/supabase/browser.ts — for "use client" components
import { createBrowserClient } from "@supabase/ssr";
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

```typescript
// lib/supabase/server.ts — for Server Components and Route Handlers
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component calling setAll — cookies() is read-only in SC
          }
        },
      },
    }
  );
}
```

```typescript
// lib/supabase/admin.ts — service role, NEVER import in client code
import { createClient } from "@supabase/supabase-js";

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // NO NEXT_PUBLIC_ prefix — enforced by CI
);
```

**Critical:** Always use `supabase.auth.getUser()` — never `getSession()` — in server code. `getSession()` trusts cookie contents without JWT verification. [VERIFIED: Supabase docs]

### Pattern 4: Middleware Auth Refresh

```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: getUser() — not getSession()
  const { data: { user } } = await supabase.auth.getUser();

  // Admin route protection
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const isAdmin = user?.app_metadata?.role === "admin";
    if (!user || !isAdmin) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protected dashboard routes
  if (request.nextUrl.pathname.startsWith("/leads") ||
      request.nextUrl.pathname.startsWith("/drafts")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

[VERIFIED: Supabase SSR docs, Next.js 15 middleware docs]

### Pattern 5: Supabase Schema (Complete — All 5 Phases)

This is the most critical output of Plan 2. The schema must be fully specified now. All columns needed through Phase 5 must exist. Here is the authoritative table manifest:

**Enums:**
```sql
CREATE TYPE lead_status AS ENUM (
  'identified', 'call_booked', 'no_show', 'call_completed',
  'in_sequence', 'replied', 'converted', 'closed',
  'unsubscribed', 'do_not_contact', 'bounced'
);

CREATE TYPE draft_status AS ENUM (
  'pending', 'approved', 'edited', 'sent', 'held', 'cancelled'
);

CREATE TYPE lead_event_type AS ENUM (
  'call_booked', 'no_show', 'call_completed', 'email_sent',
  'email_opened', 'replied', 'draft_approved', 'draft_held',
  'state_changed', 'unsubscribed', 'bounced', 'note_added',
  'sequence_started', 'sequence_paused', 'sequence_resumed',
  'sequence_completed', 'sequence_cancelled', 'manually_enrolled'
);

CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error');
CREATE TYPE integration_provider AS ENUM (
  'gmail', 'calendly', 'cal_com', 'acuity', 'setmore',
  'square', 'ms_bookings', 'tidycal', 'slack', 'twilio',
  'instagram'
);
CREATE TYPE lead_source AS ENUM (
  'calendly', 'cal_com', 'acuity', 'setmore', 'square',
  'ms_bookings', 'tidycal', 'manual', 'gmail_detected',
  'instagram_detected', 'referral'
);
CREATE TYPE sequence_status AS ENUM (
  'active', 'paused', 'completed', 'cancelled', 'held'
);
CREATE TYPE notification_channel AS ENUM ('email', 'slack', 'whatsapp', 'sms');
```

**Core tables:**
```sql
-- coaches: one row per coach, extends auth.users
CREATE TABLE coaches (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  role            TEXT NOT NULL DEFAULT 'coach', -- 'coach' | 'admin'
  -- Voice model (Phases 1-2 scaffold, Phase 2 population)
  voice_model     JSONB DEFAULT '{}',         -- Layer 1 + Layer 2 structure
  service_info    JSONB DEFAULT '{}',         -- coaching offer, outcomes, pricing
  -- Sequence settings (Phase 4)
  autonomous_mode TEXT DEFAULT 'off',         -- 'off' | 'mode_a' | 'mode_b'
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- integrations: one row per provider per coach
CREATE TABLE integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  provider        integration_provider NOT NULL,
  status          integration_status NOT NULL DEFAULT 'disconnected',
  vault_secret_id UUID,              -- Vault UUID — tokens never stored raw here
  scopes          TEXT[] DEFAULT '{}',
  webhook_secret_vault_id UUID,      -- webhook signing secret in Vault
  watch_expiry_at TIMESTAMPTZ,       -- Gmail Pub/Sub watch expiry (HEALTH-005)
  last_checked_at TIMESTAMPTZ,
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}', -- provider-specific data (calendar account IDs, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coach_id, provider)
);

-- leads: the core entity
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  -- Contact
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  -- Classification
  source          lead_source NOT NULL DEFAULT 'manual',
  status          lead_status NOT NULL DEFAULT 'identified',
  -- State flags (non-redundant — these block sends regardless of status)
  do_not_contact  BOOLEAN NOT NULL DEFAULT false,
  bounced         BOOLEAN NOT NULL DEFAULT false,
  -- Coach notes (injected into AI context, Phase 1 scaffold Phase 2 use)
  coach_notes     TEXT,
  -- External identifiers (for matching from webhooks/transcripts)
  external_ids    JSONB DEFAULT '{}',  -- { "calendly_invitee_uri": "...", "fireflies_speaker_id": "..." }
  -- Timestamps
  last_activity_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coach_id, email)
);

-- lead_events: activity timeline
CREATE TABLE lead_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL,      -- denormalized for RLS
  event_type      lead_event_type NOT NULL,
  payload         JSONB DEFAULT '{}', -- event-specific data
  triggered_by    TEXT,               -- 'system' | 'coach' | 'calendly' | etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sequences: one per lead enrollment
CREATE TABLE sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  module          INTEGER NOT NULL DEFAULT 1, -- 1 = Intake Sequence
  track           TEXT NOT NULL DEFAULT 'no_show', -- 'no_show' | 'call_completed'
  status          sequence_status NOT NULL DEFAULT 'active',
  inngest_run_id  TEXT,               -- Inngest run ID for cancellation
  current_touchpoint INTEGER DEFAULT 0,
  scheduled_steps JSONB DEFAULT '[]', -- [{touchpoint, scheduled_at, draft_id}]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- drafts: one per sequence touchpoint
CREATE TABLE drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id     UUID REFERENCES sequences(id) ON DELETE SET NULL,
  -- Content
  subject         TEXT,
  body            TEXT NOT NULL,
  -- Sequence context
  touchpoint_index INTEGER NOT NULL DEFAULT 1,
  total_touchpoints INTEGER,
  -- Approval flow
  status          draft_status NOT NULL DEFAULT 'pending',
  scheduled_send_at TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  held_at         TIMESTAMPTZ,
  -- Voice confidence
  confidence_level TEXT,              -- 'high' | 'low' (fewer than 8 examples)
  -- AI metadata
  ai_model        TEXT DEFAULT 'claude-sonnet-4-6',
  generation_context JSONB DEFAULT '{}', -- token counts, context summary
  -- Locking (Phase 4 autonomous mode race condition prevention)
  status_locked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- draft_edits: voice model feedback loop scaffold (VOICE-006, Phase 1 scaffold)
CREATE TABLE draft_edits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id        UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL,      -- denormalized for RLS
  original_body   TEXT NOT NULL,
  edited_body     TEXT NOT NULL,
  edit_summary    TEXT,               -- future: AI-analyzed diff category
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- transcripts: call transcript storage (Phase 2 population, scaffold now)
CREATE TABLE transcripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL,      -- denormalized for RLS
  provider        TEXT NOT NULL,      -- 'fireflies' | 'zoom' | 'manual'
  call_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  content         TEXT NOT NULL,      -- full transcript text
  token_count     INTEGER,
  external_id     TEXT,               -- provider's transcript ID
  matched_by      TEXT,               -- 'email' | 'name_timestamp' | 'manual'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- email_events: tracking (Phase 3 tracking pixel, scaffold now)
CREATE TABLE email_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id        UUID REFERENCES drafts(id) ON DELETE SET NULL,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL,
  event_type      TEXT NOT NULL,      -- 'sent' | 'opened' | 'clicked' | 'bounced'
  open_source     TEXT,               -- 'direct' | 'proxy' (Apple MPP)
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  raw_payload     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- calendar_events: idempotency store for webhook deduplication (Phase 3)
CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL,
  provider        integration_provider NOT NULL,
  external_event_id TEXT NOT NULL,    -- provider's event UUID
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,      -- 'no_show' | 'call_completed' | 'booking_created'
  payload         JSONB DEFAULT '{}',
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_event_id)  -- deduplication constraint (SEQ-014)
);

-- notification_log: multi-channel notification tracking (Phase 4)
CREATE TABLE notification_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL,
  draft_id        UUID REFERENCES drafts(id) ON DELETE SET NULL,
  channel         notification_channel NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'sent' | 'failed' | 'delivered'
  external_id     TEXT,               -- Twilio SID, Resend ID, etc.
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes (performance):**
```sql
CREATE INDEX leads_coach_id_status ON leads(coach_id, status);
CREATE INDEX leads_coach_id_email ON leads(coach_id, email);
CREATE INDEX lead_events_lead_id ON lead_events(lead_id, created_at DESC);
CREATE INDEX drafts_coach_id_status ON drafts(coach_id, status);
CREATE INDEX drafts_lead_id ON drafts(lead_id);
CREATE INDEX sequences_lead_id ON sequences(lead_id, status);
CREATE INDEX email_events_lead_id ON email_events(lead_id, created_at DESC);
CREATE INDEX calendar_events_external ON calendar_events(provider, external_event_id);
```

**Realtime publication (run once):**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_events;
ALTER PUBLICATION supabase_realtime ADD TABLE integrations;
```

[VERIFIED: Supabase schema documentation, RLS patterns verified against Supabase official docs]

### Pattern 6: RLS Policies

Every table follows the same pattern. `FORCE ROW LEVEL SECURITY` applies even to the table owner:

```sql
-- Example for leads table (same pattern for all coach-owned tables)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_leads" ON leads
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- lead_events: RLS via denormalized coach_id column
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_lead_events" ON lead_events
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Admin access: handled via service role client server-side, NOT via policy
-- Service role bypasses RLS by design — ADMIN-005
```

[VERIFIED: Supabase RLS docs, FORCE ROW LEVEL SECURITY behavior]

### Pattern 7: Vault — SECURITY DEFINER Functions

All Vault operations are wrapped in `SECURITY DEFINER` functions in the `private` schema (not exposed by PostgREST — INFRA-003):

```sql
-- Create private schema (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

-- Store Gmail tokens in Vault
CREATE OR REPLACE FUNCTION private.store_gmail_tokens(
  p_coach_id UUID,
  p_tokens JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_vault_id UUID;
  v_secret_name TEXT := 'gmail_tokens_' || p_coach_id::text;
BEGIN
  -- Upsert: update if exists, create if not
  SELECT id INTO v_vault_id FROM vault.secrets WHERE name = v_secret_name;

  IF v_vault_id IS NOT NULL THEN
    UPDATE vault.secrets SET secret = p_tokens::text WHERE id = v_vault_id;
  ELSE
    SELECT vault.create_secret(
      p_tokens::text,
      v_secret_name,
      'Gmail OAuth tokens for coach ' || p_coach_id::text
    ) INTO v_vault_id;
  END IF;

  RETURN v_vault_id;
END;
$$;

-- Retrieve Gmail tokens from Vault (service role only)
CREATE OR REPLACE FUNCTION private.get_gmail_tokens(
  p_coach_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, private
AS $$
DECLARE
  v_tokens TEXT;
BEGIN
  SELECT decrypted_secret INTO v_tokens
  FROM vault.decrypted_secrets
  WHERE name = 'gmail_tokens_' || p_coach_id::text;

  RETURN v_tokens::JSONB;
END;
$$;

-- Revoke public access — service role only via RPC
REVOKE ALL ON FUNCTION private.store_gmail_tokens(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_gmail_tokens(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.store_gmail_tokens(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION private.get_gmail_tokens(UUID) TO service_role;
```

TypeScript usage:
```typescript
// Store (on OAuth callback)
const { data: vaultId } = await adminClient.rpc("store_gmail_tokens", {
  p_coach_id: coachId,
  p_tokens: { access_token, refresh_token, expiry_date },
});

// Retrieve (before every Gmail API call)
const { data: tokens } = await adminClient.rpc("get_gmail_tokens", {
  p_coach_id: coachId,
});
```

[VERIFIED: Supabase Vault docs (vault.create_secret, vault.decrypted_secrets), SECURITY DEFINER pattern]

### Pattern 8: Gmail OAuth 2.0 Flow

```typescript
// lib/gmail/auth.ts
import { google } from "googleapis";

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!   // must match GCP console exactly
  );
}

// /api/auth/gmail/authorize/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coachId = searchParams.get("coach_id");   // from session

  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",    // REQUIRED for refresh token
    prompt: "consent",         // REQUIRED: forces refresh token on every consent
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
    state: coachId ?? "",      // pass coachId through OAuth state parameter
  });

  return Response.redirect(authUrl);
}

// /api/auth/gmail/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const coachId = searchParams.get("state");
  const scope = searchParams.get("scope") ?? "";

  if (!code || !coachId) return Response.redirect("/settings?error=oauth_failed");

  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // HEALTH-007: Validate granted scopes before marking connected
  const requiredScopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ];
  const grantedScopes = scope.split(" ");
  const missingScopes = requiredScopes.filter(s => !grantedScopes.includes(s));

  if (missingScopes.length > 0) {
    return Response.redirect("/settings?error=insufficient_scopes");
  }

  // Store tokens in Vault (GMAIL-003)
  const { data: vaultId } = await adminClient.rpc("store_gmail_tokens", {
    p_coach_id: coachId,
    p_tokens: tokens,   // includes refresh_token, access_token, expiry_date
  });

  // Update integrations table (vault UUID reference only — no raw tokens)
  await adminClient.from("integrations").upsert({
    coach_id: coachId,
    provider: "gmail",
    vault_secret_id: vaultId,
    status: "connected",
    scopes: grantedScopes,
  });

  return Response.redirect("/settings?connected=gmail");
}
```

[VERIFIED: googleapis Node.js docs, GMAIL-002 requirement]

### Pattern 9: Invite-Only Auth Flow

```typescript
// Disable public signup in Supabase Dashboard:
// Authentication → Settings → "Enable email signup" → OFF

// Admin creates coach accounts (ADMIN-004):
// Daniel's server-side action only — uses adminClient
export async function inviteCoach(email: string) {
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept`,
    data: {
      role: "coach",  // stored in app_metadata — immutable post-creation
    },
  });
  return { data, error };
}

// /invite/accept/page.tsx — coach sets password after clicking invite link
// Supabase provides the access_token in the URL hash (#access_token=...)
// Client component reads hash, calls supabase.auth.setSession(), shows set-password form
```

Daniel's account must have `role: 'admin'` in `app_metadata` set via the Supabase dashboard directly (cannot be set via client-side code).

[VERIFIED: Supabase auth.admin.inviteUserByEmail docs]

### Pattern 10: Inngest Serve Handler (Scaffold)

Phase 1 only needs the scaffold — no functions registered yet. Functions are added in Phase 3.

```typescript
// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

// REQUIRED: Vercel default 10s timeout breaks Inngest long-polling
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],  // Phase 3 adds functions here
});

// inngest/client.ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "client-architecture" });
```

[VERIFIED: Inngest Next.js Quick Start docs, Vercel deployment docs]

### Anti-Patterns to Avoid

- **`getSession()` in server code:** Does not verify JWT. Always `getUser()`.
- **`inngest.send()` inside Inngest functions:** Duplicate-sends on retry. Always `step.sendEvent()`.
- **Raw tokens in `integrations` table columns:** Store only Vault UUID. Never the token itself.
- **SECURITY DEFINER functions in `public` schema:** PostgREST exposes public schema. Private schema only.
- **Direct Postgres connection (port 5432) in Vercel functions:** Connection exhaustion under load. Use Supavisor port 6543.
- **`SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` prefix:** Exposes service role to browser. CI check required.
- **Async Server Components tested in Vitest:** Vitest does not support async Server Components — use Playwright for those paths.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth token management | Custom token store | Supabase Vault + googleapis `tokens` event | googleapis auto-refreshes and fires `tokens` event; Vault handles encryption |
| Rate limiting | IP-check middleware | `@upstash/ratelimit` sliding window | Edge-compatible, atomic Redis operations, battle-tested |
| Auth session management | Cookie parsing + JWT verification | `@supabase/ssr` createServerClient | Handles token rotation, cookie scoping, Next.js 15 compatibility |
| Webhook signature verification | Custom HMAC comparison | Per-provider helpers (already documented in STACK.md) | Timing-safe comparison required; replay attack prevention (timestamp check) |
| MIME email construction | Raw string building | `nodemailer` or `mailcomposer` for base64url encoding | RFC 2822 encoding edge cases with special characters |
| Type generation for DB | Manual TypeScript interfaces | `supabase gen types typescript` | Single source of truth; regenerate on schema change |
| Monorepo task orchestration | Custom Makefile/scripts | Turborepo | Caching, dependency graph, parallel execution |
| Realtime dashboard updates | Polling interval | Supabase Realtime `postgres_changes` | Push-based, RLS-respecting, no polling overhead |

---

## Common Pitfalls

### Pitfall 1: Schema Changes After Phase 3 Starts

**What goes wrong:** Adding or renaming a column after Inngest functions are deployed causes Supabase type regeneration, which breaks the function signatures that depend on `packages/database` types. Every function that touches the modified table must be redeployed.

**Why it happens:** `packages/database` types are generated from the live schema. Inngest functions import from this package. Schema drift = type drift = deployment pain.

**How to avoid:** Finalize ALL columns in Phase 1, even if a column won't be populated until Phase 3 or later. Add nullable columns freely now. Add non-nullable columns never after Phase 3.

**Warning signs:** A Phase 2 feature requires a new column that "should have been there."

### Pitfall 2: Gmail Refresh Token One-Time Delivery

**What goes wrong:** If the refresh token is not persisted immediately in the OAuth callback, it is lost forever. The coach must revoke and re-grant access.

**Why it happens:** Google only returns `refresh_token` on the first authorization OR when `prompt: 'consent'` forces re-consent. Without `access_type: 'offline'` AND `prompt: 'consent'`, subsequent authorizations return no refresh token.

**How to avoid:** In the callback route, persist to Vault BEFORE doing anything else. If Vault storage fails, throw an error and redirect with `?error=vault_failed` — do not silently continue without a refresh token.

**Warning signs:** `tokens.refresh_token` is undefined in the callback after re-authorization.

### Pitfall 3: `invalid_grant` Is Not Transient

**What goes wrong:** Treating `invalid_grant` from Gmail API as a retryable error. Inngest retries the step repeatedly, generating noise errors.

**Why it happens:** `invalid_grant` means the coach revoked access from Google account settings. The refresh token is permanently invalidated.

**How to avoid:** Catch specifically in the Gmail client factory, mark integration `status: 'disconnected'` in Supabase, halt all sequences for that coach, surface reconnect CTA. Do not retry.

**Warning signs:** Inngest function retrying with `invalid_grant` errors in the logs.

### Pitfall 4: Vercel Default Timeout Kills Inngest

**What goes wrong:** Without `export const maxDuration = 300` on the Inngest route handler, Vercel's default 10s timeout terminates Inngest's long-polling connection, causing functions to fail silently.

**Why it happens:** Inngest uses HTTP long-polling to receive work. The connection must stay alive for up to 5 minutes.

**How to avoid:** The `maxDuration = 300` export on `/api/inngest/route.ts` is non-negotiable. Add a CI check that verifies this export exists.

**Warning signs:** Inngest functions appear registered but never execute.

### Pitfall 5: Service Role Key Leaked to Client

**What goes wrong:** A developer adds `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` by accident, exposing the key to every browser.

**Why it happens:** Copy-paste error from Supabase dashboard which shows both keys side by side.

**How to avoid:** CI check that `grep -r "NEXT_PUBLIC_" .env* | grep -i "service_role"` exits non-zero. Document in `.env.example` with explicit `# NEVER add NEXT_PUBLIC_ prefix to this key`.

**Warning signs:** Network tab in browser shows requests using service role key.

### Pitfall 6: Supavisor Transaction Mode + Prepared Statements

**What goes wrong:** Certain ORMs (Prisma) use prepared statements by default. Supavisor in transaction mode (port 6543) does not support prepared statements. Queries fail.

**Why it happens:** Supabase @supabase/supabase-js uses its own query builder (not Prisma) and is compatible. This is only a risk if an ORM is added later.

**How to avoid:** This project uses `@supabase/supabase-js` directly — no ORM. Not a current risk. Note: if any SQL library is added in future phases, verify it does not use prepared statements over the pooler.

**Warning signs:** `Error: prepared statement "s0" does not exist` in Vercel function logs.

### Pitfall 7: shadcn/ui Default Style Deprecation

**What goes wrong:** Running `shadcn@latest init` without specifying `new-york` style creates components using the deprecated `default` style. UI spec uses OKLCH colors — new-york style already uses OKLCH.

**Why it happens:** shadcn changed the default style from `default` to `new-york` in a recent release but the UI spec was created with this in mind.

**How to avoid:** Run `pnpm dlx shadcn@latest init --style new-york`. Check `components.json` after init — `"style": "new-york"` must appear.

**Warning signs:** `components.json` shows `"style": "default"`.

### Pitfall 8: Tailwind v4 CSS Variable Syntax Change

**What goes wrong:** Using v3 `@theme` config with `hsl()` wrappers inside `@theme` block causes color mismatches with shadcn components.

**Why it happens:** Tailwind v4 changed the convention: `hsl()` wrappers belong in `:root` CSS variables, not inside `@theme`. The UI spec uses OKLCH colors — these must be defined in `:root`, referenced in `@theme inline`.

**How to avoid:**
```css
/* Correct v4 pattern */
:root {
  --background: oklch(97% 0.008 60);
  --accent: oklch(62% 0.14 50);
}

@theme inline {
  --color-background: var(--background);
  --color-accent: var(--accent);
}
```

**Warning signs:** Colors render as black or transparent; shadcn component colors don't match design spec.

### Pitfall 9: Instagram Basic Display API — Deprecated

**What goes wrong:** Attempting to scaffold Instagram integration using the Basic Display API, which was permanently shut down December 4, 2024.

**Why it happens:** INFRA-010 says "Instagram API scaffolded early for Meta review" — prior to the EOL, this would have used Basic Display API.

**How to avoid:** INFRA-010 scaffolding must use Instagram Graph API (Messenger Platform) — requires coaches to have Business or Creator accounts linked to Facebook Pages. Scaffolding in Phase 1 means: create the Meta app, request `instagram_manage_messages` permission, begin the Meta app review process. No code implementation in Phase 1 — just app registration and review initiation.

**Warning signs:** Any code referencing `basic-display-api` or `user_token` OAuth flows for personal Instagram accounts.

### Pitfall 10: Supabase Realtime Table Not in Publication

**What goes wrong:** Supabase Realtime subscription subscribes to a table but receives no events.

**Why it happens:** Tables must be explicitly added to the `supabase_realtime` publication. This is a one-time migration step, not automatic.

**How to avoid:** Add `ALTER PUBLICATION supabase_realtime ADD TABLE ...` to the initial migration for every table the dashboard subscribes to (drafts, leads, lead_events, integrations).

**Warning signs:** `useEffect` subscription callback never fires despite DB changes.

---

## Runtime State Inventory

This is a greenfield project — no existing runtime state. Phase 1 creates all state for the first time.

**Nothing found in any category — verified by project being pre-development (STATE.md: "Stage: Pre-development — planning complete, execution not started").**

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | Yes | v22.18.0 | — |
| npm | Package install | Yes | 10.9.3 | — |
| pnpm | Workspace management | No | — | Install: `npm install -g pnpm` |
| turbo CLI | Monorepo build | No | — | Install: `npm install -g turbo` or use npx |
| Supabase CLI | Schema migrations, type gen | No | — | Install: `npm install -g supabase` |
| Docker (for Supabase local) | Local DB dev | Not checked | — | Use Supabase remote project for development |
| Git | Version control | Yes (assumed) | — | — |

**Missing dependencies with no fallback:**
- `pnpm` — required for workspace protocol (`workspace:*`). Must be installed before any other step.
- `supabase` CLI — required for `supabase gen types typescript`. Must be installed for schema work.

**Missing dependencies with fallback:**
- `turbo` CLI — can use `npx turbo` as fallback during development.

---

## Code Examples

### Gmail Token Auto-Refresh Pattern

```typescript
// Source: googleapis official docs + ARCHITECTURE.md verified pattern
export async function getGmailClientForCoach(coachId: string) {
  const { data: tokens } = await adminClient.rpc("get_gmail_tokens", {
    p_coach_id: coachId,
  });

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Auto-refresh: googleapis fires this when access token expires
  oauth2Client.on("tokens", async (newTokens) => {
    // Merge with existing (refresh_token may not be in newTokens)
    await adminClient.rpc("store_gmail_tokens", {
      p_coach_id: coachId,
      p_tokens: { ...tokens, ...newTokens },
    });
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
```

### Supabase Admin — Invite Coach

```typescript
// Source: Supabase auth.admin docs
export async function inviteCoach(email: string, name: string) {
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept`,
    data: { role: "coach", name },
  });

  if (error) throw error;

  // Create coach profile row
  await adminClient.from("coaches").insert({
    id: data.user.id,
    email,
    name,
    role: "coach",
  });

  return data;
}
```

### Zod Validator — Create Lead

```typescript
// packages/shared/src/validators/lead.ts
import { z } from "zod";

export const CreateLeadSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  source: z.enum([
    "calendly", "cal_com", "acuity", "setmore", "square",
    "ms_bookings", "tidycal", "manual", "gmail_detected",
    "instagram_detected", "referral"
  ]),
  coach_notes: z.string().max(5000).optional(),
});

export type TCreateLead = z.infer<typeof CreateLeadSchema>;
```

### CI Check — Service Role Key Exposure

```bash
# .github/workflows/security-check.yml
# Checks that NEXT_PUBLIC_ is never prefixed to service role key
grep -rn "NEXT_PUBLIC_.*SERVICE_ROLE\|NEXT_PUBLIC_.*service_role" \
  --include="*.ts" --include="*.tsx" --include="*.env*" \
  . && echo "FAIL: Service role key exposure detected" && exit 1 || echo "PASS"
```

### Supabase Realtime — Draft Queue

```typescript
// Source: ARCHITECTURE.md verified pattern, Supabase Realtime docs
"use client";
useEffect(() => {
  const supabase = createClient();
  const channel = supabase
    .channel("coach-drafts")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "drafts",
      filter: `coach_id=eq.${coachId}`,
    }, (payload) => {
      setDrafts(prev => [payload.new as TDraft, ...prev]);
    })
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "drafts",
      filter: `coach_id=eq.${coachId}`,
    }, (payload) => {
      setDrafts(prev => prev.map(d => d.id === payload.new.id ? payload.new as TDraft : d));
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [coachId]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 (helpers deprecated) | Must use SSR package — auth-helpers no longer maintained |
| Inngest v3 `serve()` | Inngest v4 `serve()` — same API | 2024 | v4 adds checkpointing; API identical for Phase 1 |
| shadcn `default` style | `new-york` style (OKLCH colors) | 2025 | Run init with `--style new-york` explicitly |
| Tailwind v3 `hsl()` in `@theme` | Tailwind v4 OKLCH in `:root`, ref in `@theme inline` | 2025 | CSS variable syntax changed |
| Instagram Basic Display API | Instagram Graph API (Messenger Platform) | Dec 4, 2024 (EOL) | Basic Display API shut down permanently — Graph API required |
| Supabase Supavisor Session Mode port 6543 | Transaction Mode only on port 6543 | Feb 28, 2025 | Session Mode removed from port 6543; transaction mode only |

**Deprecated/outdated:**
- Instagram Basic Display API: shut down permanently. Use Graph API.
- `@supabase/auth-helpers-nextjs`: deprecated. Use `@supabase/ssr`.
- shadcn `default` style: soft-deprecated in favor of `new-york`.

---

## Google OAuth App Review — Phase 1 Action Required

**This is a hard blocker for Phase 3 launch if not started in Phase 1.**

Gmail scopes in use:
- `gmail.send` — **Sensitive scope** (requires OAuth app verification, but NOT a third-party security assessment)
- `gmail.readonly` — **Sensitive scope** (same requirement)
- `gmail.modify` — **Sensitive scope** (same requirement)

None of the scopes above are Restricted scopes (which would require a costly annual security assessment of $15,000–$75,000). Sensitive scope verification is a significantly lighter process.

**Review timeline:** Brand verification: 2–3 business days. Sensitive scope verification: 3–5 business days after brand verification. Total: ~1–2 weeks. Start in Week 1 of Phase 1.

**What to prepare:**
1. OAuth consent screen branding (product name, logo, homepage URL, privacy policy URL, terms URL)
2. Video demonstration: coach clicks "Connect Gmail," authorizes, system sends an email on their behalf
3. Privacy policy page live at a real URL (must be accessible by Google reviewers)

**Testing mode constraint:** While app is in "Testing" mode, refresh tokens expire after 7 days. This means Phase 3 sequences will break weekly unless the app exits testing mode. Verification must be completed before Phase 3 deploys.

**Action in Phase 1:** Register the Google Cloud project, create OAuth credentials, configure the consent screen, add test users (Daniel's account), and submit for brand verification immediately. Sensitive scope verification can follow once brand is approved.

[VERIFIED: Google OAuth sensitive vs restricted scope classification, timeline from Nylas blog + Google docs]

---

## Instagram Graph API — Scaffolding Approach (INFRA-010)

The Instagram Basic Display API is permanently shut down (December 4, 2024). INFRA-010 scaffolding in Phase 1 must use Instagram Graph API.

**What Phase 1 scaffolding means:**
1. Create a Meta Developer App at developers.facebook.com
2. Add "Instagram" product to the app
3. Request `instagram_manage_messages` permission (required for DM monitoring)
4. Begin Meta App Review process — this can take "more than a week"
5. No code implementation in Phase 1 — only app registration and review initiation

**Key constraints for coaches:**
- Coaches must have Instagram Business or Creator accounts (not personal accounts)
- Business accounts must be linked to a Facebook Business Page
- DM access uses the Messenger Platform (24-hour messaging window model)
- Rate limit: 200 API calls/hour (down from 5,000 in old API)

**Code scaffold (Phase 1 — no implementation):**
```typescript
// apps/web/app/api/webhooks/instagram/route.ts
// SCAFFOLD ONLY — implementation Phase 2+
// Webhook verification endpoint for Meta app review
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  // Scaffold only — log and return 200 to satisfy Meta webhook ping
  return new Response("OK", { status: 200 });
}
```

[VERIFIED: Meta Instagram API documentation, Instagram Basic Display API EOL announcement]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `packages/ai-engine` browser field in package.json prevents client bundle inclusion | Pattern 2 | ai-engine code leaks to client bundle; anthropic key exposure |
| A2 | Instagram Graph API app review can be initiated without a working integration | Instagram section | Review requires working webhook — scaffold must respond to verification pings |
| A3 | Supabase free tier supports Vault (pgsodium) | Schema Pattern 7 | Need to upgrade to paid tier for Vault access |
| A4 | Daniel's `admin` role in `app_metadata` can be set from Supabase dashboard directly | Auth Pattern 9 | No admin access path exists without manual SQL update |

**Claim A3 clarification:** [VERIFIED: Supabase docs confirm Vault is available on all plans including free]. Removing A3 from uncertainty — Vault is free.

---

## Open Questions (RESOLVED)

1. **Supabase project region** — RESOLVED: `eu-central-1` (Frankfurt)
   - Create Supabase project in Frankfurt EU-CENTRAL-1 region. Cannot be changed post-creation.

2. **Google Cloud Project** — RESOLVED: Daniel's personal Gmail account
   - GCP project owned by Daniel's personal Gmail (djn203040@gmail.com). Sufficient for OAuth review at this scale.

3. **Vercel Project + Team** — RESOLVED: Personal Vercel account
   - Personal Vercel account. Upgrade to Team if/when team members are added.

4. **Inngest v3 vs v4** — RESOLVED: v4 (Inngest 4.2.6)
   - Use v4 throughout. Phase 1 has no functions; identical API surface for Phase 3.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + Playwright 1.59.1 |
| Config file | `vitest.config.ts` at `apps/web/` root |
| Quick run command | `pnpm --filter web vitest run` |
| Full suite command | `pnpm --filter web vitest run && pnpm --filter web playwright test` |

**Critical limitation:** Vitest does not support async Server Components. Server Component pages and layouts must be tested via Playwright (E2E), not Vitest (unit).

### Phase 1 Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-001 | RLS prevents cross-coach data access | Integration (Supabase test client with two coach users) | `vitest run tests/integration/rls.test.ts` | No — Wave 0 |
| INFRA-002 | Service role key not in client bundle | CI/lint check | `grep -rn "NEXT_PUBLIC_.*service_role" --include="*.ts"` | No — Wave 0 |
| INFRA-003 | SECURITY DEFINER functions in private schema, not public | SQL migration test | `vitest run tests/integration/vault.test.ts` | No — Wave 0 |
| INFRA-004 | Supavisor connection string used (port 6543) | Config check | Grep `.env.example` for port 5432 | No — Wave 0 |
| INFRA-005 | Zod validation on all API boundaries | Unit | `vitest run tests/unit/validators.test.ts` | No — Wave 0 |
| INFRA-006 | TypeScript strict mode, no `any` | CI/type-check | `pnpm --filter web type-check` | No — Wave 0 |
| INFRA-007 | Turborepo monorepo structure correct | Build test | `turbo build` exits 0 | No — Wave 0 |
| INFRA-008 | ai-engine not in client bundle | Build analysis | `pnpm --filter web build && grep -r "@client/ai-engine" .next/static/` | No — Wave 0 |
| INFRA-009 | Rate limiting returns 429 on excess requests | Integration | `vitest run tests/integration/ratelimit.test.ts` | No — Wave 0 |
| INFRA-010 | Instagram webhook verification responds correctly | Unit | `vitest run tests/unit/instagram-webhook.test.ts` | No — Wave 0 |
| LEAD-001 | Coach can create a lead | E2E | `playwright test tests/e2e/lead-create.spec.ts` | No — Wave 0 |
| LEAD-002 | Lead profile renders all fields | E2E | `playwright test tests/e2e/lead-profile.spec.ts` | No — Wave 0 |
| LEAD-003 | Activity timeline shows typed events | E2E | `playwright test tests/e2e/lead-timeline.spec.ts` | No — Wave 0 |
| LEAD-004 | Coach notes auto-save on blur | E2E | `playwright test tests/e2e/lead-notes.spec.ts` | No — Wave 0 |
| LEAD-005 | Lead list search + filter works | E2E | `playwright test tests/e2e/lead-list.spec.ts` | No — Wave 0 |
| STATE-001 | Lead state machine enum values match DB | Unit | `vitest run tests/unit/state-machine.test.ts` | No — Wave 0 |
| STATE-007 | do_not_contact flag persists and blocks sends | Integration | `vitest run tests/integration/do-not-contact.test.ts` | No — Wave 0 |
| STATE-009 | State transitions logged to activity timeline | Integration | `vitest run tests/integration/state-transitions.test.ts` | No — Wave 0 |
| GMAIL-001 | Gmail OAuth flow completes and marks integration connected | E2E (mock OAuth) | `playwright test tests/e2e/gmail-connect.spec.ts` | No — Wave 0 |
| GMAIL-002 | OAuth callback stores refresh token to Vault | Integration | `vitest run tests/integration/gmail-oauth.test.ts` | No — Wave 0 |
| GMAIL-003 | integrations table has no raw tokens | Integration | `vitest run tests/integration/vault-storage.test.ts` | No — Wave 0 |
| HEALTH-001 | Integration health card shows connected status | E2E | `playwright test tests/e2e/health-card.spec.ts` | No — Wave 0 |
| HEALTH-004 | invalid_grant marks integration disconnected | Unit | `vitest run tests/unit/invalid-grant.test.ts` | No — Wave 0 |
| HEALTH-007 | Under-scoped token blocks connection | Unit | `vitest run tests/unit/scope-validation.test.ts` | No — Wave 0 |
| ADMIN-001 | /admin redirects non-admin users | E2E | `playwright test tests/e2e/admin-access.spec.ts` | No — Wave 0 |
| ADMIN-004 | Daniel can invite coach via admin dashboard | E2E | `playwright test tests/e2e/invite-coach.spec.ts` | No — Wave 0 |
| COMPLY-009 | No sensitive data in console.log | CI/lint check | ESLint `no-console` rule with custom patterns | No — Wave 0 |
| DRAFT-012 | Realtime subscription fires on draft INSERT | Integration | `vitest run tests/integration/realtime-drafts.test.ts` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter web vitest run --testPathPattern="unit/"` (unit tests only, < 10s)
- **Per wave merge:** `pnpm --filter web vitest run` (all unit + integration)
- **Phase gate:** Full suite (`vitest run && playwright test`) green before `/gsd-verify-work`

### Wave 0 Gaps
Every test file listed above requires creation. Priority order for Wave 0:

- [ ] `tests/integration/rls.test.ts` — covers INFRA-001 (highest security priority)
- [ ] `tests/unit/validators.test.ts` — covers INFRA-005 (Zod schemas)
- [ ] `tests/unit/state-machine.test.ts` — covers STATE-001
- [ ] `tests/unit/scope-validation.test.ts` — covers HEALTH-007
- [ ] `tests/unit/invalid-grant.test.ts` — covers HEALTH-004
- [ ] `vitest.config.ts` — configure happy-dom, next/headers mock
- [ ] `playwright.config.ts` — configure base URL, auth state reuse
- [ ] Framework install: `pnpm add -D vitest @vitejs/plugin-react happy-dom` (if not already in workspace)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth invite-only; getUser() not getSession() |
| V3 Session Management | Yes | @supabase/ssr cookie-based sessions; middleware token refresh |
| V4 Access Control | Yes | RLS on every table; FORCE ROW LEVEL SECURITY; admin service role server-side only |
| V5 Input Validation | Yes | zod on every API route boundary; CreateLeadSchema, etc. |
| V6 Cryptography | Yes | Supabase Vault (pgsodium AES-256-GCM) for OAuth tokens; never hand-roll |
| V7 Error Handling | Yes | No sensitive data in console.log (COMPLY-009); error boundaries hide stack traces |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data access (coach A reads coach B's leads) | Information Disclosure | RLS FORCE ROW LEVEL SECURITY; `coach_id = auth.uid()` on all policies |
| Service role key exposure to client | Elevation of Privilege | NEXT_PUBLIC_ prefix ban; CI grep check (INFRA-002) |
| OAuth token theft from database | Information Disclosure | Vault storage only; integrations table has only UUID reference (GMAIL-003) |
| Webhook replay attacks | Spoofing, Repudiation | Timestamp validation in HMAC check; Upstash idempotency key (COMPLY-010) |
| Under-scoped Gmail token failing silently | Tampering | Scope validation immediately after token exchange (HEALTH-007) |
| SECURITY DEFINER functions exposed via PostgREST | Elevation of Privilege | Private schema only (not public); REVOKE ALL from PUBLIC (INFRA-003) |
| Admin route accessed by coach | Elevation of Privilege | Middleware check + component-level forbidden() defense-in-depth (ADMIN-001) |

---

## Project Constraints (from CLAUDE.md)

### Required Tools and Stack
- Gmail API sends AS coach (not from a central sending address)
- Inngest (not n8n) for workflow engine
- Supabase (Postgres + Auth + RLS + Vault) — coach_id-scoped everywhere
- Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui, Framer Motion
- Vercel for hosting
- Upstash Redis for rate limiting
- Anthropic claude-sonnet-4-6 server-side only — never in client code

### Security Non-Negotiables
- RLS on EVERY Supabase table, always scoped to `coach_id`
- Service role key server-side only — never in client code
- OAuth tokens in Supabase Vault — not plain database columns
- Zod validation on every API boundary
- Webhook signature verification on every incoming webhook
- No sensitive data in `console.log` anywhere

### TypeScript
- Strict mode. Always. No `any`. Fix the type, don't skip it.
- Shared types live in `packages/shared/`

### Code Quality
- Components under 200 lines — extract if longer
- Server components by default, client only when needed
- Error boundaries on every major section
- Loading states on every async operation
- Empty states on every list/table

### Design (from UI spec)
- Glass/frosted cards (`backdrop-blur-md`, `bg-white/10`)
- Warm uplifting colors — OKLCH palette as specified in UI spec
- Dark/light toggle — both modes supported
- `--bg-image` CSS custom property on `:root`
- Run `/impeccable audit` before any component is considered done

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEAD-001 | Coach manually adds lead | CreateLeadSchema Zod validator, AddLeadModal pattern, POST /api/leads route |
| LEAD-002 | Lead profile: contact, source, state, sequence status, timeline | LeadProfilePage server component pattern, 60/40 layout from UI spec |
| LEAD-003 | Activity timeline with typed events and distinct icons | lead_event_type enum (11 types), Phosphor icon map from UI spec |
| LEAD-004 | Coach notes on lead — injected into AI context | coach_notes column on leads table, CoachNotesField auto-save pattern |
| LEAD-005 | Lead list: search, filter, status tabs | LeadListTable component, leads_coach_id_status index |
| LEAD-006 | Manual sequence trigger from lead profile | SequenceStatusPanel scaffold, UI scaffold only in Phase 1 |
| LEAD-008 | Lead source tracked | lead_source enum (11 values) in schema |
| LEAD-009 | Coach can manually override lead state | Manual state override in LeadProfileHeader, PATCH /api/leads/[id] |
| STATE-001 | Lead state machine with all terminal states | lead_status enum (11 states) in schema |
| STATE-007 | do_not_contact flag | do_not_contact BOOLEAN column on leads table |
| STATE-009 | State transitions logged to activity timeline | lead_events INSERT on every state change |
| AI-012 | Draft editing inline before approving | InlineDraftEditor scaffold, draft_edits table |
| VOICE-006 | draft_edits table scaffolded | draft_edits table in schema (records coach edits) |
| DRAFT-003 | Coach can approve, edit, regenerate, hold | DraftCard with 3 action buttons (scaffold) |
| DRAFT-004 | Inline draft editing — not in modal | InlineDraftEditor — textarea replaces draft text |
| DRAFT-005 | Keyboard shortcuts A/S/H in approval queue | Keyboard event listeners in DraftCard (scaffold) |
| DRAFT-006 | Approve + Next flow | Framer Motion slide-out/slide-in pattern |
| DRAFT-012 | Supabase Realtime on drafts filtered by coach_id | Realtime publication setup + useEffect subscription |
| DRAFT-013 | Draft full text never truncated | DraftCard: `body` column fully rendered, no truncation |
| DRAFT-014 | Draft shows lead name, touchpoint, send time, confidence | drafts table columns: touchpoint_index, scheduled_send_at, confidence_level |
| COMPLY-009 | No sensitive data in console.log | ESLint no-console rule + CI check |
| COMPLY-010 | Webhook signature verification on every webhook | verifySignature helper + Upstash idempotency in webhook scaffold |
| HEALTH-001 | Integration health card — small when healthy | IntegrationHealthCard component: healthy/broken state |
| HEALTH-002 | Health card lights red on failure | IntegrationHealthCard broken state with reconnect button |
| HEALTH-003 | One-click reconnect from health card | Reconnect triggers /api/auth/gmail/authorize redirect |
| HEALTH-004 | invalid_grant → integration disconnected, sequences halted | invalid_grant error handler in Gmail client factory |
| HEALTH-007 | OAuth scopes validated post-consent | Scope validation in /api/auth/gmail/callback before marking connected |
| HEALTH-008 | Google OAuth app review initiated in Phase 1 | Non-code deliverable: OAuth consent screen + review submission |
| GMAIL-001 | Coach connects Gmail via OAuth 2.0 | Full OAuth flow: authorize + callback routes |
| GMAIL-002 | access_type: offline + prompt: consent — refresh token persisted immediately | generateAuthUrl config + immediate Vault storage in callback |
| GMAIL-003 | OAuth tokens in Supabase Vault — integrations table stores only UUID | store_gmail_tokens SECURITY DEFINER function + vault_secret_id column |
| ADMIN-001 | /admin route — Daniel-only, middleware + component protection | middleware.ts admin guard + admin/layout.tsx forbidden() |
| ADMIN-002 | Admin sees all coaches, integration health, sequence activity | CoachRosterTable + SystemHealthPanel |
| ADMIN-003 | Admin can view any coach's lead list (read-only) | CoachDetailDrawer with LeadListTable scoped to coach |
| ADMIN-004 | Admin creates coach accounts via invite | inviteCoach() using adminClient.auth.admin.inviteUserByEmail |
| ADMIN-005 | Admin queries use service role server-side | adminClient in admin API routes only |
| ADMIN-006 | System health view: Inngest queue, Gmail watch status, cron health | SystemHealthPanel scaffold (stub data in Phase 1) |
| INFRA-001 | RLS on every table scoped to coach_id | All tables: ENABLE ROW LEVEL SECURITY + FORCE + coach_id policy |
| INFRA-002 | Service role key never NEXT_PUBLIC_ | CI grep check + .env.example documentation |
| INFRA-003 | SECURITY DEFINER functions in private schema | private.store_gmail_tokens, private.get_gmail_tokens |
| INFRA-004 | Supavisor connection string port 6543 | .env.example: DATABASE_URL uses port 6543 |
| INFRA-005 | Zod validation on every API boundary | CreateLeadSchema + all route validators |
| INFRA-006 | TypeScript strict, no any, shared types in packages/shared | tsconfig.json strict: true; shared types package |
| INFRA-007 | Turborepo monorepo structure | turbo.json + pnpm-workspace.yaml + 4 packages |
| INFRA-008 | ai-engine server-side only | Runtime guard + browser field + CI check |
| INFRA-009 | Upstash Redis rate limiting on public-facing routes | @upstash/ratelimit on webhook + lead CRUD routes |
| INFRA-010 | Instagram API scaffolded for Meta review | Webhook verification scaffold + Meta app registration |
</phase_requirements>

---

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view [package] version`) — all package versions verified 2026-05-05
- Prior session research (ARCHITECTURE.md, STACK.md, SUMMARY.md) — verified against Context7 Supabase, Inngest, googleapis docs in previous research session
- Supabase official docs — `vault.create_secret`, `vault.decrypted_secrets`, RLS FORCE ROW LEVEL SECURITY, auth.admin.inviteUserByEmail, `@supabase/ssr` createServerClient pattern, getUser() vs getSession()
- Inngest official docs — `serve()` pattern, `maxDuration = 300`, v4 checkpointing context
- googleapis official docs — OAuth2 `access_type: offline`, `prompt: consent`, `tokens` event

### Secondary (MEDIUM confidence)
- [Tailwind v4 shadcn docs](https://ui.shadcn.com/docs/tailwind-v4) — CSS variable syntax changes, OKLCH migration, new-york style
- [Google OAuth restricted scope docs](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) — sensitive vs restricted scope classification, security assessment requirements
- [Gmail API scopes reference](https://developers.google.com/workspace/gmail/api/auth/scopes) — gmail.send as sensitive (not restricted)
- [Supabase Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI) — transaction mode port 6543, Feb 28 2025 session mode deprecation
- Nylas blog — Google OAuth verification timeline estimates (3–5 days sensitive, 2–8 weeks restricted)

### Tertiary (LOW confidence — noted with [ASSUMED] tags)
- Instagram Graph API scaffolding approach for Meta review — inferred from Meta EOL announcement and Graph API docs; exact review flow not verified end-to-end

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry on research date
- Schema design: HIGH — all columns derived from requirements + prior verified architecture research; schema completeness is the highest-risk assumption
- Gmail OAuth patterns: HIGH — verified against googleapis official docs
- Inngest scaffold: HIGH — verified; v4 serve() identical to v3
- shadcn + Tailwind v4 combination: HIGH — official shadcn docs confirm v4 support; CSS variable syntax change verified
- Instagram scaffolding: MEDIUM — Basic Display API EOL confirmed; Graph API approach inferred
- Google OAuth review timeline: MEDIUM — timeline estimates from secondary sources

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (30 days) — package versions should be re-verified before execution; Google OAuth review process details change slowly
