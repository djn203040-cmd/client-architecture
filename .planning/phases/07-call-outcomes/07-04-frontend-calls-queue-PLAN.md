---
phase: 07-call-outcomes
plan: 04
type: execute
wave: 3
depends_on: ["07-01", "07-02", "07-03"]
autonomous: false   # Task 3 is a blocking human checkpoint (/impeccable audit + manual dashboard walkthrough)
requirements: [CALL-004, CALL-005, CALL-013]
files_modified:
  - apps/web/app/(dashboard)/calls/page.tsx
  - apps/web/components/calls/CallQueueScaffold.tsx
  - apps/web/components/calls/CallOutcomeCard.tsx
  - apps/web/components/calls/call-outcome-realtime.tsx
  - apps/web/components/calls/CallCelebrationEmptyState.tsx
  - apps/web/components/leads/LeadCallOutcomePanel.tsx
  - apps/web/components/shell/SidebarNav.tsx
  - apps/web/app/(dashboard)/leads/[id]/page.tsx
  - apps/web/components/leads/LeadEventIcon.tsx
  - apps/web/app/(dashboard)/leads/[id]/activity-timeline.tsx

must_haves:
  truths:
    - "/calls is a queue page with Awaiting / Upcoming / History tabs, SSR-loaded and updating live via realtime, in glass cards"
    - "A CallOutcomeCard shows three large outcome buttons (No show / Call completed / Converted) that PATCH /api/call-outcomes/[id]"
    - "The lead profile surfaces any awaiting call with the three outcome actions inline"
    - "A converted lead shows the quiet Module 2 (Threshold Experience) CTA on its profile"
    - "The timeline renders call_converted with its own icon + label"
    - "Sidebar has a /calls nav item"
  artifacts:
    - path: "apps/web/app/(dashboard)/calls/page.tsx"
      provides: "SSR /calls queue (Awaiting/Upcoming/History)"
      contains: "How did the call go"
    - path: "apps/web/components/calls/CallOutcomeCard.tsx"
      provides: "3-button outcome card with approve-button fill animation + glass card"
      contains: "/api/call-outcomes/"
    - path: "apps/web/components/calls/call-outcome-realtime.tsx"
      provides: "useCallOutcomeRealtime hook (cloned from draft-realtime)"
      contains: "useCallOutcomeRealtime"
    - path: "apps/web/components/leads/LeadCallOutcomePanel.tsx"
      provides: "lead-profile awaiting-call panel + converted Module 2 CTA"
      contains: "The Threshold Experience"
  key_links:
    - from: "apps/web/components/calls/CallOutcomeCard.tsx"
      to: "/api/call-outcomes/[id]"
      via: "fetch PATCH on button click"
      pattern: "/api/call-outcomes/"
    - from: "apps/web/components/shell/SidebarNav.tsx"
      to: "/calls"
      via: "ITEMS nav entry"
      pattern: "/calls"
---

<objective>
Ship the Call Outcomes front-end: the dedicated `/calls` queue page (Awaiting / Upcoming / History, SSR + realtime, glass cards), the `CallOutcomeCard` with three large outcome buttons, the sidebar nav item, the lead-profile `LeadCallOutcomePanel` (+ quiet Module 2 CTA on converted leads), and the `call_converted` timeline icon/label. Closes with a mandatory `/impeccable audit`.

Purpose: The coach's primary surface for answering "How did the call go?" — mirroring the drafts queue exactly so it feels native.
Output: `/calls` route + components, sidebar entry, lead-profile panel, timeline additions, impeccable-audited.
</objective>

<execution_context>
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/workflows/execute-plan.md
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/07-call-outcomes/07-CONTEXT.md
@.planning/phases/07-call-outcomes/07-01-SUMMARY.md
@.planning/phases/07-call-outcomes/07-03-SUMMARY.md
@CLAUDE.md

<interfaces>
From 07-01: TCallOutcome (call_outcomes Row): id, coach_id, lead_id, scheduled_at,
  ends_at, status (scheduled|awaiting_outcome|resolved|cancelled), outcome, prompted_at.
  Realtime publication already includes call_outcomes.
From 07-03: PATCH /api/call-outcomes/[id] body { outcome: "no_show"|"completed"|"converted", notes? }
  -> 200 { ok, new_status } | 409 { ok:false, reason } | 403.
From CLAUDE.md: Module 2 lock CTA copy (EXACT) —
  "The Threshold Experience — your client's first 48 hours, built from your sales call. [Book a call]"
  Design: glass/frosted (backdrop-blur-md, bg-white/10), warm uplifting (NOT neon green / dark purple / tech-bro), dark+light.

Templates to clone (mirror shape, swap payload):
  apps/web/components/drafts/draft-realtime.tsx  -> useCallOutcomeRealtime (channel coach-call-outcomes-<status>-<coachId>[-<leadId>], postgres_changes on call_outcomes filtered by coach_id, status).
  apps/web/app/(dashboard)/drafts/page.tsx + components/drafts/DraftQueueScaffold.tsx -> SSR fetch + tabs + realtime queue.
  apps/web/components/drafts/DraftCard.tsx -> CallOutcomeCard (glass card + Framer Motion).
  apps/web/components/ui/approve-button.tsx -> reuse the fill animation for the 3 outcome buttons.
  apps/web/components/drafts/CelebrationEmptyState.tsx -> CallCelebrationEmptyState + skeleton.
  apps/web/components/shell/SidebarNav.tsx -> ITEMS array: add { href: "/calls", label: "Calls", Icon: PhoneCall }.
  apps/web/app/(dashboard)/leads/[id]/page.tsx + app/(dashboard)/leads/[id]/components/LeadDraftsPanel.tsx -> where LeadCallOutcomePanel mounts.
  apps/web/components/leads/LeadEventIcon.tsx + app/(dashboard)/leads/[id]/activity-timeline.tsx -> add call_converted icon + label.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: /calls queue page + realtime hook + CallOutcomeCard + empty state + sidebar nav</name>
  <read_first>
    - apps/web/app/(dashboard)/drafts/page.tsx (SSR fetch pattern + how it passes initial rows to the scaffold)
    - apps/web/components/drafts/DraftQueueScaffold.tsx (tabs + realtime wiring template)
    - apps/web/components/drafts/draft-realtime.tsx (useDraftRealtime — exact hook to clone, incl. channel naming + postgres_changes filters)
    - apps/web/components/drafts/DraftCard.tsx (glass card + Framer Motion + button layout)
    - apps/web/components/ui/approve-button.tsx (fill animation to reuse on the 3 buttons)
    - apps/web/components/drafts/CelebrationEmptyState.tsx (empty + skeleton)
    - apps/web/components/shell/SidebarNav.tsx (ITEMS array + mobile nav — add /calls)
    - .planning/phases/07-call-outcomes/07-CONTEXT.md (D-19 + Specific Requirements — heading/button copy)
  </read_first>
  <action>
    Create apps/web/components/calls/call-outcome-realtime.tsx: `useCallOutcomeRealtime(initial, { coachId, status, leadId? })` cloned from useDraftRealtime — subscribe to postgres_changes on `call_outcomes` filtered by coach_id (and status / leadId), channel `coach-call-outcomes-${status}-${coachId}${leadId?`-${leadId}`:""}`; merge INSERT/UPDATE/DELETE into state; removeChannel on cleanup.

    Create apps/web/components/calls/CallOutcomeCard.tsx (client): glass card (backdrop-blur-md bg-white/10, Framer Motion entrance like DraftCard), header "How did the call with {leadName} go?", call time line. Three large buttons reusing the approve-button fill animation:
      - "No show" → PATCH /api/call-outcomes/{id} { outcome: "no_show" }
      - "Call completed" (primary) → { outcome: "completed" }
      - "Converted 🎉" → { outcome: "converted" }
      On click: optimistic disable, fetch PATCH, on 409 show the reason toast and refetch, on 200 let realtime drop the card. Warm-uplifting palette only (no neon green / dark purple / tech-bro). For Upcoming/History variants render read-only (no buttons; show resolved outcome label).

    Create apps/web/components/calls/CallCelebrationEmptyState.tsx (clone CelebrationEmptyState) + a skeleton loader.

    Create apps/web/components/calls/CallQueueScaffold.tsx (client): three tabs Awaiting (status='awaiting_outcome') / Upcoming (status='scheduled') / History (status='resolved'); each backed by useCallOutcomeRealtime; renders CallOutcomeCard list or CallCelebrationEmptyState.

    Create apps/web/app/(dashboard)/calls/page.tsx (server component): heading "How did the call go?"; SSR-fetch the coach's call_outcomes (RLS-scoped via server client) split by status; pass to CallQueueScaffold. Mirror drafts/page.tsx structure.

    Edit apps/web/components/shell/SidebarNav.tsx: import PhoneCall icon; add `{ href: "/calls", label: "Calls", Icon: PhoneCall }` to ITEMS (after Drafts). Mobile nav uses the same ITEMS array — no extra edit needed.
  </action>
  <acceptance_criteria>
    - `apps/web/app/(dashboard)/calls/page.tsx` contains `How did the call go`
    - `apps/web/components/calls/call-outcome-realtime.tsx` contains `useCallOutcomeRealtime` and `call_outcomes`
    - `apps/web/components/calls/CallOutcomeCard.tsx` contains `/api/call-outcomes/` and `backdrop-blur`
    - `apps/web/components/calls/CallQueueScaffold.tsx` contains `awaiting_outcome` and `scheduled` and `resolved`
    - `apps/web/components/shell/SidebarNav.tsx` contains `/calls`
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "useCallOutcomeRealtime" apps/web/components/calls/call-outcome-realtime.tsx && grep -q "/api/call-outcomes/" apps/web/components/calls/CallOutcomeCard.tsx && grep -q "/calls" apps/web/components/shell/SidebarNav.tsx && grep -q "awaiting_outcome" apps/web/components/calls/CallQueueScaffold.tsx && echo OK</automated>
  </verify>
  <done>/calls renders 3 tabs with live glass cards + 3 outcome buttons hitting the API; empty/skeleton states; sidebar nav item present.</done>
</task>

<task type="auto">
  <name>Task 2: LeadCallOutcomePanel + converted Module 2 CTA + call_converted timeline icon/label</name>
  <read_first>
    - apps/web/app/(dashboard)/leads/[id]/page.tsx (where LeadDraftsPanel mounts — mount LeadCallOutcomePanel alongside)
    - apps/web/app/(dashboard)/leads/[id]/components/LeadDraftsPanel.tsx (lead-scoped panel + realtime-by-leadId pattern to mirror)
    - apps/web/components/calls/CallOutcomeCard.tsx (reuse the card built in Task 1)
    - apps/web/components/calls/call-outcome-realtime.tsx (useCallOutcomeRealtime with leadId scope)
    - apps/web/components/leads/LeadEventIcon.tsx (icon map — add call_converted)
    - apps/web/app/(dashboard)/leads/[id]/activity-timeline.tsx (label map — add call_converted)
    - CLAUDE.md (EXACT Module 2 CTA copy)
  </read_first>
  <action>
    Create apps/web/components/leads/LeadCallOutcomePanel.tsx (client): takes leadId + leadName + leadStatus + initial awaiting rows; uses useCallOutcomeRealtime scoped by leadId + status='awaiting_outcome'; renders a CallOutcomeCard for any awaiting call (same 3 buttons → PATCH). If none awaiting, render nothing (or a subtle "No call awaiting an outcome").
    - When leadStatus === 'converted', render a quiet Module 2 CTA card (glass, NOT a hard upsell wall) with the EXACT copy from CLAUDE.md: "The Threshold Experience — your client's first 48 hours, built from your sales call." and a "Book a call" link. Reuse the lock-CTA styling from the modules sell screens if present (grep components for "Threshold").

    Edit apps/web/app/(dashboard)/leads/[id]/page.tsx: mount `<LeadCallOutcomePanel ... />` alongside the existing LeadDraftsPanel, passing leadId, lead name, lead status, and SSR-fetched awaiting rows.

    Edit apps/web/components/leads/LeadEventIcon.tsx: add a `call_converted` case → a celebratory icon (e.g. Trophy / Confetti from the existing icon set) with a warm tone (matching the existing call_booked/no_show/call_completed entries).

    Edit apps/web/app/(dashboard)/leads/[id]/activity-timeline.tsx: add a `call_converted` label (e.g. "Converted to client") to the event label map so the timeline renders it.
  </action>
  <acceptance_criteria>
    - `apps/web/components/leads/LeadCallOutcomePanel.tsx` contains `The Threshold Experience` and `useCallOutcomeRealtime`
    - `apps/web/app/(dashboard)/leads/[id]/page.tsx` contains `LeadCallOutcomePanel`
    - `apps/web/components/leads/LeadEventIcon.tsx` contains `call_converted`
    - `apps/web/app/(dashboard)/leads/[id]/activity-timeline.tsx` contains `call_converted`
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>grep -q "The Threshold Experience" apps/web/components/leads/LeadCallOutcomePanel.tsx && grep -q "LeadCallOutcomePanel" "apps/web/app/(dashboard)/leads/[id]/page.tsx" && grep -q "call_converted" apps/web/components/leads/LeadEventIcon.tsx && grep -q "call_converted" "apps/web/app/(dashboard)/leads/[id]/activity-timeline.tsx" && echo OK</automated>
  </verify>
  <done>Lead profile shows awaiting-call actions inline; converted leads show the quiet Module 2 CTA; timeline renders call_converted with icon + label.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: /impeccable audit on /calls + CallOutcomeCard + lead panel</name>
  <read_first>
    - .planning/phases/07-call-outcomes/07-CONTEXT.md (D-21 — impeccable audit mandatory before merge)
    - CLAUDE.md (design non-negotiables: glass/frosted, warm uplifting, dark+light, loading/empty states, components <200 lines)
  </read_first>
  <what-built>
    Task 1 + 2 built /calls (3 tabs, glass cards, 3 outcome buttons, realtime, empty/skeleton),
    LeadCallOutcomePanel (+ converted Module 2 CTA), and call_converted timeline rendering.
  </what-built>
  <action>
    Run `/impeccable audit` against apps/web/app/(dashboard)/calls/page.tsx,
    apps/web/components/calls/CallOutcomeCard.tsx, CallQueueScaffold.tsx,
    CallCelebrationEmptyState.tsx, and LeadCallOutcomePanel.tsx. Fix every flagged item
    (glass/frosted compliance, warm-uplifting palette — no neon green / dark purple / tech-bro,
    dark+light parity, loading + empty states present, error boundary, components <200 lines,
    a11y on the three buttons). Re-run until clean.
  </action>
  <how-to-verify>
    1. `pnpm --filter web dev`, visit http://localhost:3000/calls — confirm Awaiting/Upcoming/History tabs, glass cards, 3 buttons, empty state.
    2. Toggle dark/light — both render correctly.
    3. Open a converted lead's profile — confirm the quiet Module 2 CTA with exact copy and a converted timeline entry.
    4. Resolve a call from the card — confirm it disappears (realtime) and the lead status/timeline updates.
    5. Confirm `/impeccable audit` output is clean.
  </how-to-verify>
  <acceptance_criteria>
    - `/impeccable audit` reports no outstanding issues on the listed files
    - `pnpm --filter web typecheck` exits 0
  </acceptance_criteria>
  <resume-signal>Type "approved" once the impeccable audit is clean and the queue + converted CTA verify, or describe issues to fix.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| coach browser → Supabase realtime (call_outcomes) | RLS confines the subscription to the coach's own rows |
| CallOutcomeCard → PATCH /api/call-outcomes/[id] | All mutations go through the ownership-checked API (07-03) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-19 | Info disclosure | realtime leaking other coaches' calls | mitigate | call_outcomes RLS (coach_id=auth.uid()) + browser client; channel filtered by coach_id |
| T-07-20 | Tampering | client forging an outcome write | mitigate | No direct table writes from client; only PATCH API (Zod + 403 ownership + atomic CAS) |
| T-07-21 | Elevation | converted CTA implying upsell wall blocks the lead | accept | CTA is presentational only; lead stays live (enforced in 07-02 terminal-status guard) |
| T-07-22 | Info disclosure | lead PII in client logs | accept→mitigate | No console.log of lead PII in client components |
</threat_model>

<verification>
- `pnpm --filter web typecheck` exits 0.
- /calls renders 3 tabs with realtime glass cards; sidebar has /calls.
- Lead profile shows awaiting actions + converted Module 2 CTA; timeline renders call_converted.
- `/impeccable audit` clean on the new surfaces.
</verification>

<success_criteria>
- Coach can triage calls from a native-feeling /calls queue and the lead profile; converted leads show the quiet Module 2 CTA; timeline shows call_converted (CALL-004, CALL-005, CALL-013). Impeccable audit passes.
</success_criteria>

<output>
After completion, create `.planning/phases/07-call-outcomes/07-04-SUMMARY.md`
</output>
