# Phase 5: Polish — Research

**Researched:** 2026-05-20
**Domain:** Next.js 15 App Router launch polish — editorial sell pages, onboarding flow, Settings consolidation, Playwright E2E hardening
**Confidence:** HIGH

## Summary

Phase 5 takes The Client Architecture from "working" to "launch-ready." All twenty-three decisions are locked in CONTEXT.md (D-01 → D-23); this research fills the technical gaps the planner needs to schedule and the engineer needs to implement. Five workstreams are in scope:

1. **Locked module sell screens** — editorial-premium long-form pages at `/modules/threshold` and `/modules/continuation`, each with Cal.com inline embed, serif display typography (Fraunces) via `next/font`, and Framer Motion reveal-on-scroll. Sidebar tile `href`s flip from external Cal link to internal Next `Link`.
2. **Onboarding wizard** — new `(onboarding)` route group, 4 required steps, demo lead seeded with `external_ids.demo = true` and intercepted Approve, redirect-then-banner resume backed by `coaches.onboarding_progress JSONB`.
3. **Settings page consolidation** — six in-page sections at a single `/settings`, existing `/settings/autonomous|notifications|voice` route components lifted into sections + 301 redirects in `next.config.ts`, new Profile + Danger zone, autosave-on-blur with toast.
4. **Playwright E2E launch suite** — 8 specs run against hermetic local Supabase (`supabase start`) with per-test fixtures in `apps/web/tests/fixtures/`; CI via `supabase/setup-cli@v2`.
5. **Impeccable polish sweep** — every component under `apps/web/components/` audited; YELLOW findings either fixed or deferred-with-reason.

Schema work is one new migration (`supabase/migrations/20260520000001_phase5.sql`) — none of the columns this phase adds already exist in the live `coaches` table (verified by reading `20260505000002_tables.sql`).

**Primary recommendation:** Sequence Phase 5 as **Wave 0 → Wave 1 (schema BLOCKING + fonts foundation) → Wave 2 (parallel surface work) → Wave 3 (E2E hardening) → Wave 4 (impeccable sweep)**, with the migration push to live Supabase gating everything else. Use `@calcom/embed-react` (verified v1.5.3, published 2026-05-06) for the Cal.com embed, **not** raw `next/script` — the React package is the canonical pattern and ships with `getCalApi` for theme/namespace control. Avatar resizing: use **`sharp` server-side** (avoid Supabase Storage transforms — Pro tier only, verified).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Module sell-screen rendering | Frontend Server (RSC) | Browser (Cal.com iframe + Framer Motion reveals) | Static layout SSR'd; Cal.com embed is third-party JS injected client-side; reveals require `whileInView` |
| Cal.com inline embed | Browser (third-party iframe) | — | All booking flow runs inside Cal.com's iframe; we only mount it. Lazy-load to keep TTI fast. |
| Onboarding wizard shell | Frontend Server (route group) | Browser (step interactions) | `(onboarding)` layout RSC; each step page mounts client islands for forms / OAuth-return handling |
| Onboarding progress persistence | API / Backend | Database (Postgres JSONB) | Step completions write to `coaches.onboarding_progress`; server-side reads gate dashboard redirect |
| Demo lead seeding | API / Backend | Database | One-time SQL insert at wizard step entry, idempotent via `external_ids.demo = true` lookup |
| Demo Approve interception | API / Backend | Frontend Server | Approve button posts to a wizard-only route that flips status without calling Gmail send |
| Settings page sections | Frontend Server (six RSCs) | Browser (client islands per interactive section) | Data fetching per section is server-side; interactivity (toggles, file upload, autosave) is client |
| Settings autosave | Browser (debounced fetch) | API / Backend (zod-validated PATCH) | Debounce on blur in client, validated server-side, audit only for danger-zone |
| Avatar upload | API / Backend (Route Handler) | Database / Storage (Supabase bucket) | Client uploads to API route → `sharp` resize → Supabase Storage put with service role → URL on `coaches.avatar_url` |
| Audit log writes | API / Backend (explicit) | Database | Danger-zone routes write rows directly; no Postgres trigger (per D-15 + Claude's Discretion recommendation) |
| Playwright E2E suite | Browser (driven by Playwright) | API / Database (fixtures via service role) | Tests drive UI but seed via service-role SQL in fixtures; hermetic local Supabase |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@calcom/embed-react` | 1.5.3 | Cal.com inline embed | `[VERIFIED: npm view, published 2026-05-06]` Canonical React wrapper from Cal.com; ships `getCalApi` for theme/namespace; works in App Router with `'use client'`. |
| `next/font/google` (Fraunces) | bundled with Next 16.2.4 | Display serif on sell pages | `[CITED: nextjs.org/docs/app/api-reference/components/font]` Variable-font support, build-time download, zero layout shift via `adjustFontFallback` (default `true`). |
| `framer-motion` | 12.38.0 (already installed) | Reveal-on-scroll only | `[VERIFIED: apps/web/package.json]` `whileInView` + `viewport={{ once: true }}` is the documented one-shot reveal pattern. |
| `sharp` | 0.34.5 latest | Server-side avatar resize | `[VERIFIED: npm view sharp version]` Standard Node image library; runs in Vercel functions; **must add to `apps/web/package.json`**. |
| `supabase` CLI (local) | latest via `supabase/setup-cli@v2` | Hermetic test database | `[CITED: github.com/supabase/setup-cli]` Official action; runs migrations on fresh DB; binds 54321/54322/54323. |
| `@playwright/test` | 1.59.1 (already installed) | E2E suite | `[VERIFIED: apps/web/package.json]` `test.extend` fixtures pattern is the documented isolation primitive. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | 1.7.1 (already installed) | Autosave + danger-zone toasts | Already used in app; surface "Saved" toast on each autosave success. |
| `radix-ui` | already installed | Avatar, Tabs, AlertDialog (danger zone confirm) | Reuse — do not introduce a new dialog lib. |
| `next/navigation` `redirect()` | built-in | Dashboard onboarding gate + settings sub-route → anchor redirects in `next.config.ts` | Server-side redirect for onboarding gate; static `redirects()` in `next.config.ts` for legacy paths. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@calcom/embed-react` | Raw `<script>` via `next/script` with `data-cal-link` attribute | The script-tag pattern works but is fragile in App Router (script execution order vs hydration). React package is supported and has typed `getCalApi`. **Use the React package.** |
| `sharp` server-side resize | Supabase Storage image transforms | `[CITED: supabase.com/docs/guides/storage/serving/image-transformations]` "Image Resizing is currently enabled for Pro Plan and above." This project is launch-stage with minimal coach count — paying for Pro just for resize is premature. **Use sharp.** |
| Fraunces serif | Cormorant Garamond, Domine | All three load via `next/font/google`. Fraunces is the only variable font of the three (single file, all weights). **Recommend Fraunces.** Final pick is planner's discretion (D-discretion item). |
| Postgres trigger on `coaches.*` for audit | Explicit API-route writes for danger-zone only | CONTEXT.md D-15 + Claude's Discretion already lean explicit-write. **Confirmed: explicit writes** — broader auditing is its own future phase (in Deferred Ideas). |

**Installation (additions only — most already in `apps/web/package.json`):**

```bash
pnpm --filter web add @calcom/embed-react sharp
```

**Version verification (run before locking the migration):**
```bash
npm view @calcom/embed-react version   # was 1.5.3 on 2026-05-20
npm view sharp version                  # was 0.34.5 on 2026-05-20
```

## Architecture Patterns

### System Architecture Diagram

```
┌───────────── Browser ─────────────┐
│                                    │
│  /modules/threshold (RSC + reveals)│──┐
│  /modules/continuation (RSC)       │  │ Cal.com iframe (lazy)
│  /onboarding/[step] (client island)│  │
│  /settings (RSC + client islands)  │  ▼
│  Avatar <input type=file>          │  cal.com
│                                    │
└────────┬───────────────────────────┘
         │ fetch / form action
         ▼
┌───── apps/web (Next.js 15 App Router) ─────┐
│                                              │
│  Dashboard layout (RSC):                     │
│    ├─ auth check                             │
│    ├─ coach lookup                           │
│    └─ if onboarding_completed_at IS NULL     │
│       → redirect('/onboarding/<next-step>')  │
│                                              │
│  (onboarding) route group:                   │
│    layout (minimal shell)                    │
│    onboarding/[step]/page (4 steps)          │
│    ├─ Step 1: Gmail OAuth (reuse Phase 1)    │
│    ├─ Step 2: Voice model (reuse Phase 2 UI) │
│    ├─ Step 3: Demo lead walkthrough          │
│    │  └─ POST /api/onboarding/demo-approve   │
│    │     (intercepts: NO Gmail send)         │
│    └─ Step 4: Notification channel pick      │
│                                              │
│  /api/settings/profile/avatar:               │
│    1. multipart parse                        │
│    2. sharp.resize(512, 512).webp()          │
│    3. supabase.storage upload (service role) │
│    4. update coaches.avatar_url              │
│                                              │
│  /api/settings/danger/disconnect-gmail:      │
│    1. verify confirm phrase                  │
│    2. clear Vault secret                     │
│    3. integrations.status = 'disconnected'   │
│    4. INSERT INTO audit_log (...)            │
│                                              │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌───── Supabase (Postgres + Auth + Storage + Vault) ─────┐
│                                                          │
│  coaches (+ Phase 5 columns: onboarding_progress,        │
│   onboarding_completed_at, avatar_url, role_title,       │
│   timezone, working_hours, email_signature,              │
│   public_booking_url)                                    │
│                                                          │
│  audit_log (NEW)                                         │
│   RLS: SELECT where coach_id = auth.uid()                │
│        INSERT service role only                          │
│                                                          │
│  storage.objects                                         │
│   bucket: coach-avatars                                  │
│   RLS: (storage.foldername(name))[1] = auth.uid()::text  │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌───── Playwright E2E (local) ─────┐
│                                    │
│  supabase start (54321/54322)     │
│  next dev (3000)                   │
│  tests/e2e/*.spec.ts               │
│    └─ tests/fixtures/createCoach   │
│       (service role inserts)       │
│                                    │
└────────────────────────────────────┘
```

### Recommended Project Structure (NEW additions only)

```
apps/web/
├── app/
│   ├── (dashboard)/
│   │   ├── modules/
│   │   │   ├── threshold/page.tsx          # NEW (D-01)
│   │   │   └── continuation/page.tsx       # NEW (D-01)
│   │   └── settings/
│   │       ├── page.tsx                    # REWRITTEN (D-12)
│   │       ├── autonomous/page.tsx         # CONVERTED → tiny redirect file (or removed; redirect in next.config.ts)
│   │       ├── notifications/page.tsx      # same
│   │       └── voice/page.tsx              # same
│   ├── (onboarding)/                       # NEW route group (D-06)
│   │   ├── layout.tsx                      # NEW — minimal shell
│   │   └── onboarding/
│   │       └── [step]/page.tsx             # NEW — dynamic step route
│   └── api/
│       ├── onboarding/
│       │   ├── seed-demo/route.ts          # NEW — POST seeds demo lead
│       │   ├── demo-approve/route.ts       # NEW — POST intercepts approve
│       │   └── complete-step/route.ts      # NEW — PATCH writes progress
│       └── settings/
│           ├── profile/route.ts            # NEW — PATCH coach fields
│           ├── profile/avatar/route.ts     # NEW — POST upload
│           └── danger/[action]/route.ts    # NEW — disconnect/delete
├── components/
│   ├── modules/                            # NEW
│   │   ├── HeroSection.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── WhyItMatters.tsx
│   │   ├── SocialProofSection.tsx
│   │   ├── CtaSection.tsx
│   │   └── CalBookingEmbed.tsx             # wraps @calcom/embed-react
│   ├── onboarding/                         # NEW
│   │   ├── WizardShell.tsx
│   │   ├── StepIndicator.tsx
│   │   ├── StepGmail.tsx
│   │   ├── StepVoice.tsx
│   │   ├── StepFirstLead.tsx
│   │   ├── StepNotifications.tsx
│   │   └── DemoLeadDraft.tsx               # reuses DraftCard in read-only intercepted-approve mode
│   ├── dashboard/
│   │   └── OnboardingBanner.tsx            # NEW — slim sticky banner
│   └── settings/                           # mostly lifts from existing routes
│       ├── ProfileSection.tsx              # NEW (D-14)
│       ├── NotificationsSection.tsx        # lift from /settings/notifications
│       ├── AutonomousSection.tsx           # lift from /settings/autonomous
│       ├── VoiceSection.tsx                # lift from /settings/voice
│       ├── IntegrationsSection.tsx         # NEW — consolidates integration cards
│       ├── DangerZone.tsx                  # NEW (D-15)
│       └── SettingsNav.tsx                 # NEW — sticky anchor pills
├── lib/
│   ├── fonts.ts                            # NEW — Fraunces export
│   ├── onboarding/
│   │   └── demo-seed.ts                    # NEW — seeds demo lead idempotently
│   ├── settings/
│   │   └── autosave.ts                     # NEW — debounced fetch hook
│   ├── storage/
│   │   └── avatars.ts                      # NEW — sharp resize + Supabase upload helper
│   └── audit/
│       └── log.ts                          # NEW — single helper, INSERT INTO audit_log
└── tests/
    ├── fixtures/                           # NEW (D-18)
    │   ├── createCoach.ts
    │   ├── createLead.ts
    │   ├── createDraft.ts
    │   ├── cleanupCoach.ts
    │   ├── mockOauthCallback.ts
    │   └── index.ts                        # exports composed `test` fixture
    └── e2e/                                # NEW 8 specs (D-19, D-20)
        ├── duplicate-sequence-prevention.spec.ts
        ├── cross-tenant-isolation.spec.ts
        ├── pre-send-safety-check.spec.ts
        ├── webhook-signature-bypass.spec.ts
        ├── full-approval-flow.spec.ts
        ├── onboarding-completion.spec.ts
        ├── locked-module-pages.spec.ts
        └── settings-save.spec.ts

supabase/
└── migrations/
    └── 20260520000001_phase5.sql           # NEW (D-22)

.github/workflows/
└── playwright.yml                          # NEW — supabase/setup-cli@v2 + run E2E
```

### Pattern 1: Cal.com inline embed via `@calcom/embed-react`

**What:** Mount the Cal.com booking iframe inline using the official React wrapper. Use `getCalApi` to set theme + namespace.

**When to use:** Each module page's CTA section.

**Example:**
```tsx
// apps/web/components/modules/CalBookingEmbed.tsx
"use client";
import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
import { useTheme } from "next-themes"; // or whatever theme hook the app uses

export function CalBookingEmbed({
  calLink,
  namespace,
}: {
  calLink: string;          // e.g., "daniel/threshold-intro"
  namespace: string;        // e.g., "threshold" — so the two modules don't collide
}) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace });
      cal("ui", {
        theme: resolvedTheme === "dark" ? "dark" : "light",
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, [namespace, resolvedTheme]);

  return (
    <Cal
      namespace={namespace}
      calLink={calLink}
      style={{ width: "100%", height: "640px" }}
      config={{ layout: "month_view" }}
    />
  );
}
```
Source: `[VERIFIED: @calcom/embed-react v1.5.3 README + medium.com guide cross-reference + GitHub issues]`. The `'use client'` directive is required because the package uses `useEffect`.

### Pattern 2: Variable serif via `next/font/google` (Fraunces)

**What:** Load Fraunces once in a font definitions file, expose via CSS variable, target with Tailwind `font-display` utility on hero headings.

**When to use:** Module sell-page headlines only (body stays sans).

**Example:**
```ts
// apps/web/lib/fonts.ts
import { Fraunces } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz"], // optical-size axis for variable Fraunces
  // No `weight` needed — Fraunces is variable
});
```

```tsx
// apps/web/app/(dashboard)/layout.tsx (or a more scoped layout if Fraunces should not load on every dashboard route — see Risks)
import { fraunces } from "@/lib/fonts";

export default function DashboardLayout(...) {
  return <div className={fraunces.variable}>...</div>;
}
```

```css
/* global.css (Tailwind v4) */
@theme inline {
  --font-display: var(--font-display);
}
```

```tsx
// usage in HeroSection
<h1 className="font-display text-6xl leading-[1.05]">The Threshold Experience</h1>
```
Source: `[CITED: nextjs.org/docs/app/api-reference/components/font]`. Variable fonts don't need `weight`; `adjustFontFallback: true` (default) prevents CLS.

### Pattern 3: Reveal-on-scroll with Framer Motion `whileInView`

**What:** One-shot fade-up reveal as each section enters viewport. Cheap, accessible, matches editorial-premium direction.

**When to use:** Each long-form section on the module pages.

**Example:**
```tsx
"use client";
import { motion } from "framer-motion";

export function RevealOnScroll({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}
```
Source: `[CITED: motion.dev/motion/in-view]`. `once: true` ensures the IntersectionObserver disconnects after first trigger — long-page perf is fine.

### Pattern 4: Playwright fixtures with `test.extend`

**What:** Typed per-test fixtures that seed coaches/leads/drafts via service-role SQL and tear down in cascading delete.

**When to use:** All 8 Phase 5 E2E specs.

**Example:**
```ts
// apps/web/tests/fixtures/index.ts
import { test as base, expect } from "@playwright/test";
import { createCoach, type SeededCoach } from "./createCoach";
import { cleanupCoach } from "./cleanupCoach";

type Fixtures = {
  coach: SeededCoach;
  secondCoach: SeededCoach; // for cross-tenant tests
};

export const test = base.extend<Fixtures>({
  coach: async ({}, use) => {
    const coach = await createCoach();
    await use(coach);
    await cleanupCoach(coach.id);
  },
  secondCoach: async ({}, use) => {
    const coach = await createCoach({ email: `b-${Date.now()}@sonorous.test` });
    await use(coach);
    await cleanupCoach(coach.id);
  },
});

export { expect };
```
Source: `[CITED: playwright.dev/docs/test-fixtures]`. Per-test scope (default) gives full isolation; cleanup runs even if test fails.

### Pattern 5: Hermetic Supabase + Playwright CI

**What:** GitHub Action spins up local Supabase, runs migrations, exports env, then runs Playwright.

**Example:**
```yaml
# .github/workflows/playwright.yml
name: Playwright
on: [push]
jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - uses: supabase/setup-cli@v2
        with:
          version: latest
      - run: supabase start
      - name: Export Supabase env to .env.test
        run: |
          supabase status -o env \
            --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
            --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
            --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
            >> apps/web/.env.test
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web exec playwright install --with-deps chromium
      - run: pnpm --filter web test:e2e
```
Source: `[CITED: github.com/supabase/setup-cli]`. `supabase start` runs every migration file on a fresh DB — no separate "apply migrations" step needed.

### Pattern 6: Supabase Storage public-read bucket with per-coach RLS

**What:** A public-read bucket where each coach can only write into a folder named after their UUID.

**Example (in the Phase 5 migration):**
```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-avatars',
  'coach-avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Coaches can upload to their own folder
CREATE POLICY "coach_avatars_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'coach-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "coach_avatars_select_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'coach-avatars');

CREATE POLICY "coach_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'coach-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "coach_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'coach-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
```
File-naming convention: `{coach_id}/{timestamp}.webp` (server-side sharp output).
Source: `[CITED: supabase.com/docs/guides/storage/security/access-control]`. `storage.foldername(name)[1]` extracts the first path segment; matching against `auth.uid()::text` scopes per-coach.

### Pattern 7: `audit_log` table with explicit-write RLS

**Example (in the Phase 5 migration):**
```sql
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN (
    'gmail_disconnected',
    'slack_disconnected',
    'twilio_disconnected',
    'account_deleted'
  )),
  metadata    JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_coach_id_created_at_idx ON audit_log (coach_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Coaches can read their own
CREATE POLICY "audit_log_select_own" ON audit_log
  FOR SELECT TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- Service role bypass for INSERT — no INSERT policy for authenticated role on purpose.
-- (Service role bypasses RLS by default; this means only server-side code with the
-- service-role key can insert, which is exactly what we want for danger-zone routes.)

-- No UPDATE / DELETE policies — audit log is append-only.
```
Source: `[VERIFIED: existing project pattern — see `20260505000004_rls.sql` for parallel CHECK + RLS shape]`. Action enum is closed (D-21 specifics).

### Pattern 8: Settings autosave-on-blur

**Example:**
```ts
// apps/web/lib/settings/autosave.ts
"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useAutosave<T>(value: T, save: (v: T) => Promise<void>, debounceMs = 500) {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const last = useRef(value);

  useEffect(() => {
    if (last.current === value) return;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(async () => {
      try {
        await save(value);
        last.current = value;
        toast.success("Saved");
      } catch {
        toast.error("Couldn't save — try again");
      }
    }, debounceMs);
    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [value, save, debounceMs]);
}
```
Recommended debounce: **500ms** — fast enough to feel instant, slow enough to coalesce typing. (Discretion item D-discretion.)

### Pattern 9: Onboarding redirect-then-banner

**Example:**
```tsx
// apps/web/app/(dashboard)/layout.tsx — add this BEFORE returning <AppShell>
if (!coach.onboarding_completed_at) {
  const progress = (coach.onboarding_progress ?? {}) as Record<string, string | null>;
  const stepOrder = ["gmail", "voice", "first-lead", "notifications"] as const;
  const completedKeys = {
    gmail: "gmail_connected_at",
    voice: "voice_model_completed_at",
    "first-lead": "first_lead_completed_at",
    notifications: "notifications_picked_at",
  };
  const nextStep = stepOrder.find((s) => !progress[completedKeys[s]]);
  // Only redirect on first dashboard visit per session (use a cookie or check progress.banner_dismissed_until)
  const redirectedThisSession = cookies().get("onb_redirected")?.value === "1";
  if (!redirectedThisSession && nextStep) {
    cookies().set("onb_redirected", "1", { httpOnly: false });
    redirect(`/onboarding/${nextStep}`);
  }
  // After first redirect, show banner instead (rendered by AppShell when coach.onboarding_completed_at is null)
}
```
Source: `[VERIFIED: existing dashboard layout pattern at `apps/web/app/(dashboard)/layout.tsx`]`. 7-day permanent dismiss is enforced server-side by checking `created_at < now() - interval '7 days'` on the coach row.

### Anti-Patterns to Avoid

- **Rendering Cal.com via raw `<script>` tag injection.** Use `@calcom/embed-react`. The script-tag approach works but breaks across hot reload, theme toggles, and namespaces.
- **Loading Fraunces in the root layout.** Fraunces is only needed on `/modules/*` pages — loading it on every dashboard page increases TTI. Scope the font load to the module-page layout or import the `.variable` class only where needed. (See Open Question #1.)
- **Rendering the Cal.com iframe above the fold.** It's a third-party iframe — lazy-mount it via `IntersectionObserver` or place it in a section below the fold so the hero renders instantly.
- **Using Postgres triggers for audit logging.** Explicit writes are easier to reason about and only fire for the 4 danger-zone actions we actually care about. CONTEXT.md D-15 + discretion already lean this way.
- **Skipping `next/font` `adjustFontFallback`.** It's on by default — don't disable it. Without it, the swap from system fallback to Fraunces causes visible reflow.
- **Mounting `OnboardingBanner` in `(onboarding)/layout.tsx`.** The banner is dashboard-only; onboarding has its own minimal shell.
- **Letting Playwright tests share a coach row.** Every test seeds its own coach in `beforeEach` (or via the typed fixture). Cross-test state bleed will mask cross-tenant isolation bugs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cal.com booking iframe | A custom iframe wrapper that postMessages to cal.com | `@calcom/embed-react` | They handle resize observation, theme inheritance, mobile responsive sizing, and event listeners. |
| Image resize | A custom canvas-based resize in the browser | `sharp` server-side | Browser canvas resize is lossy + Safari-buggy + bypassable by clients. Resize server-side after upload. |
| Variable-font loading | Self-hosting Fraunces `.woff2` files manually | `next/font/google` | Build-time download + automatic self-hosting + CLS prevention via `adjustFontFallback`. |
| Per-test database isolation | Truncating tables in `afterEach` | Per-test fixture creates a uniquely-emailed coach + cascading delete | TRUNCATE in parallel test workers races; cascading delete on a unique coach is atomic. |
| Reveal-on-scroll | IntersectionObserver hand-rolled in a hook | `motion` `whileInView` + `viewport` | Already installed; battle-tested; respects `prefers-reduced-motion`. |
| Settings page section navigation | Custom scroll-spy with manual scroll listeners | Native CSS anchors (`#profile`) + `scroll-margin-top` for sticky header | Browser does the work. Spy class can come later. |
| Audit logging | A custom logger writing to stdout | Direct `INSERT INTO audit_log` from danger-zone routes | Coach-readable, RLS-protected, append-only — no extra infra. |
| Local Supabase orchestration | A `docker compose` for Postgres + auth + storage | `supabase start` + `supabase/setup-cli@v2` in CI | Officially maintained; runs migrations on fresh DB; identical to prod schema. |

**Key insight:** This phase is heavy on integration-glue work. Reach for ecosystem packages every time — the only place to hand-roll is the seven new business-logic API routes (onboarding step writes, demo-lead seeding, danger-zone actions, avatar upload). Everything visual or test-infra is library-standard.

## Common Pitfalls

### Pitfall 1: Cal.com embed double-mounts in React 19 Strict Mode
**What goes wrong:** `getCalApi()` initializes the cal namespace; under React 19 + Next 16 dev mode, effects run twice and the second `cal("ui", ...)` call sometimes throws or stacks themes.
**Why it happens:** The Cal API instance is global; `useEffect` running twice in dev appends rather than replaces.
**How to avoid:** Always pass a stable `namespace`. Two modules → two distinct namespaces (`"threshold"` and `"continuation"`). Never share a namespace across pages.
**Warning signs:** Theme flicker between light/dark on first paint; "double-booked" iframe DOM nodes in inspector.

### Pitfall 2: `next/font` loaded inside a client component
**What goes wrong:** Build error — `next/font/google` only works in Server Components (or modules loaded by Server Components / layouts).
**Why it happens:** Font import is part of build-time webpack work; client modules can't trigger build-time downloads.
**How to avoid:** Always import the font in `lib/fonts.ts` and consume it via the exported object in a Server Component / layout. Client components receive the font through the CSS variable (parent applied class) or `font-display` Tailwind utility.
**Warning signs:** `Module not found: next/font` build error.

### Pitfall 3: Local Supabase port conflicts
**What goes wrong:** Developer already has Postgres running on 54322 — `supabase start` fails silently or hangs.
**How to avoid:** Phase 5's `globalSetup` for Playwright runs `supabase status` and aborts with a clear error message ("local Supabase not running — run `supabase start`") if any of {54321, 54322, 54323} are missing. Also document a `supabase/config.toml` port override path in the test runbook.
**Warning signs:** Test fixtures throw "ECONNREFUSED 127.0.0.1:54321".

### Pitfall 4: Avatar upload bypasses size limit
**What goes wrong:** Coach uploads a 50MB tiff; Next.js Route Handler attempts to buffer it in memory; Vercel function OOMs.
**How to avoid:** Validate `Content-Length` header server-side **before** reading the body. Hard limit 5MB. Reject early with 413.
**Warning signs:** Function timeout in Vercel logs on avatar route.

### Pitfall 5: Demo lead leaks into the real lead list
**What goes wrong:** Demo lead is seeded with `external_ids.demo = true` but the lead list filter ignores `external_ids`. Demo lead appears next to real ones.
**How to avoid:** The default lead-list query must add `.not('external_ids->>demo', 'eq', 'true')` (or use a generated column `is_demo` for cleaner SQL). The "View your onboarding demo" link in Settings adds the opposite filter to see only the demo.
**Warning signs:** Real coach sees "Demo Lead — Alex Rivera" in their lead list after completing onboarding.

### Pitfall 6: Onboarding redirect loop
**What goes wrong:** Dashboard layout redirects to `/onboarding`, but `/onboarding/[step]` happens to render inside the dashboard layout because route group naming was wrong → infinite redirect.
**How to avoid:** Place onboarding under a sibling route group `(onboarding)/` with its own root layout. Verify by URL inspection — `/onboarding/gmail` should match `app/(onboarding)/onboarding/[step]/page.tsx`, NOT `app/(dashboard)/onboarding/`. Add a Playwright test for "first login → exactly one redirect, no loop."
**Warning signs:** Browser dev tools network tab shows multiple 307s in a row.

### Pitfall 7: Settings sub-route 301 redirects shadow the new page
**What goes wrong:** `next.config.ts` redirect from `/settings/autonomous` → `/settings#autonomous` fires before the deleted page's file is removed, but if the file still exists Next.js matches it first.
**How to avoid:** Either delete the legacy `page.tsx` files entirely OR replace them with thin server-side redirects via `redirect("/settings#autonomous")`. The `next.config.ts` redirect is a safety net for external bookmarks only — the real removal is deleting the page files.
**Warning signs:** `/settings/autonomous` still renders the old page in production.

### Pitfall 8: `auth.uid()` returns null in storage RLS at fresh login
**What goes wrong:** Coach uploads an avatar immediately after login — the storage policy uses `auth.uid()` which is null because the session hasn't been established for the storage subdomain yet.
**How to avoid:** The avatar upload goes through the Next.js API route (not direct from browser to Supabase Storage). Server-side, we use `createClient` with the user's session token (or the service role if the request was authenticated by our auth middleware). Document this explicitly: **all storage writes are server-mediated in Phase 5.**
**Warning signs:** 403 on first avatar upload after fresh signup; works after page refresh.

### Pitfall 9: Playwright cross-tenant test produces false negative
**What goes wrong:** `GET /api/leads/{coach-B-lead-id}` returns 200 with `{ data: null }`. Test passes ("not 200 with data"), but the API is actually leaking existence (a record at this UUID exists, but RLS hides it).
**How to avoid:** The test asserts **status === 404**, not "data is null." API route must explicitly translate "no row matched RLS" into a 404, not a 200 with empty body.
**Warning signs:** Test passes locally but production has a "ghost row" leak.

### Pitfall 10: Voice-model step "8 examples" check uses stale read
**What goes wrong:** Coach adds their 8th example. UI optimistic-updates and marks step complete. Server hasn't persisted yet. Coach refreshes — count is 7 — step un-completes.
**How to avoid:** "Step complete" check is **server-side** in the wizard's "Next" button handler. The button is disabled until `coaches.voice_model.examples` (or wherever count lives) has `length >= 8` per a server-side fetch. Optimistic UI is fine for the count badge but not for step gating.
**Warning signs:** Coach reports "I added 8 but it said I need 8."

## Runtime State Inventory

> N/A — Phase 5 is purely additive (new columns, new table, new bucket, new routes, new tests). No renames, refactors, or migrations of existing data. Demo lead `external_ids.demo` flag is the only new data marker introduced, and it has no prior records to migrate.

## Code Examples

(All snippets above in Architecture Patterns are verified against the cited sources. Repeated here for planner convenience are the **load-bearing ones** that should appear in plan task descriptions.)

### Cal.com embed JSX (canonical)
```tsx
// apps/web/components/modules/CalBookingEmbed.tsx
"use client";
import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
import { useTheme } from "next-themes";

export function CalBookingEmbed({ calLink, namespace }: { calLink: string; namespace: string }) {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace });
      cal("ui", {
        theme: resolvedTheme === "dark" ? "dark" : "light",
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, [namespace, resolvedTheme]);
  return (
    <Cal
      namespace={namespace}
      calLink={calLink}
      style={{ width: "100%", height: "640px" }}
      config={{ layout: "month_view" }}
    />
  );
}
```

### `next/font` setup (Fraunces)
```ts
// apps/web/lib/fonts.ts
import { Fraunces } from "next/font/google";
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz"],
});
```
```css
/* apps/web/app/globals.css */
@theme inline {
  --font-display: var(--font-display);
}
.font-display { font-family: var(--font-display), Georgia, serif; }
```

### Playwright fixture template
```ts
// apps/web/tests/fixtures/createCoach.ts
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type SeededCoach = { id: string; email: string; sessionCookie: string };

export async function createCoach(overrides: Partial<{ email: string; name: string }> = {}): Promise<SeededCoach> {
  const email = overrides.email ?? `test-${crypto.randomUUID()}@sonorous.test`;
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: "test-password-123",
  });
  if (authError) throw authError;

  const { error: rowError } = await admin
    .from("coaches")
    .insert({ id: authUser.user.id, email, name: overrides.name ?? "Test Coach" });
  if (rowError) throw rowError;

  // Sign in to get a session cookie usable by Playwright's context.addCookies
  const { data: session } = await admin.auth.signInWithPassword({ email, password: "test-password-123" });
  return {
    id: authUser.user.id,
    email,
    sessionCookie: session.session?.access_token ?? "",
  };
}
```

### Storage bucket + RLS policies (full migration block)

See Pattern 6 above — copy verbatim into `20260520000001_phase5.sql`.

### `audit_log` RLS

See Pattern 7 above — copy verbatim.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Self-hosted Google Fonts via `<link>` | `next/font/google` build-time download | Next 13 (2022) | Zero CLS, no Google network calls from browser, automatic subsetting. |
| `react-intersection-observer` for reveal | Framer Motion `whileInView` | Framer Motion 6+ | Less code, integrated with motion components. |
| Cal.com `<script>` injection | `@calcom/embed-react` | Embed v1.x | Typed API, theme inheritance, namespace isolation. |
| Manual Docker Postgres for tests | `supabase/setup-cli@v2` GitHub Action | 2024 | Reproducible across CI + dev; identical schema to prod. |
| Playwright `beforeEach` only | `test.extend` typed fixtures | Playwright 1.30+ | Type-safe seeding, automatic cleanup, composable per-suite. |
| Supabase Storage browser SDK direct upload | Server-mediated upload via Route Handler with service role | Project convention | Lets us run `sharp` resize and avoids client-side RLS races. |

**Deprecated/outdated:**
- Cal.com legacy script tag — works but not recommended in App Router.
- Supabase v1 storage client direct browser uploads with anon key — fine in principle but bypasses our `sharp` resize pipeline.

## Project Constraints (from CLAUDE.md)

- **RLS on every table, scoped to `coach_id`.** Phase 5 adds `audit_log` — RLS policy must scope to `coach_id = auth.uid()`. Storage bucket `coach-avatars` must scope writes to `(storage.foldername(name))[1] = auth.uid()::text`.
- **Service role key server-side only.** Playwright fixtures use it via `apps/web/tests/fixtures/*.ts` — these files must never be imported by client code. Verify via the existing `INFRA-002` CI check.
- **OAuth tokens in Supabase Vault — not plain columns.** Danger-zone "Disconnect Gmail" must clear the Vault secret, not just null the column.
- **Zod validation on every API boundary.** All seven new API routes (onboarding step writes, demo-seed, demo-approve, profile PATCH, avatar POST, danger-zone, settings) need Zod schemas. Define them in `packages/shared/schemas/` for reuse.
- **Webhook signature verification on every incoming webhook.** The webhook-signature-bypass E2E spec exercises this for Slack, Twilio, Gmail Pub/Sub, and all 7 calendar providers.
- **No sensitive data in `console.log`.** Audit log writes must not echo Vault secret IDs.
- **TypeScript strict, no `any`.** Cal.com embed types ship with the package; no `any` needed.
- **Shared types in `packages/shared/`.** Onboarding progress JSON shape and audit-log action enum belong here.
- **Components under 200 lines.** Module sell pages will need to compose 5–6 small section components. `WizardShell.tsx` should compose `StepIndicator + step content + footer nav` and stay under 200.
- **Server components by default.** All four onboarding step pages are RSCs that mount client islands only for the interactive forms.
- **Error boundaries on every major section.** New: module pages, onboarding shell, settings page.
- **Loading + empty states on every async operation.** Avatar upload, voice-model count check, demo-lead seed.
- **Glass/frosted cards (`backdrop-blur-md`, `bg-white/10`).** Module sell pages can break this for hero sections (editorial direction) but must respect it for any "card" element in the layout.
- **Warm uplifting colors — NOT neon green / dark purple / tech-bro.** Already-locked `oklch(60% 0.14 145)` for success and `accent` for buttons. Do not introduce new accent colors on module pages.
- **Dark/light toggle — both modes supported.** Cal.com theme must follow `resolvedTheme`. Fraunces renders the same in both; weight rendering is theme-aware (lighter weight in dark mode).
- **`/impeccable audit` before any component is considered done.** Phase 5 makes this a gating step. Results land in `.planning/phases/05-polish/impeccable/{ComponentName}.md`.
- **Module 2/3 lock CTA copy must match CLAUDE.md verbatim.**
- **Premium copy throughout — no generic placeholder visible to coaches.**

## Workstream-Specific Findings

### Workstream 1 — Locked module sell screens

- **Routes:** `apps/web/app/(dashboard)/modules/{threshold,continuation}/page.tsx`. These are inside `(dashboard)`, so they get auth-gating and the sidebar shell for free.
- **Sidebar tile update:** `SidebarNav.tsx` lines 13–26 (LOCKED array). Change href from external `cal.com/...` to internal `Link href="/modules/threshold"`. Microcopy: "Book a call" → "Learn more →" per D-05. The component currently renders `<div>` for LOCKED items (not `<a>`) — Phase 5 needs to wrap each LOCKED tile in `<Link>` while preserving the existing glass-card styling.
- **Typography:** Fraunces variable font via `lib/fonts.ts`. Apply only on module pages. Don't load globally.
- **Cal.com embed:** Two distinct namespaces (`"threshold"`, `"continuation"`). calLinks `daniel/threshold-intro` and `daniel/continuation-intro` (Daniel creates these in Cal.com). Lazy-load by placing in section 6 (CTA section), below the fold — `whileInView` IntersectionObserver naturally defers iframe mount.
- **Section primitives:** 5–6 small components in `components/modules/`: `HeroSection`, `WhatItIs`, `HowItWorks`, `WhyItMatters`, `SocialProof`, `CtaSection`, `CalBookingEmbed`. Each accepts props for the per-module copy variations.
- **Hero copy is exact:** "The Threshold Experience — your client's first 48 hours, built from your sales call." / "The Continuation — thirty days before they leave, we remind them why they stayed."
- **Secondary CTA:** `mailto:djn203040@gmail.com?subject=The Threshold Experience` (subject varies per module).

### Workstream 2 — Onboarding wizard

- **Route group:** `apps/web/app/(onboarding)/` with its own `layout.tsx` (logo + step indicator + skip-for-now dev-only link). Dynamic step route at `(onboarding)/onboarding/[step]/page.tsx`. Step param is one of `gmail | voice | first-lead | notifications`.
- **Dashboard layout gate:** Add the redirect-then-cookie pattern (Pattern 9 above) to `app/(dashboard)/layout.tsx`. The check needs to read `coach.onboarding_completed_at` and `coach.onboarding_progress`; both columns added in the Phase 5 migration.
- **OnboardingBanner:** Slim sticky banner rendered by `AppShell` (or new dashboard-scoped component) when `coach.onboarding_completed_at IS NULL` and the session cookie `onb_banner_dismissed` is not set. Banner copy is exact: `"Finish setup — {N} of 4 steps remaining"` with a "Resume" link.
- **7-day permanent dismiss:** Implemented server-side via `coach.created_at < now() - interval '7 days'` check. After 7 days, banner is hidden everywhere except the "Finish onboarding" section in Settings.
- **Step 1 (Gmail):** Reuses Phase 1 `/api/auth/gmail/authorize`. Wizard step polls `integrations` row for `provider = 'gmail' AND status = 'connected'`. On detection, writes `onboarding_progress.gmail_connected_at = now()`.
- **Step 2 (Voice):** Reuses Phase 2 `VoiceBuilderClient.tsx` (lifted from `/settings/voice/`). Wizard's "Next" button server-validates `voice_model.examples.length >= 8`. No skip button. On pass: write `voice_model_completed_at`.
- **Step 3 (Demo lead):** Server action `seed-demo` is idempotent (looks for existing demo lead by `external_ids->>demo = 'true'` AND `coach_id = ...`). On entry: seed lead, generate AI draft via Phase 2 ai-engine, render `DraftCard` in read-only mode with intercepted Approve. Approve POSTs to `/api/onboarding/demo-approve` which flips `drafts.status = 'sent'` and Gmail-drafts a celebration email (`apps/web/lib/email/template.ts` pattern) — but does **not** call `gmail.users.messages.send`. Soft-archive lead by setting `status = 'archived'`.
- **Step 4 (Notifications):** Render existing `NotificationMatrix` from `/settings/notifications/`. Validation: at least one channel beyond Dashboard checked, OR explicit `dashboard_only_acknowledged: true` written to `notification_preferences`. Toast: "Notifications set — you can change these anytime in Settings."
- **Demo lead specifics:** `name = 'Demo Lead — Alex Rivera'`, `email = 'demo+{coach_id}@sonorous.test'`, `source = 'manual'`, `status = 'call_completed'` (so it has a meaningful demo state for the draft to reference), `external_ids = '{"demo":true}'`. Pre-canned sample transcript inserted as a `transcripts` row with the same demo marker.
- **Dev-only skip:** `process.env.NODE_ENV !== 'production'` exposes a "Skip for now" link in the wizard footer that writes all four progress timestamps to `now()`. Production builds simply don't render it.

### Workstream 3 — Settings page consolidation

- **Page rewrite:** `apps/web/app/(dashboard)/settings/page.tsx` rewritten as a six-section RSC. Each section is a server component fetching its own data via `await createClient()`.
- **Sticky in-page nav:** `SettingsNav.tsx` — sticky top, anchor pills (recommended over left rail; pills are mobile-friendly and match the existing dashboard chrome). Use `scroll-margin-top` CSS to offset for the sticky AppShell header. Smooth scroll on click.
- **Section order:** Profile → Notifications → Autonomous → Voice → Integrations → Danger zone. Each gets `<section id="profile">` etc.
- **301 redirects:** Three entries in `next.config.ts` `redirects()`:
  ```ts
  async redirects() {
    return [
      { source: '/settings/autonomous',    destination: '/settings#autonomous',    permanent: true },
      { source: '/settings/notifications', destination: '/settings#notifications', permanent: true },
      { source: '/settings/voice',         destination: '/settings#voice',         permanent: true },
    ];
  }
  ```
  Then **delete** the three legacy `page.tsx` files (per Pitfall 7 — they shadow the redirect).
- **Lift, don't rewrite:** The existing `NotificationMatrix.tsx`, `AutonomousModeCard.tsx`, `VoiceBuilderClient.tsx`, etc., move from `settings/notifications/`, `settings/autonomous/`, `settings/voice/` into `components/settings/` and are mounted inline by the new sections.
- **Profile section fields:** Seven fields (D-14): display_name (defaults to `coaches.name`), avatar (upload to Supabase Storage), role_title, timezone (auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`, editable via dropdown of `Intl.supportedValuesOf('timeZone')`), working_hours (start/end pair), email_signature, public_booking_url. New columns added in the migration.
- **Avatar pipeline:** Client `<input type="file">` → POST to `/api/settings/profile/avatar` (multipart) → server validates `Content-Length` ≤ 5MB → `sharp(buffer).resize(512, 512, { fit: 'cover', position: 'center' }).webp({ quality: 85 }).toBuffer()` → upload to `coach-avatars/{coach_id}/{timestamp}.webp` via service role client → update `coaches.avatar_url` → delete previous avatar from bucket (if any). Return new public URL.
- **Autosave:** `useAutosave` hook (Pattern 8 above), 500ms debounce, sonner toast. Profile, working_hours, signature, booking_url all autosave on blur. Danger zone is the explicit exception.
- **Danger zone:** Type-to-confirm pattern. AlertDialog from radix-ui with a controlled `<Input>` that must equal the magic phrase before the confirm button enables. Four magic phrases: `disconnect gmail`, `disconnect slack`, `disconnect twilio`, and `{coach.email}` for delete account. Each action:
  1. Server validates phrase server-side (don't trust client).
  2. Performs the action.
  3. Writes to `audit_log`.
  4. For `delete account`: sends final email via Resend + alert to Daniel.
- **Working hours impact on drafts:** Phase 3's draft scheduling already uses a working-window heuristic — Phase 5 makes that window per-coach by reading `coaches.working_hours` instead of a global. Update the draft scheduler accordingly (one query change; flag in plan).
- **Public booking URL token:** Available as `{booking_url}` in voice-model template substitution. Validate as a URL (Zod `z.string().url()`).

### Workstream 4 — Playwright E2E launch suite

- **Hermetic env:** `supabase start` runs locally + in CI via `supabase/setup-cli@v2`. `.env.test` populated by `supabase status -o env` with overrides. Local Supabase keys are stable across `supabase start`/`stop` cycles **on the same machine** with the same config.toml — they're derived deterministically. Commit `.env.test` to git **only with placeholder values**; CI overwrites with real local keys.
- **Playwright config update:** Add `globalSetup: './tests/global-setup.ts'` to `playwright.config.ts`. Global setup runs `supabase status` and aborts with a clear error if local Supabase isn't up.
- **Fixtures directory:** `apps/web/tests/fixtures/` with `createCoach`, `createLead`, `createDraft`, `cleanupCoach`, `mockOauthCallback`, plus an `index.ts` exporting the composed `test`. All eight new specs import from `./fixtures` rather than `@playwright/test` directly.
- **Existing 12 specs:** Don't migrate them in Phase 5 (out of scope per Daniel's lock). They continue to use the existing pattern. New specs use the new fixtures.
- **Cross-tenant test:** Use the `secondCoach` fixture. Coach A's session authenticates the page; Coach B's `lead_id` is queried directly via `await page.request.get('/api/leads/{coachB.leadId}')`. Assert `expect(res.status()).toBe(404)`. Repeat for drafts, notification_logs, settings.
- **Pre-send safety check test:** Seed lead with `do_not_contact = true`. Seed draft on that lead. Approve via API. Assert 409 with reason field. Repeat for `lead.status` in `{'unsubscribed', 'converted', 'closed', 'do_not_contact'}` and for `lead.bounced = true`.
- **Webhook signature bypass test:** 9 sub-cases (Slack, Twilio status, Gmail Pub/Sub, Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal — that's 10; CONTEXT.md says "all seven calendar provider webhooks" so 7 + Slack + Twilio + Gmail = 10 sub-assertions). Each posts a synthetic body with an invalid signature header and asserts 401.
- **Full approval flow test:** Most complex. Seed coach + lead + draft. Coach signs in via fixture-set session cookie. Visit `/drafts`. Realtime should hydrate the draft. Click Approve. Mock Gmail send via a global request interception (`page.route('**/gmail.googleapis.com/**', route => route.fulfill({...}))`). Assert draft transitions through `pending → approved → sent`. Assert a `notification_log` row appears with `status = 'sent'`.
- **Onboarding completion test:** Drives the full wizard end-to-end with `mockOauthCallback('gmail', coachId)` to skip the real Gmail flow. Asserts `coach.onboarding_completed_at IS NOT NULL` at the end.
- **Locked module pages test:** Visits `/modules/threshold` and `/modules/continuation`. Asserts hero text matches the exact CLAUDE.md copy. Asserts no console errors. Asserts the Cal.com iframe element is present (don't load its contents — that hits the real cal.com domain and is flaky).
- **Settings save test:** For each section, mutate one field, blur, wait for toast, refresh page, assert persisted value.
- **CI runtime:** ~5 minutes total, gates merges to `main`. Add the workflow file at `.github/workflows/playwright.yml`.

### Workstream 5 — Impeccable polish sweep

- **Scope:** Every `.tsx` file under `apps/web/components/` (verified inventory: ~25 components across `shell/`, `leads/`, `drafts/`, `health/`, `admin/`, `dashboard/`, `integrations/`, `settings/`, `auth/`). Phase 5's new components (modules, onboarding, settings sections) also pass the audit before they're considered done.
- **Output:** One file per component in `.planning/phases/05-polish/impeccable/{ComponentName}.md`. Aggregate `IMPECCABLE-SUMMARY.md` lists scores and any deferred YELLOWs with reasons.
- **Re-validation:** Phase 1 noted `DraftCard.tsx` at 19/20. Re-run and confirm it still scores ≥19/20 after Phase 4 modifications.
- **Gating:** No component with unaddressed RED findings ships. YELLOWs require either a fix or an explicit deferral note in the summary.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `next-themes` (or equivalent) is the theme provider used by the existing `ThemeToggle.tsx`. | Cal.com embed pattern | Low — if the theme hook differs (e.g., custom hook), wire `resolvedTheme` from that hook instead. Confirm during plan-check by reading `components/shell/ThemeToggle.tsx`. |
| A2 | Local Supabase keys are deterministic across `supabase start`/`stop` cycles on the same machine. | Playwright env setup | Medium — if keys rotate, `.env.test` needs to be regenerated per session. Test by running `supabase status -o env` twice and diffing. |
| A3 | The existing `drafts.status` flow accepts a direct `'sent'` write from a non-Inngest path (the onboarding demo-approve route). | Onboarding step 3 | Medium — if Phase 4 added Inngest-only gating, demo-approve needs a separate `is_demo = true` bypass. Verify by reading the existing draft update path in Phase 4 plans. |
| A4 | The voice-model example count is stored at `coaches.voice_model.examples` (an array). | Onboarding step 2 gate | Low — Phase 2 schema; verify exact JSONB key. |
| A5 | `supabase start` includes the `vault` extension by default. | Local test env | Low — if not, add `[experimental] enable_vault = true` to `supabase/config.toml`. |
| A6 | `Intl.supportedValuesOf('timeZone')` is available in all browsers Phase 5 targets (modern evergreen). | Profile timezone dropdown | Low — fall back to a static IANA list import if a coach uses a stale browser. |
| A7 | Cal.com event-type slugs `daniel/threshold-intro` and `daniel/continuation-intro` will exist before launch. | Module sell pages CTA | Low — Daniel-owned external dependency; flag in plan as a launch-blocking external setup step. |

## Open Questions

1. **Should Fraunces load globally on the dashboard or only on module pages?**
   - What we know: Loading globally simplifies layout composition; only needed on `/modules/*`.
   - What's unclear: Whether the planner wants Fraunces available for any future editorial surface (e.g., admin reports).
   - Recommendation: **Scope to module pages.** Add a `<div className={fraunces.variable}>` wrapper in `(dashboard)/modules/threshold/page.tsx` and `continuation/page.tsx`. Don't pollute the root layout.

2. **Should the sticky settings nav be anchor pills or a left-rail mini-toc on wide viewports?**
   - Discretion item per CONTEXT.md. Recommendation: **Pills** — they work at all breakpoints and don't require a width-based switch. Left rail risks crowding the Profile photo above.

3. **Settings autosave debounce — 300/500/800ms?**
   - Discretion item. Recommendation: **500ms** — fast enough to feel instant, slow enough to coalesce a couple of typed characters.

4. **Cal.com embed lazy-load — IntersectionObserver vs. simply mounting in section 6 below the fold?**
   - Recommendation: **Mount in section 6.** The reveal pattern already uses IntersectionObserver via `whileInView`. Two observers for one component is overkill. If perf testing later shows the embed still impacts TTI when scrolled into view, add a `defer={true}` prop to delay iframe mount until first interaction.

5. **Whether to write a Playwright spec for the impeccable sweep itself (linting components against the audit rules) is out of scope.** Confirmed deferred.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker (for `supabase start`) | Playwright E2E hermetic env | ✓ (developer must have) | — | Document in onboarding README; no fallback |
| Supabase CLI | Local dev + CI | ✓ (CI via `supabase/setup-cli@v2`; local via `brew install supabase/tap/supabase`) | latest | None |
| Node 20 | Build + test | ✓ | — | None |
| `sharp` (Node native module) | Avatar resize | ✗ (not yet installed) | 0.34.5 latest `[VERIFIED: npm view]` | None — must install |
| `@calcom/embed-react` | Module sell pages | ✗ (not yet installed) | 1.5.3 latest `[VERIFIED: npm view, published 2026-05-06]` | None — must install |
| `next-themes` (or whatever theme provider is in use) | Cal.com theme sync | A1 — verify during plan-check | — | If not installed, use a CSS-class-based theme detection |
| Cal.com event types `daniel/threshold-intro` and `daniel/continuation-intro` | Module CTA | ✗ (Daniel must create in Cal.com before launch) | — | None — flag as launch-blocking external task |

**Missing dependencies with no fallback:**
- `sharp` — `pnpm --filter web add sharp`
- `@calcom/embed-react` — `pnpm --filter web add @calcom/embed-react`
- Cal.com event types — Daniel-owned external setup

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.59.1 (E2E) + Vitest 4.1.5 (unit/integration) |
| Config file | `apps/web/playwright.config.ts` + `apps/web/vitest.config.ts` |
| Quick run command | `pnpm --filter web test:unit` |
| Full suite command | `pnpm --filter web test` (vitest + playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MODULE-001 | `/modules/threshold` renders with exact CLAUDE.md hero copy + Cal.com embed mounts | e2e | `pnpm --filter web exec playwright test locked-module-pages.spec.ts` | ❌ Wave 0 / WS1 |
| MODULE-002 | `/modules/continuation` renders with exact CLAUDE.md hero copy + Cal.com embed mounts | e2e | (same spec, second test case) | ❌ Wave 0 / WS1 |
| MODULE-003 | Both module pages have all 5–6 sections + premium copy + no placeholder strings | e2e + manual review | (same spec) + `/impeccable audit` | ❌ Wave 0 / WS1 |
| VOICE-005 | New coach completes the wizard golden path including voice model with ≥8 examples | e2e | `pnpm --filter web exec playwright test onboarding-completion.spec.ts` | ❌ Wave 0 / WS2 |
| (Launch-critical) | Duplicate sequence rejected | e2e | `pnpm --filter web exec playwright test duplicate-sequence-prevention.spec.ts` | ❌ Wave 0 |
| (Launch-critical) | Cross-tenant isolation: 404 not 200 with null | e2e | `pnpm --filter web exec playwright test cross-tenant-isolation.spec.ts` | ❌ Wave 0 |
| (Launch-critical) | Pre-send safety check blocks terminal-state sends | e2e | `pnpm --filter web exec playwright test pre-send-safety-check.spec.ts` | ❌ Wave 0 |
| (Launch-critical) | Webhook signature bypass returns 401 across 10 endpoints | e2e | `pnpm --filter web exec playwright test webhook-signature-bypass.spec.ts` | ❌ Wave 0 |
| (Launch-critical) | Full approval flow: pending → approved → sent | e2e | `pnpm --filter web exec playwright test full-approval-flow.spec.ts` | ❌ Wave 0 |
| (Phase 5 add) | Settings autosave + danger-zone confirm | e2e | `pnpm --filter web exec playwright test settings-save.spec.ts` | ❌ Wave 0 |
| Onboarding banner copy + 7-day dismiss | unit | `pnpm --filter web exec vitest run tests/unit/onboarding/banner.test.ts` | ❌ Wave 0 |
| Demo lead seeding idempotency | integration | `pnpm --filter web exec vitest run tests/integration/onboarding/demo-seed.test.ts` | ❌ Wave 0 |
| Avatar upload size + MIME validation | integration | `pnpm --filter web exec vitest run tests/integration/settings/avatar.test.ts` | ❌ Wave 0 |
| Audit log enum + RLS | integration (SQL) | `pnpm --filter web exec vitest run tests/integration/db/audit-log.test.ts` | ❌ Wave 0 |
| Sub-route 301 redirect targets | unit | `pnpm --filter web exec vitest run tests/unit/redirects.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter web test:unit` (Vitest only — fast, ~30s)
- **Per wave merge:** `pnpm --filter web test` (Vitest + Playwright — ~5 min)
- **Phase gate:** Full suite green + every component in `apps/web/components/` passes `/impeccable audit` before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/web/tests/fixtures/createCoach.ts` — shared coach seeder via service role
- [ ] `apps/web/tests/fixtures/createLead.ts` — shared lead seeder
- [ ] `apps/web/tests/fixtures/createDraft.ts` — shared draft seeder
- [ ] `apps/web/tests/fixtures/cleanupCoach.ts` — cascading-delete cleanup
- [ ] `apps/web/tests/fixtures/mockOauthCallback.ts` — short-circuits OAuth flows
- [ ] `apps/web/tests/fixtures/index.ts` — composed `test.extend` export
- [ ] `apps/web/tests/global-setup.ts` — verifies `supabase status` running
- [ ] `apps/web/.env.test` — placeholder values (CI populates real ones)
- [ ] `.github/workflows/playwright.yml` — CI workflow
- [ ] 8 new `apps/web/tests/e2e/*.spec.ts` files (one per spec listed above)
- [ ] 5 new unit/integration test files (banner, demo-seed, avatar, audit-log, redirects)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing Supabase Auth (invite-only); no Phase 5 changes |
| V3 Session Management | yes | Existing Supabase session cookies; no Phase 5 changes |
| V4 Access Control | yes | Existing RLS on every table; Phase 5 adds `audit_log` RLS (SELECT own, no INSERT for authenticated) + storage bucket RLS (foldername-based) |
| V5 Input Validation | yes | Zod on all 7 new API routes (onboarding, profile PATCH, avatar POST, danger-zone); also URL validation on `public_booking_url`; MIME + size validation on avatar |
| V6 Cryptography | yes | Existing Vault for OAuth tokens; danger-zone disconnect must clear Vault secret (not just null the column) |
| V7 Error Handling & Logging | yes | Audit log writes for danger-zone actions; **no sensitive data in `console.log` (project rule)**; cross-tenant returns 404 not 200-with-empty (per Pitfall 9) |
| V8 Data Protection | yes | Avatar URLs are public (bucket is public-read by design); no PII in avatars; account-delete cascade verified by FK constraints |
| V9 Communications | yes | Cal.com iframe is HTTPS-only; Supabase Storage URLs are HTTPS |
| V10 Malicious Code | yes | Avatar uploads validated by MIME + processed by sharp (which strips EXIF); no executable image formats |
| V12 File Upload | yes | 5 MB hard limit; closed allowlist `{image/jpeg, image/png, image/webp}`; server-side resize via sharp; filename is server-generated UUID/timestamp (not user-controlled) |
| V13 API & Web Service | yes | Webhook signature E2E spec (D-19 #4) hardens every webhook endpoint; all 7 new API routes are Zod-validated and rate-limited via existing Upstash setup |

### Known Threat Patterns for Next.js 15 + Supabase + Cal.com embed

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Avatar upload size DoS | Denial of Service | Reject by `Content-Length` header before reading body; hard 5MB cap |
| Avatar EXIF data leak (GPS coordinates) | Information Disclosure | `sharp().webp()` strips EXIF by default — verified behavior |
| Malicious image (zip-bomb, polyglot) | Tampering / DoS | `sharp` rejects malformed images; output is re-encoded webp |
| Cross-tenant lead-id probe | Information Disclosure | RLS scoped to `coach_id`; API routes return 404 (not 200-with-null) for non-matching rows |
| Audit log tampering | Tampering | Append-only (no UPDATE/DELETE policies); RLS forbids INSERT for authenticated role (service role only) |
| Demo lead sent to real address | Spoofing / accidental external comms | Demo lead email is `demo+{coach_id}@sonorous.test` (non-deliverable domain); demo-approve route does NOT call `gmail.users.messages.send` |
| Cal.com iframe clickjacking | Tampering | Cal.com sets X-Frame-Options + frame-ancestors; we embed it, we're not embedding ourselves |
| Onboarding state forgery (skip steps via direct API call) | Tampering | Each step-complete route server-validates the underlying state (e.g., voice step checks `voice_model.examples.length ≥ 8` server-side, not just trusts the client) |
| Danger-zone confirm-string bypass | Tampering | Server validates the confirm phrase; never trusts the client. Includes the email-verbatim check for delete account. |
| 301 redirect open-redirect | Spoofing | All three new redirects in `next.config.ts` are static destinations (no user-supplied URL params); no open-redirect surface |

## Files-to-Touch Checklist

> Verified against the actual repo via `find apps/web` on 2026-05-20.

### Files to CREATE
- [ ] `supabase/migrations/20260520000001_phase5.sql` — schema additions, audit_log, storage bucket + policies
- [ ] `apps/web/lib/fonts.ts` — Fraunces variable font export
- [ ] `apps/web/lib/onboarding/demo-seed.ts` — idempotent demo lead seeder
- [ ] `apps/web/lib/settings/autosave.ts` — debounced autosave hook
- [ ] `apps/web/lib/storage/avatars.ts` — sharp + Supabase upload helper
- [ ] `apps/web/lib/audit/log.ts` — single helper for audit_log INSERTs
- [ ] `apps/web/app/(dashboard)/modules/threshold/page.tsx`
- [ ] `apps/web/app/(dashboard)/modules/continuation/page.tsx`
- [ ] `apps/web/app/(onboarding)/layout.tsx`
- [ ] `apps/web/app/(onboarding)/onboarding/[step]/page.tsx`
- [ ] `apps/web/app/api/onboarding/seed-demo/route.ts`
- [ ] `apps/web/app/api/onboarding/demo-approve/route.ts`
- [ ] `apps/web/app/api/onboarding/complete-step/route.ts`
- [ ] `apps/web/app/api/settings/profile/route.ts`
- [ ] `apps/web/app/api/settings/profile/avatar/route.ts`
- [ ] `apps/web/app/api/settings/danger/[action]/route.ts`
- [ ] `apps/web/components/modules/HeroSection.tsx`
- [ ] `apps/web/components/modules/WhatItIs.tsx`
- [ ] `apps/web/components/modules/HowItWorks.tsx`
- [ ] `apps/web/components/modules/WhyItMatters.tsx`
- [ ] `apps/web/components/modules/SocialProofSection.tsx`
- [ ] `apps/web/components/modules/CtaSection.tsx`
- [ ] `apps/web/components/modules/CalBookingEmbed.tsx`
- [ ] `apps/web/components/modules/RevealOnScroll.tsx`
- [ ] `apps/web/components/onboarding/WizardShell.tsx`
- [ ] `apps/web/components/onboarding/StepIndicator.tsx`
- [ ] `apps/web/components/onboarding/StepGmail.tsx`
- [ ] `apps/web/components/onboarding/StepVoice.tsx`
- [ ] `apps/web/components/onboarding/StepFirstLead.tsx`
- [ ] `apps/web/components/onboarding/StepNotifications.tsx`
- [ ] `apps/web/components/onboarding/DemoLeadDraft.tsx`
- [ ] `apps/web/components/dashboard/OnboardingBanner.tsx`
- [ ] `apps/web/components/settings/ProfileSection.tsx`
- [ ] `apps/web/components/settings/NotificationsSection.tsx` (lift)
- [ ] `apps/web/components/settings/AutonomousSection.tsx` (lift)
- [ ] `apps/web/components/settings/VoiceSection.tsx` (lift)
- [ ] `apps/web/components/settings/IntegrationsSection.tsx`
- [ ] `apps/web/components/settings/DangerZone.tsx`
- [ ] `apps/web/components/settings/SettingsNav.tsx`
- [ ] `apps/web/tests/fixtures/createCoach.ts`
- [ ] `apps/web/tests/fixtures/createLead.ts`
- [ ] `apps/web/tests/fixtures/createDraft.ts`
- [ ] `apps/web/tests/fixtures/cleanupCoach.ts`
- [ ] `apps/web/tests/fixtures/mockOauthCallback.ts`
- [ ] `apps/web/tests/fixtures/index.ts`
- [ ] `apps/web/tests/global-setup.ts`
- [ ] `apps/web/.env.test` (placeholder)
- [ ] `apps/web/tests/e2e/duplicate-sequence-prevention.spec.ts`
- [ ] `apps/web/tests/e2e/cross-tenant-isolation.spec.ts`
- [ ] `apps/web/tests/e2e/pre-send-safety-check.spec.ts`
- [ ] `apps/web/tests/e2e/webhook-signature-bypass.spec.ts`
- [ ] `apps/web/tests/e2e/full-approval-flow.spec.ts`
- [ ] `apps/web/tests/e2e/onboarding-completion.spec.ts`
- [ ] `apps/web/tests/e2e/locked-module-pages.spec.ts`
- [ ] `apps/web/tests/e2e/settings-save.spec.ts`
- [ ] `apps/web/tests/unit/onboarding/banner.test.ts`
- [ ] `apps/web/tests/integration/onboarding/demo-seed.test.ts`
- [ ] `apps/web/tests/integration/settings/avatar.test.ts`
- [ ] `apps/web/tests/integration/db/audit-log.test.ts`
- [ ] `apps/web/tests/unit/redirects.test.ts`
- [ ] `.github/workflows/playwright.yml`
- [ ] `.planning/phases/05-polish/impeccable/{ComponentName}.md` (one per component)
- [ ] `.planning/phases/05-polish/IMPECCABLE-SUMMARY.md`

### Files to MODIFY
- [ ] `apps/web/components/shell/SidebarNav.tsx` — flip LOCKED tile hrefs from external to internal `Link`, change microcopy to "Learn more →" (lines 13–26)
- [ ] `apps/web/app/(dashboard)/layout.tsx` — add onboarding-redirect-then-banner gate
- [ ] `apps/web/app/(dashboard)/settings/page.tsx` — rewrite as six-section consolidated page
- [ ] `apps/web/next.config.ts` — add three permanent redirects for legacy `/settings/*` sub-routes
- [ ] `apps/web/playwright.config.ts` — add `globalSetup` reference
- [ ] `apps/web/package.json` — add `@calcom/embed-react` + `sharp`
- [ ] `apps/web/app/globals.css` — add `@theme inline` block exposing `--font-display`
- [ ] `packages/shared/` — add Zod schemas for onboarding progress shape, audit-log action enum, settings PATCH payloads
- [ ] Draft scheduler (Phase 3 file — locate during plan-check) — switch from global working-window to per-coach `coaches.working_hours`

### Files to DELETE
- [ ] `apps/web/app/(dashboard)/settings/autonomous/page.tsx` (lifted to section; redirect handles legacy URL)
- [ ] `apps/web/app/(dashboard)/settings/notifications/page.tsx`
- [ ] `apps/web/app/(dashboard)/settings/voice/page.tsx`
  - Optional alternative: replace each with a one-line file that calls `redirect("/settings#<anchor>")` — but the `next.config.ts` redirect is cleaner. Pick one approach; CONTEXT.md leans toward `next.config.ts`.

## Risks / Unknowns for the Planner

1. **HEALTH-008 (Google OAuth Testing-mode exit) is still pending Daniel** per STATE.md. Phase 5 needs the real OAuth flow to ship onboarding, but the Wizard step 1 can mock it for development and the Playwright `mockOauthCallback` fixture handles tests. Confirm Daniel's OAuth review state before launch.
2. **`@calcom/embed-react` v1.5.3 was published 2026-05-06** — only 2 weeks old at research time. If a v1.5.4 ships during planning, re-verify the API surface. The CalAPI shape has been stable across v1.x.
3. **Local Supabase port conflicts on developer machines.** Document `supabase stop` + custom port override in the test runbook.
4. **Image transforms paid-tier confirmation:** verified as Pro Plan-only via supabase.com docs. If the project upgrades to Pro for other reasons later, the `sharp` pipeline can be swapped out (one file changes: `lib/storage/avatars.ts`).
5. **Cal.com event-type slugs `daniel/threshold-intro` and `daniel/continuation-intro` are launch-blocking external dependencies** owned by Daniel. The module sell pages render fine without them (iframe shows Cal.com's "event not found" — acceptable in dev), but production launch requires both to exist. Flag in the plan as a Daniel-owned task.
6. **`coach.created_at` is the 7-day-dismiss reference timestamp.** Verify this matches the desired semantic (coach signup, not first login). If the project distinguishes "invited" from "logged in," consider adding `coaches.first_login_at` — but that's deferred per CONTEXT.md.
7. **Impeccable sweep is potentially the longest workstream by clock time.** 25+ components × audit + fix = many hours of manual work. Plan for it as a dedicated wave at the end, possibly run in parallel chunks by component directory.
8. **Soft-archive lead `status = 'archived'`:** verify the lead state machine (STATE-001) allows `archived` as a state. If not, may need a different flag (e.g., `external_ids->>hidden = 'true'`).

## Sources

### Primary (HIGH confidence)
- `[CITED: nextjs.org/docs/app/api-reference/components/font]` — Next.js 15.x font reference, including variable-font support, `axes`, `variable`, `adjustFontFallback`. Version doc as of 16.2.6 (matches `next: 16.2.4` in package.json).
- `[CITED: github.com/supabase/setup-cli]` — Official GitHub Action for local Supabase in CI.
- `[CITED: supabase.com/docs/guides/storage/security/access-control]` — Storage RLS with `storage.foldername()`.
- `[CITED: supabase.com/docs/guides/storage/serving/image-transformations]` — Pro Plan requirement for transforms.
- `[CITED: playwright.dev/docs/test-fixtures]` — `test.extend` typed fixtures pattern.
- `[CITED: motion.dev/motion/in-view]` (formerly framer-motion) — `whileInView` + `viewport={{ once: true }}` pattern.
- `[VERIFIED: npm view @calcom/embed-react version]` — v1.5.3 confirmed on 2026-05-20.
- `[VERIFIED: npm view sharp version]` — v0.34.5 confirmed on 2026-05-20.
- `[VERIFIED: file read]` — apps/web/playwright.config.ts, apps/web/package.json, apps/web/components/shell/SidebarNav.tsx, supabase/migrations/20260505000002_tables.sql, apps/web/app/(dashboard)/layout.tsx, supabase/config.toml.

### Secondary (MEDIUM confidence)
- `[CITED: medium.com/@hamzabhf00/integrating-cal-com-into-your-website-using-react]` — Cal.com Next.js embed example. Cross-verified with @calcom/embed-react package.
- `[CITED: github.com/calcom/cal.com/issues/8073, /issues/15772]` — community pattern confirmations for embed-react.

### Tertiary (LOW confidence)
- None — all critical claims verified against primary sources or repo files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library version verified via `npm view` or read from `package.json`.
- Architecture: HIGH — patterns verified against official docs (next/font, Playwright fixtures, Supabase Storage, framer-motion).
- Pitfalls: HIGH — derived from documented behavior + project-specific knowledge (existing layouts, schema, ESLint rules).
- Workstream-specific findings: HIGH — every file path verified against `find apps/web` output.
- Security domain: HIGH — STRIDE table reflects actual surface introduced in Phase 5.

**Research date:** 2026-05-20
**Valid until:** 2026-06-19 (30 days — stable phase, no fast-moving deps except `@calcom/embed-react` which was just published; re-verify if v1.5.4 ships)

## RESEARCH COMPLETE
