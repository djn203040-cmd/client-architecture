---
phase: 02-intelligence
plan: 05
status: complete
---

# 02-05 Summary — Email Thread View

## What shipped

### apps/web/lib/gmail/thread.ts
- `TThreadEmail` type: `{ id, from, subject, date, snippet, body }`
- `decodeBody(data)` — `base64url` decode (Pitfall 7)
- `extractBody(payload)` — prefers `text/plain`, falls back to `text/html` for multipart messages
- `extractHeader(headers, name)` — case-insensitive lookup
- `fetchLeadThread(coachId, threadId)` — calls `getGmailClientForCoach`, maps Gmail messages to `TThreadEmail[]`, sorted ascending by `internalDate`

### apps/web/app/api/leads/[id]/thread/route.ts
- `GET` — `import 'server-only'`; 401 auth gate; 404/403 ownership check; queries `email_events` for most-recent `gmail_thread_id`; returns `{ messages: [] }` if no emails yet; 502 on Gmail error with coach-actionable message

### apps/web/app/(dashboard)/leads/[id]/components/EmailRow.tsx
- Collapsible email row; `aria-expanded`, keyboard Enter/Space expand; `CaretDown` rotates 180° on expand; `whitespace-pre-wrap` body (no XSS risk); `motion-reduce:transition-none` respects prefers-reduced-motion

### apps/web/app/(dashboard)/leads/[id]/components/EmailThreadView.tsx
- Fetches `/api/leads/{leadId}/thread` on mount; 3-row `Skeleton` loading state; `No emails yet.` empty state; most recent email `defaultOpen`; error message passthrough from API

### apps/web/app/(dashboard)/leads/[id]/page.tsx
- New `Thread | Timeline | Notes` tab bar using shadcn `Tabs`; Thread is the first/default tab; Timeline and Notes tabs retain existing `ActivityTimeline` and `CoachNotesField` unchanged

## Security
- T-02-24: 401 auth gate ✓
- T-02-25: 403 ownership check ✓
- T-02-26: `gmail_thread_id` resolved only from coach-owned lead's email_events ✓
- T-02-27: body rendered as `whitespace-pre-wrap` text node, no `dangerouslySetInnerHTML` ✓

## Verification
- `pnpm --filter web type-check` — clean (0 errors)
- `pnpm --filter web build` — `✓ Compiled successfully`, static pages generated (4096MB heap)
- All Phase 2 exit criteria now met
