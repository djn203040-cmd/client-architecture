---
phase: 05-polish
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260520000004_phase5_polish.sql
  - apps/web/package.json
  - apps/web/next.config.ts
  - apps/web/app/(dashboard)/settings/page.tsx
  - apps/web/app/(dashboard)/settings/autonomous/page.tsx
  - apps/web/app/(dashboard)/settings/notifications/page.tsx
  - apps/web/app/(dashboard)/settings/voice/page.tsx
  - apps/web/components/settings/SettingsNav.tsx
  - apps/web/components/settings/ProfileSection.tsx
  - apps/web/components/settings/NotificationsSection.tsx
  - apps/web/components/settings/AutonomousSection.tsx
  - apps/web/components/settings/VoiceSection.tsx
  - apps/web/components/settings/IntegrationsSection.tsx
  - apps/web/components/settings/DangerZone.tsx
  - apps/web/lib/settings/autosave.ts
  - apps/web/lib/storage/avatars.ts
  - apps/web/lib/audit/log.ts
  - apps/web/app/api/settings/profile/route.ts
  - apps/web/app/api/settings/profile/avatar/route.ts
  - apps/web/app/api/settings/danger/[action]/route.ts
  - packages/shared/schemas/settings.ts
  - packages/shared/schemas/audit.ts
  - packages/database/types.ts
autonomous: false
requirements: []

must_haves:
  truths:
    - "Single /settings page with 6 sections: Profile, Notifications, Autonomous, Voice, Integrations, Danger zone (in this exact order)"
    - "Legacy /settings/autonomous, /settings/notifications, /settings/voice 301-redirect to anchors"
    - "Profile section saves display_name, avatar_url, role_title, timezone, working_hours, email_signature, public_booking_url"
    - "Avatar upload: ≤5MB validated server-side, resized to 512×512 webp via sharp, stored in coach-avatars bucket"
    - "Danger zone requires exact type-to-confirm phrase server-side validated; writes to audit_log"
    - "audit_log RLS scopes SELECT to coach_id = auth.uid(); INSERT requires service role"
    - "Schema migration adds: 7 coach columns, audit_log table, coach-avatars bucket + policies"
  artifacts:
    - path: "supabase/migrations/20260520000004_phase5_polish.sql"
      provides: "Phase 5 schema additions (D-22)"
      contains: "audit_log"
    - path: "apps/web/app/(dashboard)/settings/page.tsx"
      provides: "Six-section consolidated settings page"
    - path: "apps/web/lib/storage/avatars.ts"
      provides: "Sharp resize + Supabase Storage upload helper"
      exports: ["resizeAndUploadAvatar", "deleteAvatar"]
    - path: "apps/web/lib/audit/log.ts"
      provides: "audit_log INSERT helper"
      exports: ["writeAuditLog"]
    - path: "apps/web/lib/settings/autosave.ts"
      provides: "Debounced autosave client hook"
      exports: ["useAutosave"]
  key_links:
    - from: "apps/web/components/settings/DangerZone.tsx"
      to: "audit_log"
      via: "POST /api/settings/danger/[action] → writeAuditLog()"
      pattern: "audit_log"
    - from: "apps/web/app/api/settings/profile/avatar/route.ts"
      to: "coach-avatars Supabase Storage bucket"
      via: "sharp resize + service-role upload"
      pattern: "sharp.*resize.*coach-avatars"
    - from: "apps/web/next.config.ts"
      to: "/settings#autonomous, /settings#notifications, /settings#voice"
      via: "permanent: true redirects in redirects()"
      pattern: "redirects\\(\\)"
---

<objective>
Land the Phase 5 schema migration (D-22) and consolidate three orphan settings sub-routes into a single scrollable `/settings` page with six sections in locked order: Profile → Notifications → Autonomous → Voice → Integrations → Danger zone (D-12). Add Profile section + 7 new coach columns (D-14), Danger zone with type-to-confirm + audit_log (D-15), autosave on blur (D-16), and 301 redirects from legacy sub-routes.

Purpose: This is the foundation plan for Phase 5 — the migration unblocks Plans 05-02 (which reads `onboarding_*` columns) and tightens the surface area Plan 05-04 must E2E-cover. Settings becomes one page; legacy bookmarks still work via 301; new identity/profile surface lands; Danger zone gives coaches self-serve disconnect/delete without operator involvement.

Output:
- One new migration `20260520000004_phase5_polish.sql` (FILE NAME CHANGED from CONTEXT.md's proposed `20260520000001_phase5.sql` — that timestamp collides with Phase 4's `20260520000001_phase4_approval.sql`; using next free slot per project pattern).
- `sharp` added to `apps/web/package.json`.
- Rewritten `/settings/page.tsx` with sticky anchor-pill nav.
- 6 settings section components (3 lifted from sub-routes, 3 new).
- 3 settings sub-route `page.tsx` files converted to thin server redirects (per Pitfall 7 — file deletion would also work, but redirect stubs are safer).
- 3 API routes: profile PATCH, avatar POST, danger `[action]` POST.
- Avatar resize helper, audit log helper, autosave hook.
- Zod schemas in `packages/shared/`.
- `next.config.ts` permanent redirects.
- Regenerated `packages/database/types.ts`.
</objective>

<execution_context>
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/workflows/execute-plan.md
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-polish/05-CONTEXT.md
@.planning/phases/05-polish/05-RESEARCH.md
@CLAUDE.md
@supabase/migrations/20260520000003_public_rpc_wrappers.sql
@apps/web/app/(dashboard)/settings/page.tsx

<interfaces>
<!-- Section order — LOCKED per D-12 + CONTEXT.md Specifics. The order matters per Daniel: identity → communication → behavior → data → plumbing → destruction. -->
const SECTION_ORDER = ["profile", "notifications", "autonomous", "voice", "integrations", "danger"] as const;

<!-- Profile fields — LOCKED per D-14 -->
- display_name (defaults to coaches.name; separately editable)
- avatar_url (Supabase Storage, coach-avatars/{coach_id}/{ts}.webp)
- role_title TEXT
- timezone TEXT (IANA, auto-detect via Intl.DateTimeFormat().resolvedOptions().timeZone, dropdown of Intl.supportedValuesOf('timeZone'))
- working_hours JSONB { start: "09:00", end: "18:00" } default
- email_signature TEXT (multi-line, appended to outbound emails)
- public_booking_url TEXT (URL-validated, becomes {booking_url} template token)

<!-- Danger zone confirm strings — LOCKED per CONTEXT.md Specifics -->
const CONFIRM_PHRASES = {
  disconnect_gmail: "disconnect gmail",
  disconnect_slack: "disconnect slack",
  disconnect_twilio: "disconnect twilio",
  delete_account: "<coach.email>",  // dynamic, equals coach's own email
};

<!-- audit_log.action enum — LOCKED per CONTEXT.md Specifics -->
const AUDIT_ACTIONS = ["gmail_disconnected", "slack_disconnected", "twilio_disconnected", "account_deleted"] as const;

<!-- Migration filename collision note -->
CONTEXT.md D-22 proposed: supabase/migrations/20260520000001_phase5.sql
Reality: 20260520000001_phase4_approval.sql already exists.
Resolved filename: supabase/migrations/20260520000004_phase5_polish.sql (next free slot, consistent with 03 then 04).

<!-- Storage bucket + policy SQL — verbatim from RESEARCH.md Pattern 6 -->
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('coach-avatars', 'coach-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

<!-- audit_log shape — verbatim from RESEARCH.md Pattern 7 -->
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('gmail_disconnected','slack_disconnected','twilio_disconnected','account_deleted')),
  metadata    JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Phase 5 migration (schema, RLS, storage bucket), sharp install, regenerate types</name>
  <files>supabase/migrations/20260520000004_phase5_polish.sql, apps/web/package.json, packages/database/types.ts</files>
  <action>
1. **Verify pre-existing column status** before writing migration. Per CONTEXT.md D-22 "timezone (existing? researcher verifies; add if missing)":
   ```bash
   grep -i "timezone" supabase/migrations/2026*.sql
   ```
   If `coaches.timezone` already exists in an earlier migration, omit it from this migration. RESEARCH.md verified Phase 5 columns are net-new — but re-verify timezone specifically.

2. Create `supabase/migrations/20260520000004_phase5_polish.sql` containing in this order:

   **A. Coach columns** (skip any that already exist):
   ```sql
   ALTER TABLE coaches
     ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
     ADD COLUMN IF NOT EXISTS onboarding_progress JSONB NOT NULL DEFAULT '{}',
     ADD COLUMN IF NOT EXISTS avatar_url TEXT,
     ADD COLUMN IF NOT EXISTS role_title TEXT,
     ADD COLUMN IF NOT EXISTS timezone TEXT,
     ADD COLUMN IF NOT EXISTS working_hours JSONB NOT NULL DEFAULT '{"start":"09:00","end":"18:00"}',
     ADD COLUMN IF NOT EXISTS email_signature TEXT,
     ADD COLUMN IF NOT EXISTS public_booking_url TEXT;
   ```

   **B. audit_log table** (exact SQL from RESEARCH.md Pattern 7):
   ```sql
   CREATE TABLE IF NOT EXISTS audit_log (
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
   CREATE INDEX IF NOT EXISTS audit_log_coach_id_created_at_idx ON audit_log (coach_id, created_at DESC);
   ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "audit_log_select_own" ON audit_log
     FOR SELECT TO authenticated
     USING (coach_id = (SELECT auth.uid()));
   -- No INSERT / UPDATE / DELETE policies for authenticated. Service role bypasses RLS.
   -- Append-only by policy.
   ```

   **C. Storage bucket + policies** (verbatim from RESEARCH.md Pattern 6):
   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES ('coach-avatars', 'coach-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
   ON CONFLICT (id) DO NOTHING;

   CREATE POLICY "coach_avatars_upload_own" ON storage.objects
     FOR INSERT TO authenticated WITH CHECK (
       bucket_id = 'coach-avatars'
       AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
     );
   CREATE POLICY "coach_avatars_select_public" ON storage.objects
     FOR SELECT TO public USING (bucket_id = 'coach-avatars');
   CREATE POLICY "coach_avatars_update_own" ON storage.objects
     FOR UPDATE TO authenticated USING (
       bucket_id = 'coach-avatars'
       AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
     );
   CREATE POLICY "coach_avatars_delete_own" ON storage.objects
     FOR DELETE TO authenticated USING (
       bucket_id = 'coach-avatars'
       AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
     );
   ```

3. Push the migration to live Supabase (project ref `ktxgtpvilrydmedvzgft` per MEMORY.md):
   ```bash
   supabase db push --linked
   ```

4. Add `sharp` dependency:
   ```json
   // apps/web/package.json — add to dependencies:
   "sharp": "^0.34.5"
   ```
   Then `pnpm install`.

5. Regenerate Supabase types into `packages/database/types.ts`:
   ```bash
   supabase gen types typescript --project-id ktxgtpvilrydmedvzgft > packages/database/types.ts
   ```
   Verify the new columns and `audit_log` table appear in the generated `Database` type.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && test -f supabase/migrations/20260520000004_phase5_polish.sql && grep -q "audit_log" supabase/migrations/20260520000004_phase5_polish.sql && grep -q "coach-avatars" supabase/migrations/20260520000004_phase5_polish.sql && grep -q "onboarding_completed_at" supabase/migrations/20260520000004_phase5_polish.sql</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "\"sharp\"" apps/web/package.json && grep -q "audit_log" packages/database/types.ts && grep -q "avatar_url" packages/database/types.ts</automated>
  </verify>
  <done>
    Migration file exists, applied to live Supabase, regenerated types include new columns + audit_log table + coach-avatars bucket awareness. sharp installed.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Helpers (autosave hook, avatar resize, audit log), Zod schemas, three API routes</name>
  <files>apps/web/lib/settings/autosave.ts, apps/web/lib/storage/avatars.ts, apps/web/lib/audit/log.ts, packages/shared/schemas/settings.ts, packages/shared/schemas/audit.ts, apps/web/app/api/settings/profile/route.ts, apps/web/app/api/settings/profile/avatar/route.ts, apps/web/app/api/settings/danger/[action]/route.ts</files>
  <behavior>
    - Test: `useAutosave(value, save, 500)` calls `save` exactly once after 500ms of stable value
    - Test: `resizeAndUploadAvatar(buffer, coachId)` produces a 512×512 webp and uploads to `coach-avatars/{coachId}/{ts}.webp`
    - Test: avatar route rejects `Content-Length` > 5_242_880 with 413 BEFORE reading body (Pitfall 4)
    - Test: avatar route rejects MIME types outside `image/jpeg|image/png|image/webp` with 415
    - Test: avatar route deletes the previous avatar (if any) after successful upload
    - Test: profile PATCH validates `public_booking_url` is a URL (Zod `.url()`); rejects non-URL strings
    - Test: profile PATCH validates `working_hours.start` and `.end` as `HH:MM` strings
    - Test: danger route rejects wrong confirm phrase with 400 (e.g., posting `"Disconnect Gmail"` capitalized — must be exact `disconnect gmail`)
    - Test: danger route for `delete_account` requires confirm phrase to equal coach's own email verbatim
    - Test: every danger action writes an audit_log row with the correct `action` enum value
  </behavior>
  <action>
1. Create `apps/web/lib/settings/autosave.ts` — exact code from RESEARCH.md Pattern 8 with 500ms default debounce per Open Question 3 recommendation. Hook signature `useAutosave<T>(value: T, save: (v: T) => Promise<void>, debounceMs = 500)`. Uses sonner `toast.success("Saved")` on success and `toast.error("Couldn't save — try again")` on failure.

2. Create `apps/web/lib/storage/avatars.ts`:
   - `resizeAndUploadAvatar(buffer: Buffer, coachId: string, supabaseAdmin: SupabaseClient): Promise<string>`:
     - `sharp(buffer).resize(512, 512, { fit: 'cover', position: 'center' }).webp({ quality: 85 }).toBuffer()`
     - Upload path: `${coachId}/${Date.now()}.webp` into `coach-avatars` bucket via service role.
     - Returns the public URL via `supabaseAdmin.storage.from('coach-avatars').getPublicUrl(path).data.publicUrl`.
   - `deleteAvatar(path: string, supabaseAdmin)`:
     - `supabaseAdmin.storage.from('coach-avatars').remove([path])`.

3. Create `apps/web/lib/audit/log.ts`:
   - `writeAuditLog({ coachId, action, metadata, ipAddress, userAgent }, supabaseAdmin)`:
     - INSERT INTO audit_log via service-role client.
     - Action validated against `AUDIT_ACTIONS` enum (Zod-parsed).
     - Never `console.log` `metadata` (may contain Vault secret IDs per COMPLY-009).

4. Create `packages/shared/schemas/settings.ts`:
   ```ts
   import { z } from "zod";

   export const TimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM");
   export const WorkingHoursSchema = z.object({ start: TimeOfDay, end: TimeOfDay });

   export const ProfilePatchSchema = z.object({
     display_name: z.string().min(1).max(100).optional(),
     role_title: z.string().max(100).nullable().optional(),
     timezone: z.string().refine((tz) => {
       try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true; } catch { return false; }
     }, "Invalid IANA timezone").optional(),
     working_hours: WorkingHoursSchema.optional(),
     email_signature: z.string().max(2000).nullable().optional(),
     public_booking_url: z.string().url().nullable().optional(),
   });
   ```

5. Create `packages/shared/schemas/audit.ts`:
   ```ts
   import { z } from "zod";
   export const AuditActionEnum = z.enum([
     "gmail_disconnected",
     "slack_disconnected",
     "twilio_disconnected",
     "account_deleted",
   ]);
   export type AuditAction = z.infer<typeof AuditActionEnum>;
   ```

6. Create `apps/web/app/api/settings/profile/route.ts` — `PATCH`:
   - Auth check via cookie session.
   - Body validated by `ProfilePatchSchema`.
   - UPDATE coaches SET <fields> WHERE id = auth.uid().
   - Return updated coach.

7. Create `apps/web/app/api/settings/profile/avatar/route.ts` — `POST`:
   - Auth check.
   - Per Pitfall 4: read `Content-Length` header BEFORE reading body. If > 5_242_880, return 413.
   - Parse multipart body. Extract first file.
   - Check `file.type` is in `['image/jpeg', 'image/png', 'image/webp']`. Return 415 if not.
   - `buffer = Buffer.from(await file.arrayBuffer())`.
   - `newUrl = await resizeAndUploadAvatar(buffer, coach.id, supabaseAdmin)`.
   - Read coach's current `avatar_url`. If present, extract path and call `deleteAvatar(oldPath, supabaseAdmin)`.
   - UPDATE coaches SET avatar_url = $newUrl WHERE id = auth.uid().
   - Return `{ url: newUrl }`.
   - Per Pitfall 8: this is server-mediated so `auth.uid()` is reliable; upload uses service role.

8. Create `apps/web/app/api/settings/danger/[action]/route.ts` — `POST`:
   - `params: { action: string }` validated via `AuditActionEnum.safeParse("<param>_disconnected" | "account_deleted")`.

     Map URL params → audit actions:
     - `/api/settings/danger/disconnect-gmail` → `action = "gmail_disconnected"`, confirm = `"disconnect gmail"`
     - `/api/settings/danger/disconnect-slack` → `action = "slack_disconnected"`, confirm = `"disconnect slack"`
     - `/api/settings/danger/disconnect-twilio` → `action = "twilio_disconnected"`, confirm = `"disconnect twilio"`
     - `/api/settings/danger/delete-account` → `action = "account_deleted"`, confirm = coach's own email (lower-case compared)

   - Body: `{ confirmPhrase: z.string() }`.
   - Server-side compare confirm phrase against expected. Return 400 if mismatch.
   - Per action:
     - Disconnect Gmail: UPDATE integrations SET status='disconnected', vault_secret_id=NULL WHERE coach_id=auth.uid() AND provider='gmail'. Then call `supabaseAdmin.rpc('delete_vault_secret', { secret_id })` if applicable to fully clear the Vault entry (verify the existing helper from Phase 1).
     - Disconnect Slack: same shape with provider='slack'.
     - Disconnect Twilio: same shape with provider='twilio'.
     - Delete account: send final email via Resend to the coach + alert Daniel (djn203040@gmail.com) — then DELETE FROM coaches WHERE id = auth.uid(). FK cascades clear leads/drafts/etc. Per CONTEXT.md Specifics — uses existing ON DELETE CASCADE chains.
   - On every action: `writeAuditLog({ coachId, action, metadata, ipAddress: request.ip, userAgent: request.headers.get('user-agent') })`.
   - Return `{ ok: true }`.
   - DO NOT echo `confirmPhrase` or any Vault secret IDs in response or logs.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -10</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web test -- --run apps/web/tests/unit/settings apps/web/tests/unit/storage apps/web/tests/unit/audit 2>&1 | tail -20 || echo "MISSING — Wave 0 must create apps/web/tests/unit/{settings,storage,audit}/ first; add now"</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "sharp" apps/web/lib/storage/avatars.ts && grep -q "Content-Length" apps/web/app/api/settings/profile/avatar/route.ts && grep -q "5242880\|5_242_880" apps/web/app/api/settings/profile/avatar/route.ts</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "disconnect gmail" apps/web/app/api/settings/danger/\[action\]/route.ts && grep -q "writeAuditLog\|audit_log" apps/web/app/api/settings/danger/\[action\]/route.ts</automated>
  </verify>
  <done>
    All three helpers, two schemas, and three API routes exist. Avatar route rejects oversize early. Danger route writes audit_log on every action and refuses wrong confirm phrases. Profile PATCH Zod-validates every field.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Rewrite /settings page with 6 sections, lift sub-route components, redirect stubs + next.config.ts</name>
  <files>apps/web/app/(dashboard)/settings/page.tsx, apps/web/app/(dashboard)/settings/autonomous/page.tsx, apps/web/app/(dashboard)/settings/notifications/page.tsx, apps/web/app/(dashboard)/settings/voice/page.tsx, apps/web/components/settings/SettingsNav.tsx, apps/web/components/settings/ProfileSection.tsx, apps/web/components/settings/NotificationsSection.tsx, apps/web/components/settings/AutonomousSection.tsx, apps/web/components/settings/VoiceSection.tsx, apps/web/components/settings/IntegrationsSection.tsx, apps/web/components/settings/DangerZone.tsx, apps/web/next.config.ts</files>
  <behavior>
    - Test: `/settings` renders 6 sections with `<section id="profile|notifications|autonomous|voice|integrations|danger">` in that exact order
    - Test: clicking each pill in SettingsNav smooth-scrolls to its section
    - Test: GET `/settings/autonomous` returns 308/301 redirect to `/settings#autonomous`
    - Test: GET `/settings/notifications` redirects to `/settings#notifications`
    - Test: GET `/settings/voice` redirects to `/settings#voice`
    - Test: ProfileSection autosaves on blur after 500ms; toast renders
    - Test: DangerZone confirm button disabled until input matches expected phrase verbatim
    - Test: DangerZone delete-account confirm requires lower-cased coach email
    - Test: IntegrationsSection shows Gmail / Slack / Twilio / Calendar connection cards
  </behavior>
  <action>
1. Rewrite `apps/web/app/(dashboard)/settings/page.tsx` as a server component. Fetch coach + integrations + notification_preferences via `createClient()`. Render `<SettingsNav />` (sticky top, anchor pills) followed by six sections in order with explicit `id` attributes:

```tsx
<section id="profile" className="scroll-mt-24"><ProfileSection coach={coach} /></section>
<section id="notifications" className="scroll-mt-24"><NotificationsSection prefs={prefs} /></section>
<section id="autonomous" className="scroll-mt-24"><AutonomousSection coach={coach} /></section>
<section id="voice" className="scroll-mt-24"><VoiceSection coach={coach} /></section>
<section id="integrations" className="scroll-mt-24"><IntegrationsSection integrations={integrations} /></section>
<section id="danger" className="scroll-mt-24"><DangerZone coach={coach} /></section>
```

Wrap in project's ErrorBoundary pattern. Use `scroll-mt-24` (Tailwind `scroll-margin-top`) to offset for sticky AppShell header.

2. Create `apps/web/components/settings/SettingsNav.tsx` (client component): sticky top, 6 anchor pills (chip-style per RESEARCH.md Open Question 2 recommendation — NOT left-rail). Glass-frosted styling matching dashboard chrome. On click, `scrollIntoView({ behavior: "smooth" })`.

3. Create `apps/web/components/settings/ProfileSection.tsx`. Server component for static data + client island `ProfileForm` for the form. ProfileForm uses `useAutosave` per field. Autosave POSTs to `/api/settings/profile`. Fields per D-14:
   - Avatar uploader (`<input type="file" accept="image/jpeg,image/png,image/webp">`). On change POST to `/api/settings/profile/avatar`. Optimistic preview + loading state.
   - Display name (defaults to `coach.name`).
   - Role / title.
   - Timezone: searchable dropdown of `Intl.supportedValuesOf('timeZone')`; auto-detect default via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
   - Working hours: two time-of-day inputs, default `09:00`–`18:00`.
   - Email signature: textarea, max 2000 chars.
   - Public booking URL: validated as URL.
   Component < 200 lines (split form into sub-fields if needed).

4. Create `apps/web/components/settings/NotificationsSection.tsx`. Move current `/settings/notifications/page.tsx` body into this component per RESEARCH.md "lift, don't rewrite". The Phase 4 NotificationMatrix client component stays as-is.

5. Create `apps/web/components/settings/AutonomousSection.tsx`. Move current `/settings/autonomous/page.tsx` body. Phase 4 autonomous-mode RadioGroup + confirm modal stays as-is.

6. Create `apps/web/components/settings/VoiceSection.tsx`. Move current `/settings/voice/page.tsx` body. VoiceBuilderClient stays as-is.

7. Create `apps/web/components/settings/IntegrationsSection.tsx`. Render existing IntegrationHealthCard (Phase 1) for Gmail + Calendar + Slack + Twilio. No new wiring — just consolidation under one heading.

8. Create `apps/web/components/settings/DangerZone.tsx` (client component). Three "Disconnect" cards (Gmail, Slack, Twilio) + one "Delete account" card. Each card uses radix-ui AlertDialog. Inside the dialog, a controlled Input that must exactly match the magic phrase before the confirm button enables.
   Confirm phrases (case-sensitive — server also case-sensitive):
   - "disconnect gmail"
   - "disconnect slack"
   - "disconnect twilio"
   - `coach.email` for delete account
   On confirm, POST to `/api/settings/danger/<slug>` with `{ confirmPhrase }`. Loading state. On success, toast + reload integrations list (or sign coach out for delete-account). Red-tinted (warm — NOT neon — per CLAUDE.md) accent.

9. Convert legacy sub-routes to thin server redirects (per RESEARCH.md Pitfall 7 — DELETE-or-redirect; choosing in-route redirect stubs to be defensive against future bookmark caching):
```tsx
// apps/web/app/(dashboard)/settings/autonomous/page.tsx
import { redirect } from "next/navigation";
export default function Page() { redirect("/settings#autonomous"); }
```
   Same for `/settings/notifications/page.tsx` → `/settings#notifications`, `/settings/voice/page.tsx` → `/settings#voice`.

10. Edit `apps/web/next.config.ts` to add static redirects:
```ts
async redirects() {
  return [
    { source: '/settings/autonomous',    destination: '/settings#autonomous',    permanent: true },
    { source: '/settings/notifications', destination: '/settings#notifications', permanent: true },
    { source: '/settings/voice',         destination: '/settings#voice',         permanent: true },
  ];
}
```
Merge with any existing `redirects()` callback.

11. **Working-hours impact on drafts** (per RESEARCH.md Workstream 3): Phase 3's draft scheduler uses a working-window heuristic. Update the scheduler to read `coaches.working_hours` instead of a global constant. Find via:
```bash
grep -rn "working.*hours\|business.*hours\|09:00" apps/web/lib/ packages/
```
One-line change: replace constant with per-coach lookup. If scheduler is more complex, document in summary and flag for follow-up; do NOT block this plan.
  </action>
  <verify>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && pnpm --filter web exec tsc --noEmit 2>&1 | tail -10</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && for id in profile notifications autonomous voice integrations danger; do grep -q "id=\"$id\"" "apps/web/app/(dashboard)/settings/page.tsx" || (echo "MISSING section id=$id" && exit 1); done</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && grep -q "settings#autonomous" "apps/web/app/(dashboard)/settings/autonomous/page.tsx" && grep -q "redirects" apps/web/next.config.ts</automated>
    <automated>cd /Users/augustavesterlyngvilsoe/Desktop/Claude\ code/Program\ for\ coaches && for f in apps/web/components/settings/SettingsNav.tsx apps/web/components/settings/ProfileSection.tsx apps/web/components/settings/NotificationsSection.tsx apps/web/components/settings/AutonomousSection.tsx apps/web/components/settings/VoiceSection.tsx apps/web/components/settings/IntegrationsSection.tsx apps/web/components/settings/DangerZone.tsx; do test -f "$f" && lc=$(wc -l < "$f"); if [ "$lc" -gt 200 ]; then echo "$f OVER 200 LINES ($lc)"; exit 1; fi; done</automated>
  </verify>
  <done>
    /settings renders six sections in locked order with sticky anchor pill nav. Legacy sub-routes resolve via both next.config.ts redirect and in-route redirect stub. Profile autosaves all 7 fields. Danger zone requires exact type-to-confirm. Every settings section under 200 lines.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Settings consolidation human verification</name>
  <what-built>
    - Migration 20260520000004_phase5_polish.sql applied to live Supabase (project ktxgtpvilrydmedvzgft)
    - /settings rewritten as single page with six sections in locked order
    - Profile section with avatar upload (sharp 512x512 webp), display name, role, timezone, working hours, signature, booking URL
    - Danger zone with type-to-confirm for disconnect gmail/slack/twilio and delete account
    - audit_log writes on every danger action
    - Legacy /settings/{autonomous,notifications,voice} 301-redirect to anchors
  </what-built>
  <how-to-verify>
    1. Verify migration applied: `supabase db diff --linked` should show no pending changes after push.
    2. Visit /settings — confirm 6 sections render in order: Profile → Notifications → Autonomous → Voice → Integrations → Danger zone.
    3. Click each SettingsNav pill — confirm smooth scroll lands on the correct section (sticky header offset working).
    4. Profile section:
       - Upload a 4MB jpeg avatar; confirm it lands as 512x512 webp (DevTools network panel shows mimetype).
       - Upload a 6MB jpeg; confirm 413.
       - Upload a .gif; confirm 415.
       - Change display name → blur → wait 500ms → "Saved" toast.
       - Change timezone via dropdown → autosave fires.
       - Set public booking URL to "not-a-url" → save fails with validation error.
       - Set to "https://cal.com/coach-test" → save succeeds.
    5. /settings/autonomous → confirm 308/301 redirect to /settings#autonomous; scrolls to that section.
    6. Same for /settings/notifications and /settings/voice.
    7. Danger zone:
       - Click Disconnect Gmail → type "Disconnect Gmail" (capitals) → confirm stays disabled.
       - Type "disconnect gmail" (lower-case) → confirm enables.
       - Click confirm → verify:
         - integrations row for gmail flips to status="disconnected"
         - Vault secret cleared
         - audit_log row inserted with action="gmail_disconnected"
       - Repeat for Slack and Twilio (use separate test coach if needed).
    8. Delete-account: type coach's own email exactly → confirm. Verify:
       - Final email received (Resend dashboard)
       - Alert email to djn203040@gmail.com received
       - Coach row deleted (cascades clear leads/drafts)
       - Note: audit_log entries cascade-delete with coach (ON DELETE CASCADE on coach_id FK). If Daniel wants persistent audit history post-delete, flag for follow-up migration to ON DELETE SET NULL.
    9. As Daniel via admin impersonation (if available): visit a different coach's audit_log via raw query — confirm RLS prevents reading their rows when SELECT is scoped to authenticated.
    10. Inspect server logs during disconnect — confirm zero console.log of vault_secret_id or any Vault content (COMPLY-009).
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Coach session → settings APIs | All settings mutations require authenticated session and are scoped to auth.uid() server-side. |
| Coach session → avatar upload | Server-mediated (Pitfall 8): client uploads to Next route, not directly to Supabase Storage. Service role handles bucket write. |
| Coach session → danger zone | Triple-gated: explicit phrase match (client UX), server-side phrase comparison (security), audit_log write. |
| Service role → audit_log | Service role bypasses RLS to INSERT. Authenticated SELECT scoped to own coach_id; INSERT not granted to authenticated. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-03-01 | Tampering | profile PATCH | mitigate | ProfilePatchSchema validates every field via Zod. public_booking_url checked as URL. working_hours regex-matched. timezone validated against Intl.DateTimeFormat constructor. RLS scopes UPDATE to own row. |
| T-05-03-02 | Denial of Service | avatar upload | mitigate | Content-Length checked before reading body (Pitfall 4). Hard 5MB cap. sharp resize is bounded compute (512x512 output regardless of input). |
| T-05-03-03 | Information Disclosure | avatar bucket | mitigate | Bucket is public-read (avatars are intentionally public). Writes RLS-scoped to storage.foldername(name)[1] = auth.uid()::text — coach can only write their own folder. |
| T-05-03-04 | Spoofing | danger zone confirm bypass | mitigate | Server-side string compare against expected phrase. Client UX disable is cosmetic; server check is the real gate. |
| T-05-03-05 | Elevation of Privilege | disconnect another coach's integration | mitigate | UPDATE integrations WHERE coach_id = auth.uid() — RLS enforces scope. |
| T-05-03-06 | Information Disclosure | Vault secret IDs in logs | mitigate | writeAuditLog never console.logs metadata. Disconnect routes do not echo vault_secret_id. COMPLY-009 compliance verified. |
| T-05-03-07 | Repudiation | danger actions disputed by coach | mitigate | audit_log captures coach_id, action, metadata, ip_address, user_agent, created_at. Append-only by policy. |
| T-05-03-08 | Tampering | audit_log tampering | mitigate | Append-only RLS — no UPDATE/DELETE policies for authenticated; INSERT only via service role. |
| T-05-03-09 | Information Disclosure | audit_log cross-tenant leak | mitigate | SELECT policy: coach_id = (SELECT auth.uid()). Verified via Plan 05-04 cross-tenant-isolation E2E. |
| T-05-03-10 | Spoofing | delete_account by attacker with coach's session | mitigate | Requires typing coach's own email verbatim. For higher security, future phase could add re-auth challenge (deferred). |
| T-05-03-11 | Information Disclosure | regenerated types include sensitive columns | accept | Types are checked in; no Vault secrets are columns (Vault uses UUID references only). New coach columns are non-sensitive. |
</threat_model>

<verification>
- pnpm --filter web exec tsc --noEmit — zero errors
- Migration applied to live Supabase; audit_log and coach-avatars bucket visible in Supabase Dashboard
- Regenerated packages/database/types.ts includes onboarding_completed_at, onboarding_progress, audit_log, etc.
- Unit tests pass: autosave debounce, avatar resize, audit log write, profile zod, danger phrase compare
- Manual checkpoint completed (all 10 sub-steps)
- Plan 05-04 settings-save.spec.ts and cross-tenant-isolation.spec.ts cover regression
- /impeccable audit against all 7 settings components (Plan 05-05)
</verification>

<success_criteria>
- D-12 satisfied: single /settings page with 6 sections in locked order
- D-13 satisfied: legacy sub-routes 301-redirect to anchors
- D-14 satisfied: Profile section ships all 7 fields with proper validation + storage
- D-15 satisfied: Danger zone type-to-confirm + audit_log on every action
- D-16 satisfied: autosave on blur with 500ms debounce + sonner toast
- D-22 satisfied: migration deployed with all 7 coach columns + audit_log + coach-avatars bucket + RLS policies
- Phase 5 exit criterion (implicit, via D-22 unblocking Plan 05-02): "settings save" Playwright test passes (covered in Plan 05-04)
</success_criteria>

<output>
After completion, create .planning/phases/05-polish/05-03-SUMMARY.md summarizing:
- Migration applied (timestamp 20260520000004_phase5_polish.sql; CONTEXT.md's proposed timestamp collided with Phase 4 — used next free slot)
- Whether coaches.timezone was net-new or already existed
- Whether the working-hours scheduler hook was wired or deferred
- Files lifted from sub-routes vs. files newly authored
- Component inventory for Plan 05 Impeccable sweep
- audit_log FK cascade behavior on coach delete (cascades — entries die with coach; flag if Daniel wants persistent audit history post-deletion)
</output>

## Dependencies

- **No upstream dependencies.** This is Wave 1. Migration BLOCKS Plans 05-02 (reads onboarding_* columns) and the E2E suite in 05-04 (settings-save spec).
- **Blocks Plan 05-02:** Hard — Plan 05-02 cannot ship without coaches.onboarding_completed_at and coaches.onboarding_progress.
- **Blocks Plan 05-04:** Hard — tests/e2e/settings-save.spec.ts exercises the new sections.
- **Blocks Plan 05-05:** Soft — Impeccable sweep needs the new components to exist before auditing them.

## Risks + Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Migration timestamp collision broke supabase db push | Caught during plan — using 20260520000004_phase5_polish.sql | Move file to next free slot if 0004 also collides at execute time |
| coaches.timezone already exists | Migration uses ADD COLUMN IF NOT EXISTS | No-op if already present |
| Settings sub-route page files shadow the redirect (Pitfall 7) | Both next.config.ts redirect AND in-route redirect stubs added | Defensive double-mitigation |
| Avatar bucket policy auth.uid() returns null at fresh login (Pitfall 8) | Avatar upload is server-mediated via API route, NOT direct browser → bucket | Documented constraint |
| audit_log entries cascade-deleted when coach deleted | FK ON DELETE CASCADE means audit trail dies with coach — flagged in checkpoint | If Daniel wants persistence: follow-up migration to ON DELETE SET NULL |
| Working-hours scheduler wiring more complex than one-line change | Document deferral in summary; do not block plan | Scheduler still uses global window until follow-up |
