# Phase 4: Approval Channels - Pattern Map

**Mapped:** 2026-05-20
**Phase directory:** `.planning/phases/04-approval-channels/`
**Files classified:** 38 new + 4 modified = 42 total
**Analogs found:** 38 / 42 (4 have no analog — see "No Analog Found")

---

## File Classification

### New files

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `supabase/migrations/20260520000001_phase4_approval.sql` | migration | schema | `supabase/migrations/20260519000003_phase3_automation.sql` | exact |
| `supabase/migrations/20260520000002_advisory_lock_rpc.sql` | migration (RPC) | DB function | `supabase/migrations/20260505000005_vault.sql` | exact |
| `apps/web/lib/review-token.ts` | shared lib (HMAC sign/verify) | request-response | `apps/web/lib/unsubscribe-token.ts` | exact |
| `apps/web/lib/slack/signature.ts` | shared lib (HMAC verify) | request-response | `apps/web/lib/calendar/index.ts` (verifyCalendlySignature) | role-match |
| `apps/web/lib/slack/oauth.ts` | shared lib (OAuth helpers) | request-response | `apps/web/lib/gmail/auth.ts` | exact |
| `apps/web/lib/slack/blocks.ts` | shared lib (Block Kit builder) | transform | (no analog — pure builder) | none |
| `apps/web/lib/slack/client.ts` | shared lib (Slack WebClient factory) | request-response | `apps/web/lib/gmail/client.ts` | role-match |
| `apps/web/lib/twilio/signature.ts` | shared lib (Twilio sig verify) | request-response | `apps/web/lib/calendar/index.ts` | role-match |
| `apps/web/lib/twilio/client.ts` | shared lib | request-response | `apps/web/lib/gmail/client.ts` | role-match |
| `apps/web/lib/resend/client.ts` | shared lib | request-response | `apps/web/lib/gmail/client.ts` | role-match |
| `apps/web/lib/resend/signature.ts` | shared lib (Svix sig verify) | request-response | `apps/web/lib/calendar/index.ts` | role-match |
| `apps/web/lib/notifications/dispatcher.ts` | shared lib (dispatcher) | event-driven fan-out | `apps/web/lib/gmail/error-handler.ts` (`notification_log` write) | role-match |
| `apps/web/lib/notifications/channels/dashboard.ts` | channel adapter | DB insert | `apps/web/lib/gmail/error-handler.ts` lines 32-38 | exact |
| `apps/web/lib/notifications/channels/email.ts` | channel adapter | request-response | `apps/web/lib/gmail/client.ts` | role-match |
| `apps/web/lib/notifications/channels/slack.ts` | channel adapter | request-response | `apps/web/lib/gmail/client.ts` | role-match |
| `apps/web/lib/notifications/channels/whatsapp.ts` | channel adapter | request-response | `apps/web/lib/gmail/client.ts` | role-match |
| `apps/web/lib/notifications/channels/sms.ts` | channel adapter | request-response | `apps/web/lib/gmail/client.ts` | role-match |
| `apps/web/lib/notifications/templates/draft-ready.ts` | template (copy variants) | transform | (no direct analog — small copy bundle) | none |
| `apps/web/lib/notifications/templates/draft-followup.ts` | template | transform | (same — copy bundle) | none |
| `apps/web/lib/notifications/templates/bounce.ts` | template | transform | (same) | none |
| `apps/web/lib/email/templates/draft-ready.tsx` | email template (HTML) | transform | `apps/web/lib/email/template.ts` (injectTrackingPixel only) | role-match (minimal) |
| `apps/web/inngest/functions/notification-dispatcher.ts` | Inngest function | event-driven fan-out | `apps/web/inngest/functions/bounce-handler.ts` | exact |
| `apps/web/inngest/functions/draft-followup-cta.ts` | Inngest function | scheduled (sleepUntil) | `apps/web/inngest/functions/sequence-no-show.ts` | exact |
| `apps/web/inngest/functions/draft-hold-cascade.ts` | Inngest function | scheduled (sleepUntil) | `apps/web/inngest/functions/sequence-no-show.ts` | exact |
| `apps/web/inngest/functions/autonomous-mode-b-timer.ts` | Inngest function | scheduled (sleepUntil) | `apps/web/inngest/functions/sequence-no-show.ts` | exact |
| `apps/web/app/api/auth/slack/install/route.ts` | OAuth route | request-response | `apps/web/app/api/auth/gmail/authorize/route.ts` | exact |
| `apps/web/app/api/auth/slack/callback/route.ts` | OAuth route | request-response | `apps/web/app/api/auth/gmail/callback/route.ts` | exact |
| `apps/web/app/api/webhooks/slack/interactivity/route.ts` | webhook receiver | request-response | `apps/web/app/api/webhooks/calendar/calendly/route.ts` | exact |
| `apps/web/app/api/webhooks/twilio/status/route.ts` | webhook receiver | request-response | `apps/web/app/api/webhooks/calendar/calendly/route.ts` | exact |
| `apps/web/app/api/webhooks/resend/route.ts` | webhook receiver | request-response | `apps/web/app/api/webhooks/calendar/calendly/route.ts` | exact |
| `apps/web/app/api/drafts/[id]/route.ts` (PATCH approve/hold) | API route | CRUD | `apps/web/app/api/coaches/sequence-config/route.ts` + `apps/web/app/api/drafts/[id]/regenerate/route.ts` | exact |
| `apps/web/app/api/review/[token]/route.ts` (PATCH action) | API route (token-gated) | request-response | `apps/web/app/api/unsubscribe/route.ts` | exact |
| `apps/web/app/api/settings/notifications/route.ts` (PATCH per-cell) | API route | CRUD | `apps/web/app/api/coaches/sequence-config/route.ts` | exact |
| `apps/web/app/api/settings/autonomous-mode/route.ts` (PATCH mode) | API route | CRUD | `apps/web/app/api/coaches/sequence-config/route.ts` | exact |
| `apps/web/app/(review)/layout.tsx` | layout (no AppShell) | SSR | `apps/web/app/(auth)/layout.tsx` | role-match |
| `apps/web/app/(review)/review/[token]/page.tsx` | public page (token-gated) | SSR | `apps/web/app/unsubscribe/page.tsx` + `apps/web/app/(dashboard)/drafts/page.tsx` | role-match |
| `apps/web/app/r/[token]/route.ts` | short-link redirect | request-response | `apps/web/app/api/unsubscribe/route.ts` (302 pattern) | role-match |
| `apps/web/app/r/invalid/page.tsx` | public static page | SSR | `apps/web/app/unsubscribe/page.tsx` | exact |
| `apps/web/app/(dashboard)/settings/notifications/page.tsx` | settings page | SSR | `apps/web/app/(dashboard)/settings/voice/page.tsx` + `apps/web/app/(dashboard)/settings/page.tsx` | exact |
| `apps/web/app/(dashboard)/settings/notifications/NotificationMatrix.tsx` | client component | request-response | `apps/web/components/settings/SequenceSettingsClient.tsx` | role-match |
| `apps/web/app/(dashboard)/settings/autonomous/page.tsx` | settings page | SSR | `apps/web/app/(dashboard)/settings/voice/page.tsx` | exact |
| `apps/web/app/(dashboard)/settings/autonomous/AutonomousModeCard.tsx` | client component | request-response | `apps/web/components/settings/SequenceSettingsClient.tsx` | role-match |
| `apps/web/app/(dashboard)/settings/autonomous/AutonomousModeAConfirmModal.tsx` | client component (modal) | request-response | (no analog — first project modal of this kind) | partial |
| `apps/web/components/drafts/HeldTab.tsx` | client component | event-driven (Realtime) | `apps/web/components/drafts/DraftQueueScaffold.tsx` (tabpanel) + `apps/web/components/drafts/draft-realtime.tsx` | exact |
| `apps/web/components/drafts/CelebrationEmptyState.tsx` | client component | view | `apps/web/components/drafts/DraftCard.tsx` (Framer Motion entry only) | role-match |
| `apps/web/components/drafts/HeldDraftActions.tsx` | client component (sub) | request-response | `apps/web/components/drafts/DraftCard.tsx` footer | exact |
| `packages/shared/src/types/notifications.ts` | shared types | — | `packages/shared/src/types/calendar.ts` | exact |

### Modified files

| File | Modification | Analog for delta |
|------|-------------|------------------|
| `apps/web/components/drafts/DraftQueueScaffold.tsx` | Add "Held" tab to existing tab bar | Self — extends its own pattern (lines 41-80) |
| `apps/web/components/drafts/DraftCard.tsx` | Add `variant?: 'pending'\|'held'` + `surface?: 'app'\|'review'` props | Self — gates current footer behind variant |
| `apps/web/app/api/inngest/route.ts` | Register 4 new Inngest functions | Self — append to `functions: [...]` array (line 14) |
| `apps/web/app/(dashboard)/settings/page.tsx` | Add "Notifications" + "Autonomous mode" link cards | Self — mirror existing Gmail card pattern (lines 44-67) |

---

## Pattern Assignments

### `supabase/migrations/20260520000001_phase4_approval.sql` (migration)

**Analog:** `supabase/migrations/20260519000003_phase3_automation.sql`

**Table-create + RLS pattern** (analog lines 15-39):
```sql
CREATE TABLE IF NOT EXISTS pending_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  ...
);

ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_actions_coach_select"
  ON pending_actions FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "pending_actions_coach_insert"
  ON pending_actions FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "pending_actions_coach_update"
  ON pending_actions FOR UPDATE
  USING (coach_id = auth.uid());
```

**ALTER TABLE column-add pattern** (analog lines 2-5):
```sql
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS sequence_config JSONB DEFAULT
    '{"no_show_delays":[1,3,7,14,21],"call_completed_delays":[1,4,10]}';
```

**Apply to Phase 4 additions (D-25):**
- `ALTER TABLE drafts ADD COLUMN IF NOT EXISTS followup_count INTEGER NOT NULL DEFAULT 0;`
- `ALTER TABLE drafts ADD COLUMN IF NOT EXISTS review_token_nonce UUID DEFAULT gen_random_uuid();`
- `CREATE TABLE notification_preferences (coach_id UUID, event_type TEXT, channel notification_channel, enabled BOOLEAN NOT NULL DEFAULT true, PRIMARY KEY (coach_id, event_type, channel), ...)`
- `CREATE TABLE consumed_tokens (token_id UUID PRIMARY KEY, coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE, draft_id UUID, action TEXT NOT NULL, consumed_at TIMESTAMPTZ NOT NULL DEFAULT now())`
- RLS scoped to `coach_id` on both new tables, identical four-policy shape

---

### `supabase/migrations/20260520000002_advisory_lock_rpc.sql` (RPC, SECURITY DEFINER)

**Analog:** `supabase/migrations/20260505000005_vault.sql`

**`private` schema + SECURITY DEFINER + REVOKE/GRANT pattern** (analog lines 7-63):
```sql
CREATE SCHEMA IF NOT EXISTS private;

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
BEGIN
  -- ... body ...
  RETURN v_vault_id;
END;
$$;

REVOKE ALL ON FUNCTION private.store_gmail_tokens(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.store_gmail_tokens(UUID, JSONB) TO service_role;
```

**Apply to Phase 4:**
- Create `private.approve_draft_atomic(p_draft_id UUID, p_actor TEXT) RETURNS JSONB` — CAS path: `pg_try_advisory_xact_lock(hashtextextended(p_draft_id::text, 0))` → SELECT status → UPDATE if `pending` → return `{success, prior_status, new_status}`.
- Create `private.hold_draft_atomic(p_draft_id UUID, p_actor TEXT)` — same shape, target `held`.
- Create `private.consume_review_token(p_token_id UUID, p_coach_id UUID, p_draft_id UUID, p_action TEXT)` — INSERT into `consumed_tokens`; on conflict (already used) RAISE EXCEPTION.
- All three: `REVOKE ALL FROM PUBLIC; GRANT EXECUTE ... TO service_role;` per INFRA-003.

---

### `apps/web/lib/review-token.ts` (shared lib — HMAC sign/verify)

**Analog:** `apps/web/lib/unsubscribe-token.ts` (whole file, 53 lines — near-clone)

**Full file structure to copy** (analog lines 1-52):
```typescript
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

interface ReviewTokenPayload {
  draftId: string;
  coachId: string;
  exp: number;    // expiry epoch ms — 7 days
  nonce: string;  // UUID, matches drafts.review_token_nonce
}

export function generateReviewToken(args: {
  draftId: string; coachId: string; nonce: string;
}): string {
  const secret = process.env.JWT_REVIEW_SECRET;
  if (!secret) throw new Error("JWT_REVIEW_SECRET env var not set");
  const payload: ReviewTokenPayload = {
    draftId: args.draftId,
    coachId: args.coachId,
    nonce: args.nonce,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = createHmac("sha256", secret).update(encodedPayload).digest("hex");
  return `${encodedPayload}.${hmac}`;
}

export function verifyReviewToken(token: string): ReviewTokenPayload | null {
  // Mirror unsubscribe-token.ts lines 21-46 exactly:
  // 1. parts.length check
  // 2. timing-safe compare with computed HMAC
  // 3. JSON.parse(base64url decode)
  // 4. additional: if (payload.exp < Date.now()) return null
}

export function buildReviewUrl(args: {...}): string {
  // mirrors buildUnsubscribeUrl pattern (analog lines 48-52)
  // returns `${appUrl}/review/${encodeURIComponent(token)}`
}

export function buildShortReviewUrl(args: {...}): string {
  // returns `${appUrl}/r/${token.slice(0, 8)}` — short-link variant for SMS
}
```

**Key delta from analog:** payload has `exp` and `nonce` fields. Verify adds `exp < Date.now()` check after HMAC validation.

**Env var:** `JWT_REVIEW_SECRET` (new — name despite using HMAC, kept for consistency with Phase 4 D-06 wording).

---

### `apps/web/lib/slack/signature.ts` (shared lib — webhook sig verify)

**Analog:** Reuses the `crypto.createHmac` + `timingSafeEqual` shape from `apps/web/lib/unsubscribe-token.ts` lines 1-37, and the "verify-or-return-401" usage shape from `apps/web/app/api/webhooks/calendar/calendly/route.ts` lines 9-20.

**Slack-specific computation** (must be: `v0:{timestamp}:{rawBody}` HMAC-SHA256, with 5-min replay window — see RESEARCH.md Pattern 1, lines 378-397):
```typescript
import { createHmac, timingSafeEqual } from "crypto";

export function verifySlackSignature(args: {
  signingSecret: string;
  timestamp: string;  // X-Slack-Request-Timestamp header
  signature: string;  // X-Slack-Signature header
  rawBody: string;    // MUST be raw, not parsed
}): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(args.timestamp)) > 300) return false;
  const baseString = `v0:${args.timestamp}:${args.rawBody}`;
  const computed = "v0=" + createHmac("sha256", args.signingSecret).update(baseString).digest("hex");
  const a = Buffer.from(computed);
  const b = Buffer.from(args.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

---

### `apps/web/lib/slack/oauth.ts` (Slack OAuth v2 install + callback helpers)

**Analog:** `apps/web/lib/gmail/auth.ts` (whole file, 29 lines)

**Imports + factory + buildAuthorizeUrl pattern** (analog lines 1-28):
```typescript
import { google } from "googleapis";

export const REQUIRED_GMAIL_SCOPES = [...] as const;

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );
}

export function buildAuthorizeUrl(coachId: string): string {
  return createOAuth2Client().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...ALL_GMAIL_SCOPES],
    state: coachId,
  });
}
```

**Apply to Phase 4:**
- `REQUIRED_SLACK_SCOPES = ["chat:write", "im:write", "users:read"] as const;` (CONTEXT.md specifics — do NOT include `commands` in Phase 4).
- `buildSlackInstallUrl(coachId)` returns `https://slack.com/oauth/v2/authorize?client_id=...&scope=...&state={coachId}&redirect_uri=...`.
- `exchangeSlackCode(code)` calls Slack's `oauth.v2.access` endpoint via `@slack/web-api`'s `WebClient.oauth.v2.access` (no client token needed for this call).

---

### `apps/web/app/api/auth/slack/install/route.ts` (OAuth GET → redirect)

**Analog:** `apps/web/app/api/auth/gmail/authorize/route.ts` (whole file, 13 lines — exact clone)

**Full pattern** (analog lines 1-12):
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl } from "@/lib/gmail/auth";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!));
  const url = buildAuthorizeUrl(user.id);
  return NextResponse.redirect(url);
}
```

**Apply:** replace `buildAuthorizeUrl` with `buildSlackInstallUrl`.

---

### `apps/web/app/api/auth/slack/callback/route.ts` (OAuth code exchange → Vault write)

**Analog:** `apps/web/app/api/auth/gmail/callback/route.ts` (lines 1-83, whole file)

**Critical sequence — copy verbatim** (analog lines 50-82):
```typescript
// 3. Persist to Vault FIRST. If Vault fails, do NOT touch integrations.
let vaultId: string;
try {
  await adminClient.from("integrations").upsert(
    {
      coach_id: coachId,
      provider: "gmail",
      status: "disconnected", // intermediate
    },
    { onConflict: "coach_id,provider" },
  );

  const { data, error: vaultErr } = await adminClient.schema("private").rpc("store_gmail_tokens", {
    p_coach_id: coachId,
    p_tokens: tokens,
  });
  if (vaultErr || !data) throw new Error(vaultErr?.message ?? "vault store returned null");
  vaultId = data;
} catch {
  return NextResponse.redirect(new URL("/settings?error=oauth_vault_failed", APP_URL));
}

// 4. Update integrations row to connected
await adminClient.from("integrations").update({
  vault_secret_id: vaultId,
  status: "connected",
  scopes: granted,
  error_message: null,
  last_checked_at: new Date().toISOString(),
}).eq("coach_id", coachId).eq("provider", "slack");

return NextResponse.redirect(new URL("/settings?connected=slack", APP_URL));
```

**Apply to Phase 4:**
- `provider: "slack"` (already in `integration_provider` enum per CONTEXT.md canonical_refs).
- Create new RPC `private.store_slack_token(p_coach_id UUID, p_token TEXT)` modeled exactly on `store_gmail_tokens` (analog `vault.sql` lines 11-38). Secret name: `slack_bot_token_${coachId}`.
- `error=oauth_*` codes added to `describeError()` in `apps/web/app/(dashboard)/settings/page.tsx` (analog lines 77-92).

---

### `apps/web/app/api/webhooks/slack/interactivity/route.ts` (webhook receiver)

**Analog:** `apps/web/app/api/webhooks/calendar/calendly/route.ts` (whole file, 79 lines)

**Raw-body → signature verify → exit-early → enqueue pattern** (analog lines 1-78):
```typescript
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { verifyCalendlySignature, normalizeCalendlyPayload } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  // ... param extract ...
  const valid = verifyCalendlySignature(
    rawBody,
    request.headers.get("calendly-webhook-signature"),
    process.env.CALENDLY_WEBHOOK_SECRET!
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });
  // ... dedup ...
  // ... DB write ...
  await inngest.send({ id: ..., name: ..., data: ... });
  return new Response("OK", { status: 200 });
}
```

**Apply to Phase 4 Slack interactivity:**
1. `const rawBody = await request.text();` — Slack sig needs raw body verbatim.
2. `verifySlackSignature({ signingSecret: env.SLACK_SIGNING_SECRET, timestamp, signature, rawBody })` → 401 on mismatch.
3. Parse `payload` form-urlencoded (`URLSearchParams(rawBody).get("payload") → JSON.parse`).
4. Switch on `payload.actions[0].action_id`: `approve` → call `private.approve_draft_atomic` RPC → `chat.update` Slack message; `hold` → call `private.hold_draft_atomic` → `chat.update`; `edit` → `views.open` modal with `trigger_id`.
5. Always respond 200 within Slack's 3-second budget; defer Gmail send to Inngest via `await inngest.send({ name: "draft/send_via_gmail", data: {...} })`.

---

### `apps/web/app/api/webhooks/twilio/status/route.ts` (Twilio StatusCallback)

**Analog:** `apps/web/app/api/webhooks/calendar/calendly/route.ts` (same shape)

**Delta from analog:**
- Signature uses `twilio.validateRequest(authToken, signature, url, params)` (per RESEARCH.md) instead of HMAC.
- Update path: `adminClient.from("notification_log").update({ status, delivered_at }).eq("external_id", payload.MessageSid)`.
- No Inngest event — just DB update.

---

### `apps/web/app/api/webhooks/resend/route.ts` (Resend delivery webhook)

**Analog:** Same calendly shape.

**Delta:**
- Use `Resend.webhooks.verify(rawBody, signature, secret)` for Svix verification (per RESEARCH.md).
- Update `notification_log` by `external_id = payload.email_id`.

---

### `apps/web/app/api/drafts/[id]/route.ts` (PATCH approve/hold) — **CURRENTLY MISSING**

> Note: `DraftCard.tsx` line 50 calls `fetch(/api/drafts/${id}, PATCH, { status, body })` but the route file does not exist. Phase 4 creates it.

**Analog:** `apps/web/app/api/coaches/sequence-config/route.ts` (lines 1-31) for the auth/zod/admin pattern; `apps/web/app/api/drafts/[id]/regenerate/route.ts` lines 7-26 for the `[id]` ownership-check pattern.

**Auth + ownership pattern from regenerate** (analog lines 7-25):
```typescript
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: draft } = await supabase
    .from('drafts')
    .select('coach_id, lead_id, ...')
    .eq('id', id)
    .maybeSingle();
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (draft.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  ...
}
```

**Zod body validation** (analog sequence-config lines 7-22):
```typescript
const BodySchema = z.object({
  status: z.enum(["approved", "held", "cancelled"]),
  body: z.string().optional(),
});
const parsed = BodySchema.safeParse(await req.json().catch(() => null));
if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
```

**Phase 4 additions:**
- On `status === "approved"`: call `private.approve_draft_atomic` RPC → on success, fire Inngest `draft/send_via_gmail` event.
- On `status === "held"`: call `private.hold_draft_atomic` RPC.
- On `status === "cancelled"`: simple UPDATE (no lock needed — terminal cleanup).

---

### `apps/web/app/api/review/[token]/route.ts` (public token-gated action)

**Analog:** `apps/web/app/api/unsubscribe/route.ts` (whole file, 87 lines)

**Token-verify → DB-update → 302/redirect pattern** (analog lines 9-86):
```typescript
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new Response(null, { status: 302, headers: { Location: "/unsubscribe?error=invalid_token" } });
  const payload = verifyUnsubscribeToken(token);
  if (!payload) return new Response(null, { status: 302, headers: { Location: "/unsubscribe?error=invalid_token" } });
  const { leadId, coachId } = payload;
  // ... ownership check, then state-change writes, then inngest.send, then 302 ...
}
```

**Apply to Phase 4 review/[token]:**
- PATCH (Approve/Hold) — verify token via `verifyReviewToken`, call `private.consume_review_token` RPC (atomic; throws if already consumed → return 409 "already actioned"), then call `private.approve_draft_atomic` or `private.hold_draft_atomic`.
- GET (read-only) — verify token, return draft JSON. Does NOT consume nonce.

---

### `apps/web/app/(review)/review/[token]/page.tsx` (public review page, no AppShell)

**Analog:** `apps/web/app/(auth)/layout.tsx` (route-group-without-dashboard-layout pattern) + `apps/web/app/unsubscribe/page.tsx` (lines 1-38 for the centered-card public-page shell) + `apps/web/app/(dashboard)/drafts/page.tsx` (lines 9-46 for the server-fetch + render-DraftQueueScaffold pattern).

**Centered public-page card** (analog unsubscribe lines 8-37):
```tsx
return (
  <main className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] max-w-md w-full text-center space-y-4">
      ...
    </div>
  </main>
);
```

**Server-fetch pattern** (analog drafts/page.tsx lines 11-34):
```typescript
const supabase = await createClient();   // for review page: use ADMIN client + token verify, NOT user session
const { data: { user } } = await supabase.auth.getUser();   // skip — token is the auth
const [draftsResult, ...] = await Promise.all([...]);
```

**Phase 4 page logic:**
1. `verifyReviewToken(params.token)` server-side. If invalid → render expired card.
2. Check `consumed_tokens` for `token_id === payload.nonce`. If consumed → render already-actioned card.
3. Check `drafts.review_token_nonce === payload.nonce`. If mismatch → expired.
4. Use `adminClient` (NOT `createClient()`) to fetch draft+lead (page renders WITHOUT session per UI-SPEC line 288).
5. Render `<DraftCard variant="pending" surface="review" draft={draft} onAdvance={...} />` — DraftCard's PATCH calls will hit `/api/review/[token]/route` instead of `/api/drafts/[id]`.

**No-AppShell pattern:** put under `app/(review)/` route group with its own minimal `layout.tsx` (model after `(auth)/layout.tsx`).

---

### `apps/web/app/r/[token]/route.ts` (short-link redirect)

**Analog:** `apps/web/app/api/unsubscribe/route.ts` (302 pattern, lines 12-17)

```typescript
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const { token } = ... // params
  // Resolve 8-char prefix to full token via lookup (or accept full token here too)
  return new Response(null, {
    status: 302,
    headers: { Location: `/review/${fullToken}` },
  });
}
```

If lookup fails → 302 to `/r/invalid`.

---

### `apps/web/inngest/functions/notification-dispatcher.ts` (Inngest fan-out)

**Analog:** `apps/web/inngest/functions/bounce-handler.ts` (lines 1-101, full file) for the `inngest.createFunction` + `step.run` shape + `notification_log` write.

**`inngest.createFunction` + step.run shell** (analog lines 8-100):
```typescript
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";

export const notificationDispatcher = inngest.createFunction(
  { id: "notification-dispatcher" },
  { event: "notification/draft_ready" }, // or any notification/*
  async ({ event, step }) => {
    const { coachId, eventType, payload } = event.data as {...};

    const preferences = await step.run("load-preferences", async () => {
      const { data } = await adminClient
        .from("notification_preferences")
        .select("channel, enabled")
        .eq("coach_id", coachId)
        .eq("event_type", eventType);
      return data ?? [];
    });

    const connectedChannels = await step.run("load-integrations", async () => {
      const { data } = await adminClient
        .from("integrations")
        .select("provider, status")
        .eq("coach_id", coachId)
        .eq("status", "connected");
      return data ?? [];
    });

    const enabled = preferences.filter(p => p.enabled).map(p => p.channel);
    // ... compute intersection of enabled and connected ...

    const results = await Promise.all([
      ...(enabled.includes("dashboard") ? [step.run("send-dashboard", () => sendDashboard(...))] : []),
      ...(enabled.includes("email") ? [step.run("send-email", () => sendEmail(...))] : []),
      ...(enabled.includes("slack") ? [step.run("send-slack", () => sendSlack(...))] : []),
      ...(enabled.includes("whatsapp") ? [step.run("send-whatsapp", () => sendWhatsApp(...))] : []),
      ...(enabled.includes("sms") ? [step.run("send-sms", () => sendSMS(...))] : []),
    ]);

    return { ok: true, channels: results };
  }
);
```

**Each `sendChannel` writes `notification_log` row** (analog bounce-handler lines 84-91):
```typescript
await adminClient.from("notification_log").insert({
  coach_id: coachId,
  event_type: "draft_ready",
  channel: "slack",
  external_id: messageTs,    // Slack ts / Resend id / Twilio SID
  status: "sent",
  payload: {...},
});
```

---

### `apps/web/inngest/functions/draft-followup-cta.ts` / `draft-hold-cascade.ts` / `autonomous-mode-b-timer.ts`

**Analog:** `apps/web/inngest/functions/sequence-no-show.ts` (lines 1-129, full file) — for the `step.sleepUntil` + safety-check + cancelOn pattern.

**sleepUntil + safety-check pattern** (analog lines 83-113):
```typescript
for (const dayOffset of delays) {
  const sendAt = new Date(sequenceStart);
  sendAt.setDate(sendAt.getDate() + dayOffset);
  await step.sleepUntil(`sleep-day-${dayOffset}`, sendAt);
  const blocked = await step.run(`safety-check-${dayOffset}`, () =>
    runPreSendSafetyCheck(leadId, sequenceId)
  );
  if (blocked) {
    await step.run(`cancel-on-block-${dayOffset}`, async () => {...});
    return { cancelled: true, reason: blocked };
  }
  await step.sendEvent(`send-touchpoint-${dayOffset}`, buildDraftGeneratePayload({...}));
}
```

**cancelOn pattern** (analog lines 18-31) — apply to all three Phase 4 functions:
```typescript
cancelOn: [
  { event: "draft/approved_manually",
    if: "async.data.draftId == event.data.draftId" },
  { event: "draft/cancelled",
    if: "async.data.draftId == event.data.draftId" },
],
```

**Phase 4 specifics:**
- `draft-followup-cta`: `step.sleepUntil(draft.created_at + 24h)` → check `drafts.status === 'pending'` → fire `notification/draft_followup` → increment `followup_count`. Cancel on manual approve/hold/cancel.
- `draft-hold-cascade`: scheduled after follow-up, `step.sleepUntil(+24h)` → if still pending → call `private.hold_draft_atomic` RPC. Cancel on manual action.
- `autonomous-mode-b-timer`: `step.sleepUntil(draft.scheduled_send_at)` → call `private.approve_draft_atomic` → on success fire `draft/send_via_gmail`. Cancel on manual approve/hold (mode B coach who acted early).

**Pre-send safety check** (D-25 Phase 3) — every approval path passes through `runPreSendSafetyCheck(leadId, sequenceId)` from `inngest/functions/sequence-step.ts` lines 5-31. Reuse, do not duplicate.

---

### `apps/web/components/drafts/HeldTab.tsx` (new — extends DraftQueueScaffold)

**Analog:** `apps/web/components/drafts/DraftQueueScaffold.tsx` (lines 1-128, full file) for the tabpanel + Realtime hook pattern; `apps/web/components/drafts/draft-realtime.tsx` (lines 1-54) for Realtime filter delta.

**Realtime hook delta:** copy `useDraftRealtime` and adjust filter to `status=eq.held` (analog draft-realtime.tsx lines 20-46).

**Tabpanel pattern** (analog DraftQueueScaffold.tsx lines 82-110):
```tsx
<div role="tabpanel" id="tabpanel-held" aria-labelledby="tab-held" tabIndex={0} hidden={activeTab !== "held"}>
  {heldDrafts.length === 0 ? (
    <div className="rounded-2xl backdrop-blur-md bg-card dark:bg-white/5 border border-border dark:border-white/10 p-16 text-center">
      <p className="text-sm text-muted-foreground">Nothing on hold.</p>
    </div>
  ) : (
    <AnimatePresence mode="wait">
      {heldDrafts.map(d => <DraftCard key={d.id} draft={d} variant="held" onAdvance={...} />)}
    </AnimatePresence>
  )}
</div>
```

**Tab button with mono badge** (analog lines 42-60, copy verbatim and swap "Drafts"/"Held"):
```tsx
{heldDrafts.length > 0 && (
  <span className="ml-2 rounded-full text-xs font-mono px-1.5 py-0.5 bg-muted text-muted-foreground">
    {heldDrafts.length}
  </span>
)}
```

**Sort delta:** `held_at DESC` instead of `scheduled_send_at ASC` (UI-SPEC line 166).

---

### `apps/web/components/drafts/DraftCard.tsx` (modify — add variant/surface props)

**Self-reference + scoping change.** Add `variant?: 'pending' | 'held'` and `surface?: 'app' | 'review'` to props (current shape lines 27-33). Gate current footer (lines 169-182) behind `variant === 'pending'`; render Re-approve/Edit/Cancel for `variant === 'held'`.

**Re-approve action** mirrors `setStatus('approved')` (line 49); **Cancel** mirrors `setStatus('held')` shape with `cancelled` status.

**Surface = "review"** delta: disable regen button (line 130-148) — token doesn't carry session for AI calls. Wrap outer `motion.div` (line 99) in additional `bg-white/10 backdrop-blur-md` glass treatment for review page (UI-SPEC line 274).

---

### `apps/web/components/drafts/CelebrationEmptyState.tsx`

**Analog:** `apps/web/components/drafts/DraftCard.tsx` (lines 98-109 for Framer Motion entry + glass card shell).

**Glass card + Framer entry pattern** (analog lines 99-109):
```tsx
<motion.div
  initial={{ y: 16, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ type: "spring", stiffness: 120, damping: 18 }}
  className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] max-w-md mx-auto text-center"
>
  ...
</motion.div>
```

**SVG checkmark draw** — implement per UI-SPEC line 191: `stroke-dasharray` animated 0→100 over 600ms via Framer `motion.path` with `initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}`.

---

### `apps/web/app/(dashboard)/settings/notifications/page.tsx` (server + client matrix)

**Analog (server):** `apps/web/app/(dashboard)/settings/voice/page.tsx` (lines 1-31, full file) — server-fetch + render-client-component pattern.

```tsx
export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: preferences }, { data: integrations }] = await Promise.all([
    supabase.from("notification_preferences").select("*").eq("coach_id", user!.id),
    supabase.from("integrations").select("provider, status").eq("coach_id", user!.id),
  ]);

  return (
    <section className="space-y-6 max-w-3xl">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Notifications</h1>
      <NotificationMatrix
        initialPreferences={preferences ?? []}
        connectedChannels={(integrations ?? []).filter(i => i.status === "connected").map(i => i.provider)}
      />
    </section>
  );
}
```

**Analog (client):** `apps/web/components/settings/SequenceSettingsClient.tsx` (lines 1-73, full file) — optimistic-save + toast pattern.

**Optimistic-save delta** (analog lines 25-44):
```typescript
async function toggleCell(eventType: string, channel: string, enabled: boolean) {
  // Optimistic local state update
  setPreferences(prev => prev.map(p => 
    p.event_type === eventType && p.channel === channel ? { ...p, enabled } : p
  ));
  try {
    const r = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event_type: eventType, channel, enabled }),
    });
    if (!r.ok) throw new Error("Save failed");
    // no toast on success — silent per UI-SPEC copy contract
  } catch {
    // revert local state
    toast.error("Couldn't save preference. Try again.");
  }
}
```

---

### `apps/web/app/(dashboard)/settings/autonomous/AutonomousModeAConfirmModal.tsx`

**Analog:** None directly (first project modal of this kind). Use shadcn `Dialog` component (already installed per UI-SPEC line 32).

**Phrase-match pattern** (locked at "send without review" per CONTEXT.md specifics):
```tsx
const [phrase, setPhrase] = useState("");
const matches = phrase === "send without review";  // case-sensitive, trimmed
<Button variant="destructive" disabled={!matches} onClick={confirm}>
  Enable autonomous send
</Button>
```

---

## Shared Patterns (cross-cutting — apply to all relevant plans)

### Pattern S-1: Authentication via Supabase server client

**Source:** `apps/web/app/api/coaches/sequence-config/route.ts` lines 13-15 (and many others)

**Apply to:** Every dashboard-route API handler

```typescript
const supabase = await createClient();   // from "@/lib/supabase/server"
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Pattern S-2: Service-role admin client for writes

**Source:** Used throughout (bounce-handler.ts line 2, callback route lines 53-80)

**Apply to:** Every server-only DB write that bypasses RLS (Vault writes, system inserts).

```typescript
import { adminClient } from "@/lib/supabase/admin";
// adminClient is service-role — never import into client components
```

### Pattern S-3: Zod input validation

**Source:** `apps/web/app/api/coaches/sequence-config/route.ts` lines 7-22

**Apply to:** Every API route accepting a request body (CLAUDE.md security rule).

```typescript
const Schema = z.object({...});
const parsed = Schema.safeParse(await request.json().catch(() => null));
if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
```

### Pattern S-4: Webhook signature verify → exit early

**Source:** `apps/web/app/api/webhooks/calendar/calendly/route.ts` lines 10-20

**Apply to:** All three new webhooks (Slack, Twilio, Resend).

```typescript
const rawBody = await request.text();          // raw, not JSON-parsed
const valid = verifyXxxSignature(...);
if (!valid) return new Response("Unauthorized", { status: 401 });
```

### Pattern S-5: Inngest event enqueue from webhook

**Source:** `apps/web/app/api/webhooks/calendar/calendly/route.ts` lines 63-76

**Apply to:** Slack interactivity (after sig verify, enqueue `notification/draft_*` or `draft/send_via_gmail` event).

```typescript
await inngest.send({
  id: `dedup-key`,           // optional dedup
  name: EVENT_NAME,
  data: {...},
});
```

### Pattern S-6: notification_log row write inside step.run

**Source:** `apps/web/inngest/functions/bounce-handler.ts` lines 84-91 + `apps/web/lib/gmail/error-handler.ts` lines 32-38

**Apply to:** Every channel send in notification-dispatcher.

```typescript
await adminClient.from("notification_log").insert({
  coach_id: coachId,
  event_type: ...,
  channel: "slack" | "email" | "whatsapp" | "sms" | "dashboard",
  external_id: ...,           // Slack ts / Resend id / Twilio SID / null for dashboard
  status: "sent" | "failed",
  error_message: ...,
});
```

### Pattern S-7: RLS scoped to coach_id

**Source:** `supabase/migrations/20260519000003_phase3_automation.sql` lines 26-39

**Apply to:** Both new tables (`notification_preferences`, `consumed_tokens`).

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>_coach_select" ON <table> FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "<table>_coach_insert" ON <table> FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "<table>_coach_update" ON <table> FOR UPDATE USING (coach_id = auth.uid());
-- DELETE policy if mutation requires it; otherwise omit (read-only via SELECT)
```

### Pattern S-8: SECURITY DEFINER RPC in private schema (CAS path)

**Source:** `supabase/migrations/20260505000005_vault.sql` lines 11-63

**Apply to:** `private.approve_draft_atomic`, `private.hold_draft_atomic`, `private.consume_review_token`, `private.store_slack_token`.

**Required suffix on every function:**
```sql
REVOKE ALL ON FUNCTION private.<fn>(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.<fn>(...) TO service_role;
```

**Call from TypeScript:** `adminClient.schema("private").rpc("approve_draft_atomic", { p_draft_id: id, p_actor: "dashboard" })` (analog: gmail callback line 63).

### Pattern S-9: Glass card surface

**Source:** Repeated throughout — `apps/web/app/(dashboard)/settings/page.tsx` lines 44, 69; `apps/web/app/unsubscribe/page.tsx` line 10; `apps/web/components/drafts/DraftCard.tsx` line 109.

**Apply to:** CelebrationEmptyState, ReviewPage card, AutonomousModeAConfirmModal, "Already actioned" state.

```tsx
className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
```

### Pattern S-10: Raised card surface (settings cards)

**Source:** `apps/web/app/(dashboard)/settings/page.tsx` lines 44-67

**Apply to:** NotificationMatrix container, AutonomousModeCard.

```tsx
className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4"
```

### Pattern S-11: Optimistic-save with toast on failure

**Source:** `apps/web/components/settings/SequenceSettingsClient.tsx` lines 25-44; `apps/web/components/drafts/DraftCard.tsx` lines 49-61.

**Apply to:** NotificationMatrix cell toggle, AutonomousMode radio commit, HeldTab Re-approve.

```typescript
try {
  const r = await fetch(url, { method: "PATCH", body: ... });
  if (!r.ok) throw new Error();
  toast.success("...");
} catch {
  toast.error("Couldn't {action}. Try again.");
}
```

### Pattern S-12: Route group without AppShell (public/auth pages)

**Source:** `apps/web/app/(auth)/layout.tsx` + `apps/web/app/unsubscribe/page.tsx`

**Apply to:** `(review)/layout.tsx` — minimal layout without sidebar or shell. Use `min-h-screen flex items-center justify-center bg-background p-4` centered card pattern from unsubscribe page lines 9-37.

### Pattern S-13: Pre-send safety check on every approval path

**Source:** `apps/web/inngest/functions/sequence-step.ts` lines 5-31 (`runPreSendSafetyCheck`)

**Apply to:** Every approve path — dashboard `/api/drafts/[id]` PATCH, Slack interactivity Approve, review-page Approve, autonomous Mode B wake.

```typescript
const blocked = await runPreSendSafetyCheck(leadId, sequenceId);
if (blocked) return { cancelled: true, reason: blocked };
```

### Pattern S-14: HTML email "server-only" + envelope-only template helper

**Source:** `apps/web/lib/email/template.ts` (whole file, 22 lines)

**Apply to:** `lib/email/templates/draft-ready.tsx`. Note: existing file is minimal (just `injectTrackingPixel`). Phase 4 adds a full HTML template builder. Mark every new file with `import "server-only";` at the top (same as analog line 1).

### Pattern S-15: ShortLinkRedirect (302 via Response object)

**Source:** `apps/web/app/api/unsubscribe/route.ts` lines 12-17

**Apply to:** `apps/web/app/r/[token]/route.ts`.

```typescript
return new Response(null, {
  status: 302,
  headers: { Location: `/review/${fullToken}` },
});
```

---

## No Analog Found

These files require fresh design — planner should lean on RESEARCH.md code examples + library docs:

| File | Why no analog | Where to look |
|------|---------------|---------------|
| `apps/web/lib/slack/blocks.ts` | Pure Block Kit JSON builder, no existing Slack code in repo | RESEARCH.md Pattern 1 (lines 340-372) — full Block Kit example provided. UI-SPEC component 10 (lines 320-401) — locked JSON shape. |
| `apps/web/lib/notifications/templates/*` | Channel-copy bundles — new shape, no template helpers in repo yet | UI-SPEC Copywriting Contract (lines 544-712) — exact strings for every channel × event. |
| `apps/web/lib/email/templates/draft-ready.tsx` | Existing `lib/email/template.ts` is only `injectTrackingPixel` helper; no full HTML email template scaffolded | UI-SPEC component 9 (lines 299-318) — full HTML structure with inline styles. RESEARCH.md Resend SDK section. |
| `apps/web/app/(dashboard)/settings/autonomous/AutonomousModeAConfirmModal.tsx` | First confirm-modal-with-type-to-confirm in repo | shadcn `Dialog` component (already installed). UI-SPEC component 6 (lines 247-263) — locked phrase string + button labels + destructive variant. |

---

## Match-Quality Summary

| Quality | Count | Notes |
|---------|-------|-------|
| Exact (same role + same data flow + recent) | 22 | Drop-in pattern — copy structure verbatim |
| Role-match (same role, slightly different flow) | 12 | Adapt structure to new flow |
| Partial (related role, different flow) | 4 | Use as scaffolding hint only |
| None | 4 | Lean on RESEARCH.md + UI-SPEC contracts |

---

## Metadata

**Analog search scope:**
- `apps/web/app/api/**` (39 route.ts files)
- `apps/web/app/(dashboard)/**` (settings/voice + drafts pages)
- `apps/web/app/(auth)/**`, `apps/web/app/unsubscribe/**` (public-page patterns)
- `apps/web/components/drafts/**` (all 5 files)
- `apps/web/components/settings/**`, `apps/web/components/dashboard/**`
- `apps/web/inngest/functions/**` (7 files — bounce-handler, sequence-no-show were strongest hits)
- `apps/web/lib/{unsubscribe-token, gmail/auth, email/template, calendar/index, gmail/error-handler}.ts`
- `supabase/migrations/**` (9 migrations)

**Files scanned:** ~70 source files across `apps/web/` and `supabase/migrations/`
**Pattern extraction date:** 2026-05-20
**Confidence:** HIGH — every reusable analog from CONTEXT.md `<canonical_refs>` block was located and read in this pass.
