---
phase: 06-testing
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/security.yml
  - .gitleaks.toml
  - apps/web/next.config.ts
  - apps/web/middleware.ts
  - apps/web/lib/security/
  - apps/web/lib/ratelimit/
  - apps/web/lib/logging/redact.ts
  - apps/web/lib/audit/
  - apps/web/tests/security/
  - apps/web/sentry.client.config.ts  # beforeSend body only — scaffold from 06-01
  - apps/web/sentry.server.config.ts  # beforeSend body only — scaffold from 06-01
  - apps/web/.eslintrc.cjs            # no-console rule (sole owner)
  - apps/web/app/api/account/export/route.ts
  - apps/web/app/api/account/delete/route.ts
  - apps/web/components/settings/DangerZone.tsx
  - supabase/migrations/
  - SECURITY.md
  - docs/runbooks/
  - docs/privacy-policy.md
  - docs/terms-of-service.md
  - .env.example
  - .github/dependabot.yml
autonomous: false
requirements:
  - "Section 3 of 06-PLAN.md (3.1 through 3.16)"

must_haves:
  truths:
    - "`gitleaks detect --source . --no-git` returns zero findings"
    - "`gitleaks detect --source .` (full git history) returns zero findings, or every finding is documented and rotated"
    - "Every public Supabase table has RLS enabled and policies scoped by coach_id"
    - "Cross-tenant penetration test (programmatic) confirms coach A cannot read/write coach B's data"
    - "All 14 webhook sources verify signatures; forged payloads return 401"
    - "All OAuth tokens stored in Supabase Vault — no plaintext token columns in public schema"
    - "Browser security headers set: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy"
    - "Rate limiting in place on auth, drafts/generate, webhooks, review/[token], unsubscribe"
    - "`pnpm audit` returns zero high or critical vulnerabilities"
    - "SECURITY.md exists; key rotation procedure documented per provider"
    - "Privacy policy and terms of service live and linked from the app"
    - "`/security-review` skill run against full codebase produces zero unaddressed findings"
    - "CI runs gitleaks + pnpm audit on every PR and blocks merge on critical findings"
    - "All admin actions (create/revoke coach) written to audit_log table"
    - "Voice corpus JSONB encrypted via pgsodium or Vault wrapping; anon SELECT returns ciphertext (§3.2)"
    - "GDPR endpoints exist: GET /api/account/export streams a full data archive; POST /api/account/delete cascades cleanly and is type-to-confirm gated (§3.9)"
    - "Every FK referencing coaches(id) has ON DELETE CASCADE confirmed by audit migration"
  artifacts:
    - path: ".gitleaks.toml"
      provides: "Project-level allowlist + rules"
    - path: ".github/workflows/security.yml"
      provides: "CI gates: gitleaks, pnpm audit, optional OWASP ZAP weekly"
    - path: "apps/web/middleware.ts"
      provides: "Edge middleware setting CSP/HSTS/X-Frame headers + rate-limit invocation"
    - path: "apps/web/lib/security/"
      provides: "Helpers: HMAC verification, replay protection, CORS allowlist, SSRF guard"
    - path: "apps/web/lib/ratelimit/"
      provides: "Upstash-backed rate limiters keyed by route + identity"
    - path: "apps/web/tests/security/"
      provides: "Cross-tenant pen-test, forged-webhook test, CSP/header assertions"
    - path: "SECURITY.md"
      provides: "Vulnerability reporting + key rotation runbooks"
    - path: "docs/runbooks/"
      provides: "Incident runbooks (coach unauthorized access, key leak, Supabase compromise)"
    - path: "supabase/migrations/{ts}_audit_log.sql"
      provides: "audit_log table + insert policies"
  key_links:
    - from: ".github/workflows/security.yml"
      to: ".gitleaks.toml + pnpm audit + tests/security/"
      via: "CI jobs"
      pattern: "tests/security/.*\\.test\\.ts"
---

<objective>
Section 3 of 06-PLAN.md is the launch-blocker. This plan executes every check in §3.1 through §3.16 and produces the evidence trail: green CI, passing pen-tests, documented runbooks, signed compliance docs.

This is not new functionality — it is verification + remediation + headers/policies + audit log. Most of the security primitives already exist (RLS, Vault, webhook signature checks, rate limiting). This plan proves they are correct, complete, and gating.

Output:
- gitleaks CI gate + full history scan
- Browser security headers via middleware + next.config.ts
- Rate-limit coverage audit + remediation
- Webhook signature verification audit (all 14 sources) + tests
- RLS cross-tenant pen-test (programmatic, exhaustive)
- pnpm audit + Dependabot setup
- Admin audit log (audit_log table + write paths)
- SECURITY.md + privacy/ToS docs + incident runbooks
- /security-review skill run on full codebase
- All §3 boxes checked
</objective>

<execution_context>
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/workflows/execute-plan.md
@/Users/augustavesterlyngvilsoe/Desktop/Claude code/Program for coaches/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/06-testing/06-PLAN.md
@CLAUDE.md

<interfaces>
<!-- Webhook source registry — all 14 must verify signatures -->
Calendar (7): Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal
Communication (4): Slack (X-Slack-Signature), Resend (Svix), Twilio (X-Twilio-Signature), Gmail Pub/Sub (JWT vs Google JWKS)
Transcripts (2): Fireflies, Zoom
Workflow (1): Inngest (signing key)

<!-- Header policy (target values) -->
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{NONCE}' https://cal.com https://app.cal.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.resend.com https://*.inngest.com wss://*.supabase.co; frame-src https://app.cal.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()

<!-- Rate limit targets (Upstash sliding window) -->
/api/auth/*           : 10 / 1m / IP
/api/drafts/generate  : 20 / 1h / coach
/api/webhooks/*       : 100 / 1m / source-IP
/api/review/[token]   : 5 / 5m / token
/api/unsubscribe      : 10 / 1m / IP
/api/health           : 30 / 1m / IP

<!-- RLS pen-test pattern -->
For every table in public schema:
  asCoach(A).from(table).select() // returns only A's rows
  asCoach(A).from(table).insert({ coach_id: B }) // rejected
  asCoach(A).from(table).update({ ... }).eq('coach_id', B) // affects 0 rows
  asCoach(A).from(table).delete().eq('coach_id', B) // affects 0 rows

<!-- /security-review usage -->
Invoke the `security-review` skill (installed in this repo per CLAUDE.md) against the working tree. Produces findings list. Every finding either fixed in this plan or documented with explicit accept-with-reason in SECURITY.md.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Secrets audit + gitleaks CI gate + .env.example</name>
  <files>.gitleaks.toml, .github/workflows/security.yml, .env.example, .gitignore</files>
  <action>
1. Add `.gitleaks.toml` with default rules + allowlist for known false positives (test fixtures, .env.example placeholders).
2. Run two scans locally:
   ```bash
   gitleaks detect --source . --no-git --report-path .planning/phases/06-testing/security-scan-working-tree.json --report-format json
   gitleaks detect --source . --report-path .planning/phases/06-testing/security-scan-history.json --report-format json
   ```
3. For every finding:
   - If true positive in working tree: remove the secret + rotate at provider + commit removal.
   - If in git history: document in SECURITY.md, rotate at provider, optionally rewrite history (Daniel decision).
4. Verify `.env.example` exists with placeholder values for every var the app reads. Run `grep -oE "process\.env\.[A-Z_]+" apps/web -r | awk -F. '{print $3}' | sort -u` and confirm every var has a placeholder line.
5. Verify `.gitignore` includes `.env`, `.env.local`, `.env.*.local`, and any `secrets/` dir.
6. Audit `NEXT_PUBLIC_*` env vars: list them, confirm each is safe to expose (anon keys, URLs, public site config only — no API tokens).
7. Add CI job `gitleaks` to `.github/workflows/security.yml`:
   ```yaml
   gitleaks:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
         with: { fetch-depth: 0 }
       - uses: gitleaks/gitleaks-action@v2
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```
   Set as a required status check.
8. Verify client bundles do not contain server secrets:
   ```bash
   pnpm --filter web build
   for prefix in "sk-ant-" "SUPABASE_SERVICE_ROLE_KEY" "TWILIO_AUTH_TOKEN" "RESEND_API_KEY" "SLACK_SIGNING_SECRET" "INNGEST_SIGNING_KEY" "UPSTASH_REDIS_REST_TOKEN" "GMAIL_CLIENT_SECRET"; do
     grep -rE "$prefix" apps/web/.next/static 2>/dev/null && echo "LEAK: $prefix" || echo "ok: $prefix"
   done
   ```
   All must be `ok`. If any leak, the responsible client file uses the secret incorrectly — fix by moving to a server-only module.
  </action>
  <verify>
    <automated>gitleaks detect --source . --no-git --redact 2>&1 | tail -5</automated>
    <automated>test -f .env.example && test -f .gitleaks.toml && test -f .github/workflows/security.yml</automated>
    <automated>grep -q "gitleaks" .github/workflows/security.yml</automated>
  </verify>
  <done>
    Zero working-tree gitleaks findings. Full history scan documented (findings rotated). .env.example covers every required env var. CI gates merges on gitleaks.
  </done>
</task>

<task type="auto">
  <name>Task 2: Browser security headers + CORS + middleware</name>
  <files>apps/web/middleware.ts, apps/web/next.config.ts, apps/web/lib/security/csp.ts, apps/web/tests/security/headers.test.ts</files>
  <action>
1. Build CSP generator at apps/web/lib/security/csp.ts: returns the policy string with a per-request nonce. Export `applyCspNonce(headers, nonce)`.
2. Edit apps/web/middleware.ts to set every header from the interfaces block on every response. Use a fresh nonce per request; expose via `x-csp-nonce` so server components can read it.
3. Update next.config.ts `headers()` for static asset responses (fallback when middleware does not run on /_next/static). HSTS goes here.
4. CORS: for every `/api/webhooks/*` route, set `Access-Control-Allow-Origin` only to the specific provider's origin or deny entirely (webhooks should not be browser-callable). Document in `apps/web/lib/security/cors.ts`.
5. SRI: audit any `<Script src="https://...">` in app — confirm `integrity` attribute is set for the Cal.com embed if it loads via CDN.
6. Open-redirect guard: search for any `searchParams.get('redirect')` usage; route through `apps/web/lib/security/safe-redirect.ts` that validates against an allowlist of internal paths.
7. Write tests at apps/web/tests/security/headers.test.ts (integration-style with fetch against `next start`):
   - GET / returns CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
   - CSP includes `'nonce-...'` and `frame-ancestors 'none'`
   - HSTS includes `max-age=63072000; includeSubDomains; preload`
   - Cookies on / response have `HttpOnly`, `Secure`, `SameSite=Lax`
   - GET /api/webhooks/calendly with `Origin: https://evil.com` → no CORS allow header
  </action>
  <verify>
    <automated>grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Referrer-Policy|Permissions-Policy|Content-Security-Policy)" apps/web/middleware.ts | wc -l | awk '{ if ($1 >= 6) print "ok"; else print "missing headers" }'</automated>
    <automated>pnpm --filter web test:integration -- tests/security/headers.test.ts --run 2>&1 | tail -5</automated>
  </verify>
  <done>
    All 6 required browser security headers set on every response. CSP uses nonces, no `unsafe-inline` for scripts. Webhook CORS denies browsers. Tests prove all of the above.
  </done>
</task>

<task type="auto">
  <name>Task 3: Webhook signature verification audit + tests</name>
  <files>apps/web/lib/security/verify-*.ts, apps/web/tests/security/webhook-signatures.test.ts</files>
  <action>
1. Inventory every webhook receiver under `apps/web/app/api/webhooks/*` and `apps/web/app/api/*/webhook*`. Expected: 14 sources per interfaces block.
2. For each source, confirm:
   - Signature verification is the FIRST action after parsing headers (before reading body for processing)
   - Replay protection: timestamp from header is within 5 minutes of `Date.now()` (where the provider sends one — Slack, Twilio, Stripe-style HMAC schemes)
   - Idempotency: external event ID stored in a `webhook_events` table with unique constraint; duplicate IDs return 200 without reprocessing
3. If any source is missing verification, replay check, or idempotency: add it. Use existing helpers in apps/web/lib/security/verify-*.ts; create if missing.
4. Write apps/web/tests/security/webhook-signatures.test.ts — one describe per source, three assertions each:
   - Valid signature + fresh timestamp → 200
   - Invalid signature → 401
   - Stale timestamp (>5 min old) → 401 (skip for sources without timestamp)
5. For Gmail Pub/Sub: verify the push JWT against Google's published JWKS (cache JWKS for 1h). Test with a forged JWT → 401.
6. Document each source's signature scheme in a table at `apps/web/lib/security/README.md`.
  </action>
  <verify>
    <automated>find apps/web/app/api -type d -name "webhook*" -o -name "*webhook*" | wc -l | awk '{ if ($1 >= 14) print "ok: " $1; else print "expected 14 webhook routes, found " $1 }'</automated>
    <automated>pnpm --filter web test:integration -- tests/security/webhook-signatures.test.ts --run 2>&1 | grep -E "(passed|failed)" | tail -3</automated>
    <automated>grep -rE "(verifySignature|verifySlackSignature|verifyTwilioSignature|verifyCalendlySignature|verifyResendSignature)" apps/web/app/api | wc -l</automated>
  </verify>
  <done>
    All 14 webhook sources verify signatures, check timestamps where applicable, and are idempotent. Tests exercise valid + forged + stale payloads.
  </done>
</task>

<task type="auto">
  <name>Task 4: RLS pen-test + Vault audit</name>
  <files>apps/web/tests/security/rls-pen-test.test.ts, apps/web/tests/security/vault-tokens.test.ts</files>
  <action>
1. Programmatic RLS pen-test at apps/web/tests/security/rls-pen-test.test.ts:
   - Setup: 2 coaches (A, B), 3 leads each, 2 drafts each, 1 integration each.
   - For every table in `information_schema.tables WHERE table_schema = 'public'`:
     - Confirm `relrowsecurity = true` via system catalog query
     - Confirm at least one SELECT, INSERT, UPDATE, DELETE policy filters by `coach_id = auth.uid()` (or joins through one)
     - Run the 4 attempted-cross-tenant operations as coach A targeting B's coach_id; assert each returns 0 rows / 0 affected / RLS denial
   - Confirm Daniel's admin override (if any) is SELECT-only and limited to the admin role
   - Confirm service-role client is not exposed via any client-bundle import (grep `.next/static`)
2. Vault audit at apps/web/tests/security/vault-tokens.test.ts:
   - Query `pg_tables` for any column named like `%_token%`, `%access_token%`, `%refresh_token%`, `%api_key%`, `%secret%` in public schema. Fail if any return rows (must be in Vault, not public).
   - Insert a Vault row via service-role; confirm anon client cannot read it.
   - Confirm `decrypted_secrets` view (vault wrapper) is not exposed via any RPC callable by anon.
3. **Voice corpus encryption (§3.2):**
   - Inspect the `voice_models` table (and any `voice_examples`/`voice_corpus`). The Layer 2 examples may contain real lead-side content quoted in messages.
   - If the JSONB column is not wrapped via pgsodium/Vault: add a migration `supabase/migrations/{ts}_voice_corpus_encryption.sql` that pgsodium-encrypts the examples column with a per-coach key, and update apps/web/lib/voice/ to encrypt-on-write + decrypt-on-read via service role only.
   - Test: insert a corpus row as service role; confirm anon SELECT returns ciphertext / nothing; confirm decryption produces the original.
4. Fix any failures. If a table needs RLS added retroactively, write a migration `supabase/migrations/{ts}_rls_hardening.sql`.
  </action>
  <verify>
    <automated>pnpm --filter web test:integration -- tests/security/rls-pen-test.test.ts --run 2>&1 | tail -10</automated>
    <automated>pnpm --filter web test:integration -- tests/security/vault-tokens.test.ts --run 2>&1 | tail -5</automated>
  </verify>
  <done>
    Every public table has RLS + 4 policies. Cross-tenant attempts blocked. No plaintext token columns. Vault secrets unreachable via anon. Tests prove all of the above.
  </done>
</task>

<task type="auto">
  <name>Task 5: Rate limit coverage + auth hardening</name>
  <files>apps/web/lib/ratelimit/*, apps/web/app/api/*/route.ts (audit), apps/web/middleware.ts, apps/web/tests/security/rate-limit.test.ts</files>
  <action>
1. Inventory existing rate limiters at apps/web/lib/ratelimit/. Confirm coverage of all routes listed in the interfaces block. Add missing ones.
2. Audit auth:
   - Supabase Auth dashboard: signups disabled, only invite flow enabled.
   - Session cookies: `HttpOnly: true`, `Secure: true`, `SameSite: 'lax'` (check Supabase SSR helper config).
   - Session expiry capped at 7 days with refresh token rotation.
   - `/admin` middleware enforces email match `djn203040@gmail.com` AND a role flag (defense in depth). Test: non-admin → 403.
   - Logout invalidates server-side (calls `supabase.auth.signOut({ scope: 'global' })`).
   - MFA available in Supabase Auth — confirm TOTP factor type is enabled in Supabase dashboard auth settings and the UI surface exists in Settings → Security for coaches to opt in. **Daniel's personal TOTP enrollment is deferred to 06-03 UAT §2.8 (Autonomous Modes section, paired with security review of /settings).**
   - Test revoked-coach lockout: revoke coach A's session via service role; coach A next request → 401 within 30s.
3. Rate-limit tests at apps/web/tests/security/rate-limit.test.ts:
   - Hammer /api/auth/login from one IP 11 times in 60s → 11th returns 429.
   - Hammer /api/drafts/generate 21 times in 1h → 21st returns 429.
   - /api/review/[token] 6 times in 5m → 6th returns 429.
4. Anthropic cost guard: confirm /api/drafts/generate refuses if monthly token spend per coach exceeds a configurable cap (env or settings). Add a simple counter table if missing.
  </action>
  <verify>
    <automated>find apps/web/lib/ratelimit -name "*.ts" | wc -l | awk '{ if ($1 >= 1) print "ok"; else print "missing" }'</automated>
    <automated>pnpm --filter web test:integration -- tests/security/rate-limit.test.ts --run 2>&1 | tail -5</automated>
    <automated>grep -rE "(HttpOnly|httpOnly)" apps/web/lib 2>/dev/null | head -3</automated>
  </verify>
  <done>
    Every route in the interfaces table has a rate limiter. Auth cookies hardened. /admin double-gates. MFA available. Revoked coach locked out <30s. Tests prove rate limits trigger.
  </done>
</task>

<task type="auto">
  <name>Task 6: PII redaction + Sentry/Inngest log audit</name>
  <files>apps/web/lib/logging/redact.ts, apps/web/sentry.{client,server}.config.ts, apps/web/tests/security/pii-redaction.test.ts</files>
  <action>
1. Build a redactor at apps/web/lib/logging/redact.ts:
   - Recursively walks an object
   - Replaces values for keys matching `email|phone|name|first_name|last_name|address|ip` with `[REDACTED]`
   - Strips obvious email patterns from string values (`\b[\w.+-]+@[\w.-]+\.\w+\b` → `[email]`)
   - Strips obvious E.164 phone patterns
2. Wire into Sentry `beforeSend` (both client + server configs). Confirm with a unit test that a fixture payload with email/phone is scrubbed.
3. Audit Inngest events: every `step.run` that logs an object should run it through `redact()` first. Add a helper `logSafe(step, label, data)` in apps/web/lib/logging/.
4. Audit Vercel logs: grep apps/web for `console.log` usage. Replace with `logger.info()` (a small wrapper that calls redact). Add the eslint rule `no-console: error` (allow `warn` and `error` only, both of which go through the wrapper).
5. Test apps/web/tests/security/pii-redaction.test.ts:
   - Fixture payload `{ user: { email, phone, name }, meta: { trace: "user@x.com" } }` → all PII redacted
   - Edge case: nested arrays of leads in an Inngest event payload
  </action>
  <verify>
    <automated>test -f apps/web/lib/logging/redact.ts && grep -q "REDACTED" apps/web/lib/logging/redact.ts</automated>
    <automated>pnpm --filter web test:unit -- tests/security/pii-redaction.test.ts --run 2>&1 | tail -3</automated>
    <automated>grep -rE "console\.log" apps/web/app apps/web/lib apps/web/components 2>/dev/null | grep -v ".test." | wc -l | awk '{ if ($1 == 0) print "ok"; else print "console.log count: " $1 }'</automated>
  </verify>
  <done>
    Redactor in place. Sentry + Inngest + Vercel logs scrub PII. Zero raw `console.log` in production code. Tests confirm scrubbing.
  </done>
</task>

<task type="auto">
  <name>Task 6.5: GDPR data export + account deletion endpoints (§3.9)</name>
  <files>apps/web/app/api/account/export/route.ts, apps/web/app/api/account/delete/route.ts, apps/web/components/settings/DangerZone.tsx (verify), apps/web/tests/integration/gdpr.test.ts, supabase/migrations/{ts}_cascade_audit.sql</files>
  <action>
**Ordering note:** This task references the `auditLog()` helper. If Task 7 has not been executed yet, do step 0 first.

0. **If `apps/web/lib/audit/write.ts` does not yet exist**, build the minimal helper inline before continuing (its full table + Dependabot setup remains in Task 7):
   - Create `apps/web/lib/audit/write.ts` exporting `auditLog({ actor, action, targetType, targetId, metadata })` that writes to the `audit_log` table via service role.
   - Create the `audit_log` migration referenced in Task 7 step 1 if not yet committed.
   - Task 7 then becomes Dependabot + pnpm audit + license audit only (the table + helper are already shipped).

1. Build GET `/api/account/export`:
   - Authenticated coach only; rate-limited (1/hour/coach via Upstash)
   - Aggregates: coach profile, leads, drafts, integrations (token references only — NOT the unwrapped tokens), sequence history, voice corpus (Layer 1 profile + decrypted Layer 2 examples), notification preferences, audit_log entries scoped to this coach
   - Returns a streamed application/zip or application/json archive
   - Logs an audit_log entry `action='gdpr_export'`
2. Build POST `/api/account/delete`:
   - Authenticated coach only; require type-to-confirm via JSON body `{ confirmPhrase: 'DELETE MY ACCOUNT <email>' }`
   - Server-side phrase check (constant-time compare)
   - Deletes via service-role: coaches row → cascades through leads, drafts, integrations, voice_models, sequence_runs, notification_preferences, uat_results
   - Revokes Supabase Auth user via admin API
   - Audit entry `action='gdpr_delete'` written BEFORE the cascade (logged forever even after coach row gone)
3. Cascade audit migration:
   - Walk every FK in public schema referencing `coaches(id)`. Confirm `ON DELETE CASCADE` is set on each.
   - For any FK without cascade: add a migration `supabase/migrations/{ts}_cascade_audit.sql` that alters the constraint.
   - Document the full cascade tree in `SECURITY.md` (which tables drop when a coach deletes).
4. Surface in /settings → Danger Zone:
   - "Export all my data" button → calls export endpoint → downloads archive
   - "Delete my account" button → opens confirm modal with type-to-confirm
   - Both wired to existing DangerZone.tsx from Phase 5; just plug in the routes.
5. Integration test apps/web/tests/integration/gdpr.test.ts:
   - Seed a coach + 5 leads + 10 drafts + 2 integrations
   - Hit export endpoint; assert archive contains every entity
   - Hit delete endpoint with correct phrase; assert all rows cascaded to 0
   - Audit log preserves the gdpr_export + gdpr_delete entries after cascade (because audit_log has no coach FK to coaches; it stores email as text)
  </action>
  <verify>
    <automated>test -f apps/web/app/api/account/export/route.ts && test -f apps/web/app/api/account/delete/route.ts</automated>
    <automated>pnpm --filter web test:integration -- tests/integration/gdpr.test.ts --run 2>&1 | tail -5</automated>
    <automated>grep -q "gdpr_export\|gdpr_delete" apps/web/app/api/account/export/route.ts apps/web/app/api/account/delete/route.ts</automated>
  </verify>
  <done>
    GDPR export + delete endpoints live. Cascade FKs audited. DangerZone wired. Tests prove export completeness and clean cascade. §3.9 satisfied.
  </done>
</task>

<task type="auto">
  <name>Task 7: Admin audit log + dependency audit + Dependabot</name>
  <files>supabase/migrations/{ts}_audit_log.sql, apps/web/lib/audit/*, .github/dependabot.yml, .github/workflows/security.yml</files>
  <action>
1. Migration `supabase/migrations/{ts}_audit_log.sql`:
   ```sql
   create table audit_log (
     id bigint generated always as identity primary key,
     actor_id uuid not null,
     actor_email text not null,
     action text not null,
     target_type text not null,
     target_id uuid,
     metadata jsonb,
     created_at timestamptz default now()
   );
   alter table audit_log enable row level security;
   create policy "admin reads all" on audit_log for select to authenticated using (auth.jwt() ->> 'email' = 'djn203040@gmail.com');
   create policy "no client writes" on audit_log for insert to authenticated with check (false);
   ```
   Inserts go through a service-role API only.
2. Helper apps/web/lib/audit/write.ts: `auditLog({ actor, action, targetType, targetId, metadata })`. Use from every admin route that mutates state (create coach, revoke coach, reassign integration, etc.).
3. Dependabot config `.github/dependabot.yml`:
   ```yaml
   version: 2
   updates:
     - package-ecosystem: npm
       directory: "/"
       schedule: { interval: weekly }
       open-pull-requests-limit: 5
     - package-ecosystem: github-actions
       directory: "/"
       schedule: { interval: weekly }
   ```
4. Add `audit` job to `.github/workflows/security.yml`:
   ```yaml
   audit:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - uses: pnpm/action-setup@v3
       - run: pnpm install --frozen-lockfile
       - run: pnpm audit --audit-level=high
   ```
   Block merge on high or critical findings.
5. Run `pnpm audit` locally; remediate any high/critical by updating, replacing, or documenting an explicit accept-with-reason in SECURITY.md.
6. License audit: run `pnpm licenses list --prod` and confirm no GPL/AGPL in production deps. Document approved licenses in SECURITY.md.
  </action>
  <verify>
    <automated>ls supabase/migrations | grep audit_log</automated>
    <automated>grep -q "audit" .github/workflows/security.yml && test -f .github/dependabot.yml</automated>
    <automated>pnpm audit --audit-level=high 2>&1 | tail -3</automated>
  </verify>
  <done>
    audit_log table live + RLS enforced + helper integrated into admin routes. Dependabot active. pnpm audit clean. Licenses approved.
  </done>
</task>

<task type="auto">
  <name>Task 8: Compliance docs + incident runbooks + SECURITY.md</name>
  <files>SECURITY.md, docs/privacy-policy.md, docs/terms-of-service.md, docs/runbooks/*</files>
  <action>
1. Write `SECURITY.md` at repo root:
   - How to report a vulnerability (email + PGP key optional)
   - Disclosure timeline
   - Key rotation runbook per provider (Anthropic, Supabase, Gmail OAuth client, Twilio, Slack, Resend, Inngest, Upstash, Calendly/Cal.com/Acuity/Setmore/Square/MS Bookings/TidyCal, Fireflies, Zoom)
   - License policy (which OSS licenses are permitted in production)
2. Write `docs/privacy-policy.md`:
   - Data collected (coach: profile, OAuth tokens, voice corpus; lead: contact details, transcripts, sequence history)
   - Sub-processors: Vercel, Supabase, Anthropic, Gmail, Twilio, Slack, Resend, Inngest, Upstash, calendar providers
   - Retention: leads purged 90 days after `do_not_contact` set; coach can request full export or deletion any time
   - GDPR rights: access, rectification, erasure, portability
   - Contact: privacy@... (use Daniel's email or a forwarder)
3. Link from app: footer of /dashboard, /onboarding, and locked module sell pages.
4. Write `docs/terms-of-service.md`: standard SaaS terms adapted for the managed-service model (Daniel operates; coaches use). Plain language, no boilerplate fluff.
5. Runbooks at `docs/runbooks/`:
   - `coach-unauthorized-access.md` — steps when a coach reports unauthorized access
   - `key-leak.md` — steps to rotate each provider's key; order of operations
   - `supabase-compromise.md` — escalation, data exfiltration assessment, restore from PITR
   - `oauth-app-suspension.md` — Google/Slack app review failures, recovery path
6. Add a Data Processing Addendum template at `docs/dpa-template.md` for B2B coaches who request one.
7. Cookie consent: review with Daniel — if any coach is in EU/UK, add a consent banner. For now, document the decision in SECURITY.md.
8. OAuth app review: confirm Google Gmail app review submitted (HEALTH-008). Slack app distribution: defer to Phase 7 if not needed for v1.
  </action>
  <verify>
    <automated>test -f SECURITY.md && test -f docs/privacy-policy.md && test -f docs/terms-of-service.md</automated>
    <automated>ls docs/runbooks/ | wc -l | awk '{ if ($1 >= 4) print "ok"; else print "missing runbooks" }'</automated>
    <automated>grep -rE "(privacy-policy|terms-of-service)" apps/web/components apps/web/app 2>/dev/null | head -3</automated>
  </verify>
  <done>
    SECURITY.md, privacy policy, ToS, and 4+ runbooks all written. Privacy + ToS linked from app footer.
  </done>
</task>

<task type="auto">
  <name>Task 9: Run /security-review + remediate findings</name>
  <files>.planning/phases/06-testing/SECURITY-REVIEW.md, plus any code fixes from findings</files>
  <action>
1. Invoke the `security-review` skill (per CLAUDE.md, installed in this repo) against the working tree.
2. Capture findings into `.planning/phases/06-testing/SECURITY-REVIEW.md`.
3. For every finding:
   - High/critical: fix in this plan. No exceptions.
   - Medium: fix or document accept-with-reason in SECURITY.md.
   - Low/info: document in SECURITY-REVIEW.md as backlog.
4. Re-run /security-review until zero unaddressed high/critical.
5. Add a CI job `security-review` to `.github/workflows/security.yml` that runs OWASP ZAP baseline scan against the Vercel preview URL weekly (scheduled cron, not per-PR).
  </action>
  <verify>
    <automated>test -f .planning/phases/06-testing/SECURITY-REVIEW.md && grep -E "(HIGH|CRITICAL)" .planning/phases/06-testing/SECURITY-REVIEW.md | grep -v "FIXED" | wc -l | awk '{ if ($1 == 0) print "ok"; else print "open high/critical: " $1 }'</automated>
  </verify>
  <done>
    /security-review produces zero unaddressed high or critical findings. Medium findings documented. OWASP ZAP weekly scheduled.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 10: Section 3 sign-off review</name>
  <what-built>
    - gitleaks gate + .env.example complete + history scan clean
    - 6 browser security headers via middleware
    - 14 webhook sources verify signatures + timestamp + idempotency
    - RLS pen-test passes for every public table
    - Vault audit passes (no plaintext tokens)
    - Rate limits cover 6 critical route groups
    - PII redactor wired into Sentry, Inngest, app logs
    - audit_log table + admin write paths
    - Dependabot + pnpm audit clean
    - SECURITY.md + privacy + ToS + 4 runbooks
    - /security-review zero unaddressed high/critical
  </what-built>
  <how-to-verify>
    1. Run `gitleaks detect --source . --no-git` — zero findings.
    2. curl -sI https://{preview-url} | grep -E "(Strict-Transport-Security|Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Referrer-Policy|Permissions-Policy)" — all six present.
    3. Submit a forged Calendly webhook (wrong signature) to preview → 401. Repeat for Slack, Twilio, Gmail Pub/Sub.
    4. Sign in as test coach A. Open browser devtools, attempt `supabase.from('leads').select('*').eq('coach_id', '{B-uuid}')` — returns 0 rows.
    5. Hammer /api/auth/login 11 times — 11th returns 429.
    6. Trigger Sentry error from app with email in payload — Sentry dashboard shows `[REDACTED]`.
    7. As Daniel, create a coach via admin → check `audit_log` table has a row with `action='create_coach'`.
    8. Open SECURITY.md, privacy-policy.md, terms-of-service.md, and each runbook — read for clarity + correctness.
    9. Confirm `.planning/phases/06-testing/SECURITY-REVIEW.md` shows zero open HIGH/CRITICAL.
    10. Spot-check 5 boxes from 06-PLAN.md §3.1–§3.16 — each maps to a concrete artifact built here.
  </how-to-verify>
  <resume-signal>Type "approved" or list any §3 boxes still uncovered</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| External webhook source → API | Signature verification gates. Replay window 5 min. Idempotent by external event ID. |
| Coach session → API | RLS enforces tenant isolation; rate limits prevent abuse; CSP + headers prevent client tampering. |
| Daniel admin → mutation | All mutations write to audit_log. /admin double-gates by email + role. |
| Repo → CI runner | Secrets injected via GitHub Actions secrets store; gitleaks confirms no committed secrets. |
| App → Sentry/Inngest/Vercel logs | beforeSend + redactor strip PII before egress. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-02-01 | Spoofing | Forged webhook claiming to be from Calendly | mitigate | HMAC signature + 5-min replay window. Test covers forged + stale. |
| T-06-02-02 | Tampering | Cross-tenant write via direct Supabase client | mitigate | RLS pen-test asserts 0 affected rows on cross-tenant attempt. |
| T-06-02-03 | Repudiation | Daniel revokes a coach; coach claims access continued | mitigate | audit_log records action + actor + timestamp. RLS lockout asserted <30s. |
| T-06-02-04 | Information Disclosure | OAuth tokens leaked via SQL injection or RLS bypass | mitigate | Tokens in Vault only. Vault audit test asserts no plaintext columns. |
| T-06-02-05 | Information Disclosure | PII in Sentry / Vercel logs | mitigate | Redactor + Sentry beforeSend test asserts scrubbing on fixture. |
| T-06-02-06 | DoS | Anthropic cost runaway via /api/drafts/generate | mitigate | Per-coach rate limit + monthly token cap. |
| T-06-02-07 | DoS | Webhook flood from compromised provider | mitigate | Per-source-IP rate limit on /api/webhooks/*. |
| T-06-02-08 | Elevation of Privilege | Non-admin reaches /admin via crafted JWT | mitigate | Middleware double-gates by email + role. Test forces non-admin → 403. |
| T-06-02-09 | Information Disclosure | Secret committed to git history | mitigate | gitleaks history scan + provider rotation procedure in SECURITY.md. |
| T-06-02-10 | Tampering | Open redirect via ?redirect= param | mitigate | safe-redirect.ts validates against internal path allowlist. |
</threat_model>

<verification>
- gitleaks clean working tree; history findings documented + rotated
- 6 security headers on every response (verified by integration test)
- 14 webhook sources verify signatures (verified by integration test)
- RLS + Vault pen-tests green
- 6 route groups rate-limited (verified by integration test)
- PII redactor scrubs fixture payloads (verified by unit test)
- audit_log table receives writes for admin actions
- pnpm audit zero high/critical
- /security-review zero unaddressed high/critical
- SECURITY.md, privacy, ToS, 4+ runbooks present
- Every §3 box in 06-PLAN.md maps to a concrete artifact
- Human-verify checkpoint passed
</verification>

<success_criteria>
- Section 3 of 06-PLAN.md is fully verified — launch-blocker cleared
- CI gates on gitleaks + pnpm audit + security tests
- Daniel can answer "is this secure enough to onboard a real coach?" with yes + evidence
</success_criteria>

<output>
After completion, create `.planning/phases/06-testing/06-02-SUMMARY.md`:
- gitleaks scan results (working tree + history)
- Headers set, with the policy strings
- Webhook sources audit: 14/14 verified
- RLS pen-test: tables covered, attempts blocked
- Vault audit: 0 plaintext token columns
- Rate-limit coverage table
- PII redaction: fixtures scrubbed
- audit_log row count from a sample admin action
- pnpm audit: 0 high/critical
- /security-review: 0 open high/critical
- Doc trail: SECURITY.md, privacy, ToS, 4 runbooks
- Any deferrals + reasons
</output>

## Dependencies

- **No hard dep on 06-01.** Can run in parallel; minimal file overlap (CI workflow file is the only shared edit — coordinate via additive sections).
- **Sequential lock on `.github/workflows/test.yml` vs `security.yml`:** keep security in its own file to avoid merge conflicts.
- **Blocks Phase 6 exit.** Section 3 sign-off requires this plan complete.

## Risks + Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| CSP breaks Cal.com embed or Supabase Realtime | Test in staging first; allowlist exact origins | Loosen specific directive; document the loosening in SECURITY.md |
| RLS pen-test finds a missing policy late | Migration to add the policy is small and reversible | Revert migration; coach blocked from feature until policy correct |
| gitleaks history scan finds a real leaked key | Rotate at provider first, then optionally rewrite history with Daniel approval | Provider-side rotation alone is sufficient; history rewrite is optional |
| /security-review finds a critical we can't fix in time | Daniel-approved temporary mitigation (rate limit, feature flag off) + dated fix-by | Disable the affected route until fixed |
| Dependabot floods with PRs | Limit to 5 open + group security patches | Disable temporarily, run manual audit |
| Browser headers break OAuth popups (Gmail, Slack) | `frame-ancestors 'none'` does not affect popups; verify with manual flow | Adjust `frame-src` allowlist as needed |
