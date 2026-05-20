# Impeccable Audit — ProfileForm

**File:** `apps/web/components/settings/ProfileForm.tsx`
**Audited:** 2026-05-21
**Score:** 14/20 → **17/20 after fixes**

## Findings

### RED
- Multiple `<Label>` elements not associated with their inputs via `htmlFor`/`id` — screen readers cannot determine which label belongs to which field:
  - "Display name" → **Fix:** Added `htmlFor="pf-display-name"` to Label, `id="pf-display-name"` to Input
  - "Role / title" → **Fix:** Added `htmlFor="pf-role-title"` + `id="pf-role-title"`
  - "Timezone" → **Fix:** Added `htmlFor="pf-timezone"` + `id="pf-timezone"`
  - "Working hours" start → **Fix:** Added `htmlFor="pf-work-start"` + `id="pf-work-start"`
  - "Working hours" end → **Fix:** Added `id="pf-work-end"` to input
  - "Public booking URL" → **Fix:** Added `htmlFor="pf-booking-url"` + `id="pf-booking-url"`
  - "Email signature" → **Fix:** Added `htmlFor="pf-signature"` + `id="pf-signature"`
  
  All fixes applied in `apps/web/components/settings/ProfileForm.tsx`.

### YELLOW (fixed)
_None beyond the RED fix above._

### YELLOW (deferred)
- `<img src={avatarUrl} ...>` — using native `<img>` instead of Next.js `<Image>` loses optimisation (lazy loading, srcSet, WebP conversion). **Reason:** Avatar URLs are user-supplied storage URLs from Supabase; Next.js Image requires remote host configuration. Migrate in Phase 6 after adding the Supabase storage domain to `next.config.js`. **Owner:** Phase 6.
- `bookingUrl` autosave silently rejects (no toast) when URL doesn't start with "http". **Reason:** The validation rejection is silent — UI doesn't give feedback. Adding a toast is trivial but testing the autosave hook interaction is non-trivial. **Owner:** Backlog.

### GREEN
- Client component justified ✅
- `useAutosave` for debounced auto-save ✅
- Avatar upload with file type acceptance (`image/jpeg,image/png,image/webp`) ✅
- Loading state during avatar upload ✅
- `maxLength={2000}` with character counter on signature ✅
- No sensitive data logged ✅
- Under 200 lines (190) ✅
