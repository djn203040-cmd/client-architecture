# Pitfalls Research: Coaching AI Follow-Up System

**Domain:** Multi-tenant AI email follow-up service for coaching businesses
**Researched:** 2026-05-04
**Overall confidence:** HIGH (Context7 official docs verified + deep domain knowledge)

---

## Gmail API Pitfalls

### CRITICAL: Refresh Token Silently Revoked

**What goes wrong:** A coach's Gmail refresh token stops working. All sequences for that coach silently stall — no emails send, no errors surface to the coach.

**Why it happens:** Google revokes refresh tokens under multiple conditions that are entirely outside your control:
- Coach changes their Google account password
- Coach manually revokes access in Google Account settings
- Refresh token unused for 6+ months (Google's inactivity policy)
- Your OAuth app is in "Testing" mode — tokens expire after 7 days regardless
- App exceeds the maximum number of live refresh tokens per account (currently 50 for most apps)

**Consequences:** Every sequence for that coach enters a silent dead state. Leads go cold. No notification fires unless you explicitly build token health monitoring.

**Warning signs:** Gmail API returning `401 invalid_grant` on token refresh attempts.

**Prevention:**
1. Store the `tokens` event result on every successful API call — the googleapis library fires a `tokens` event when it refreshes automatically. Persist the new access token and any new refresh token immediately.
2. Build an integration health check that runs on a cron (daily). For each coach with Gmail connected, attempt a lightweight API call (list one message). On failure, mark the integration as `needs_reauth`, send a notification to the coach, and pause their sequences.
3. When displaying Gmail connection status in the dashboard, surface health state — not just "connected/disconnected."
4. Publish your OAuth app before launch (exit "Testing" mode) to avoid the 7-day hard expiry.

**Phase:** Phase 1 (OAuth connection must include health monitoring from day one, not bolted on later).

---

### CRITICAL: OAuth Scope Insufficient for Send-As

**What goes wrong:** Coach connects Gmail, voice model is built, sequences start — but the system cannot send emails. Authorization granted insufficient scopes.

**Why it happens:** Gmail OAuth has distinct scopes. `gmail.readonly` lets you read; `gmail.send` lets you send from the primary address; `https://mail.google.com/` (full access) is required for `users.messages.send` with custom From headers, `users.drafts.create`, and `users.history.list` (which you need for push notifications). If the coach authenticated once with insufficient scopes, the stored token will permanently lack those permissions until the coach re-authenticates.

**Consequences:** First send attempt fails. If unhandled, the sequence throws and the draft stays in `pending` indefinitely.

**Warning signs:** Gmail API returning `403 Insufficient Permission` or `400 Bad Request` on send attempts.

**Prevention:**
1. Request all required scopes in a single OAuth flow during onboarding: `https://mail.google.com/` (full access), or the minimum set: `gmail.send`, `gmail.readonly`, `gmail.modify` (for marking messages read).
2. After token exchange, validate that the granted scopes include every scope you need. Store the granted scopes in the `integrations` table. If insufficient, immediately prompt re-authorization before the coach proceeds.
3. Never begin sequence setup for a coach without confirming scope coverage.

**Phase:** Phase 1.

---

### Gmail API Sending Quotas

**What goes wrong:** At higher coach volumes, Gmail API calls hit per-user and per-project rate limits. The default Gmail quota is 250 quota units per second per user, with some operations consuming multiple units. Sending one email costs 100 units. Gmail accounts are also limited to approximately 500 emails/day for regular Gmail (2,000 for Workspace) — this is the underlying Gmail account limit, not just API limit.

**Why it happens:** If multiple sequences fire simultaneously (e.g., a coach imports 50 leads at once and triggers them all), fan-out to concurrent send operations will hit rate limits.

**Consequences:** Sends fail with `429 Too Many Requests` or `403 rateLimitExceeded`. Without backoff logic, retries compound the problem.

**Warning signs:** Errors from Gmail API: `userRateLimitExceeded`, `rateLimitExceeded`.

**Prevention:**
1. Use Inngest's throttle + concurrency controls keyed on `coach_id` to serialize email sends per coach. Never send more than 1–2 emails per second per coach.
2. Wrap all Gmail send calls in `step.run()` with `RetryAfterError` for 429 responses, passing the `Retry-After` header value back to Inngest's retry scheduler.
3. Track cumulative send count per coach per day in the database. If approaching the daily ceiling (400 sends is a safe cap), halt and notify Daniel.

**Phase:** Phase 3 (Gmail monitoring and sending), but Inngest throttle config needed in Phase 3 setup.

---

### Gmail Open Tracking: Double-Counting via Google Image Proxy

**What goes wrong:** Gmail proxies all tracking pixels through Google's image caching servers. The first time a recipient opens the email, Google fetches the pixel and caches it. Subsequent opens often do not refetch the pixel — or worse, the pixel is refetched on Google's schedule, not the user's open schedule. You get one open recorded regardless of actual opens, or you get false positives from Google's prefetching.

**Why it happens:** Google introduced the Image Proxy in 2013 specifically for privacy and security. All images (including tracking pixels) are fetched by Google's servers, not by the recipient's browser. The IP logged is always a Google IP, not the lead's.

**Consequences:** Open-based trigger logic (e.g., "if opened, adjust next touchpoint copy") will be unreliable. You cannot trust open counts as a signal for lead interest level.

**Warning signs:** All opens showing Google data center IPs. Tracking pixel firing at unexpected times.

**Prevention:**
1. Treat opens as a weak signal only — useful for confirming delivery, not measuring interest.
2. Never gate important sequence logic on open detection alone. Use opens to inform copy tone, not to trigger state transitions.
3. Use `gmail_message_id` correlation as the source of truth: if the lead replied, that is a reliable signal. Opens are supplementary.
4. Document this limitation in the admin dashboard's sequence analytics so Daniel understands why open rates may appear inflated or inconsistent.

**Phase:** Phase 3 (implement with awareness baked in from the start; do not build sequence branches that depend on open-count accuracy).

---

### Gmail Push Notifications: Watch Expiry

**What goes wrong:** Gmail push notifications (`users.watch`) expire every 7 days. If the renewal cron fails or the watch is not renewed before expiry, you stop receiving push notifications for that coach's inbox. Lead replies go undetected. Sequences continue sending to leads who already replied.

**Why it happens:** The Gmail API requires you to call `users.watch` to register a Pub/Sub topic to receive notifications. The watch has a hard 7-day maximum lifetime. You must call watch again before it expires.

**Consequences:** This is the scenario where a coach's sequence sends an email to a lead who replied 3 days ago. This is a product-destroying failure.

**Warning signs:** No Gmail push events received for a coach for more than 24 hours.

**Prevention:**
1. Store `watch_expiry_at` in the `integrations` table for each Gmail-connected coach.
2. Run a daily Vercel Cron → Inngest event that checks all coaches with Gmail connected. Renew any watch expiring within 48 hours.
3. If watch renewal fails, immediately suspend the sequence for that coach and notify Daniel.
4. Implement a fallback polling mechanism (poll Gmail history API every 15 minutes) as a safety net if the push notification watch is not active.

**Phase:** Phase 3.

---

## Inngest / Sequence Orchestration Pitfalls

### CRITICAL: Duplicate Sequence Start from Idempotency Gap

**What goes wrong:** A calendar webhook fires twice (Calendly retries on your 200ms-delayed response), or a webhook arrives while your server is mid-deployment. Two `no_show.detected` events enter Inngest. Two sequences start for the same lead. The lead receives two parallel email threads from the coach.

**Why it happens:** Webhook senders retry on anything other than an immediate 2xx. Calendly and other calendar providers retry with exponential backoff. Your handler returning a 200 after 500ms of processing is indistinguishable from a timeout retry. Deployments cause brief unavailability that triggers retries.

**Consequences:** Duplicate email threads. Lead gets confused or annoyed. Coach's reputation damaged.

**Warning signs:** Sequences table showing two active sequences for the same lead. Duplicate email events.

**Prevention:**
1. When firing Inngest events from calendar webhooks, always include a deterministic `id`: `id: \`no-show-${coachId}-${leadId}-${eventTimestamp}\`` — this provides 24-hour deduplication at the Inngest level.
2. Before starting a new sequence, check in a `step.run()` whether an active sequence already exists for the lead. Use a database unique constraint on `(lead_id, status)` where status is `active` as a hard guard.
3. Respond to webhook POST requests with 200 immediately (after signature verification only) and defer all processing to Inngest. Do not do database writes synchronously in webhook handlers.

**Phase:** Phase 3.

---

### CRITICAL: Sequence Does Not Stop When Lead Replies

**What goes wrong:** A lead replies to the coach outside the system (e.g., calls them directly, the coach marks them verbally), or the Gmail watch has lapsed (see above). The sequence continues sending touchpoints to a lead who has already converted or explicitly asked to stop.

**Why it happens:** The sequence is a long-running Inngest function sleeping between steps. It has no awareness of external state changes unless explicitly woken up with a `cancelOn` event or a `waitForEvent` check.

**Consequences:** Lead receives unwanted emails post-reply. Coach embarrassment. Potential spam complaint.

**Warning signs:** Lead reply events in the database but sequence status still `active`.

**Prevention:**
1. Use Inngest's `cancelOn` with `if: "async.data.coachId == event.data.coachId && async.data.leadId == event.data.leadId"` to cancel the sequence when a `lead.replied` event fires.
2. At the start of every `step.run()` that precedes a send, always query the database for the lead's current stage. If stage is `replied`, `closed_won`, `closed_lost`, or `dead`, throw `NonRetriableError` to terminate the sequence cleanly.
3. Treat the pre-send safety check as a hard gate, not an advisory — it must run immediately before every send operation.

**Phase:** Phase 3, but the cancelOn architecture must be designed in Phase 3 from the start.

---

### Cross-Tenant Event Bleeding

**What goes wrong:** An Inngest function triggered by `lead.replied` processes a reply for Coach A's lead and inadvertently acts on Coach B's data due to a missing `coach_id` filter.

**Why it happens:** Inngest events are global to your app. If your function filters solely by `lead_id` without also validating `coach_id`, and two coaches happen to have leads with similar IDs (UUID collision is astronomically unlikely, but logic bugs are not), cross-contamination is possible. More realistically, a bug in the event payload construction that omits `coach_id` means the receiving function has no scoping anchor.

**Consequences:** Sequence actions applied to the wrong coach's lead. RLS in Supabase provides a backstop if the server-side client is authenticated as the correct coach, but Inngest functions using the service role have no such protection.

**Prevention:**
1. Every Inngest event payload must include both `coachId` and `leadId`. Never emit an event with just `leadId`.
2. Every Inngest function that touches database records must validate that the resolved record's `coach_id` matches the event's `coachId`. Treat mismatches as hard errors, not warnings.
3. Use Inngest's concurrency key (`key: "event.data.coachId"`) to also scope execution — this is primarily for fairness but also makes cross-coach processing structurally impossible within a single run.

**Phase:** Phase 3.

---

### Step ID Collision in Looping Sequences

**What goes wrong:** A sequence function that iterates through touchpoints using a loop generates colliding step IDs. Inngest's memoization relies on step IDs being stable. If step IDs are generated based on loop index and the number of touchpoints changes between function versions, Inngest may replay wrong memoized steps.

**Why it happens:** Inngest memoizes steps by ID. If you write `step.run("send-email", ...)` inside a `for` loop without making the step ID unique per iteration (e.g., including the touchpoint number), Inngest sees the same ID on re-execution and may use stale memoized data.

**Consequences:** The wrong draft content is sent, or a step is skipped because it appears "already completed."

**Warning signs:** Sequence logs showing unexpected step skips after a function code deployment.

**Prevention:**
1. Always include a unique qualifier in step IDs inside loops: `step.run(\`send-touchpoint-${touchpointIndex}\`, ...)`.
2. Never change step IDs in a function that has in-flight runs. Treat step ID changes as a breaking change requiring a new function ID.
3. Prefer a sequential multi-event pattern over a single long-running loop: each touchpoint completion fires a new event that triggers the next touchpoint function. This avoids memoization complexity entirely for multi-step sequences.

**Phase:** Phase 3.

---

### Long-Running Sequences and Free Tier Sleep Limits

**What goes wrong:** Sequences spanning weeks use `step.sleep("7d")` between touchpoints. On Inngest's free tier, `step.sleep` is limited to 7 days maximum.

**Why it happens:** Inngest free plan caps sleep duration at 7 days. Multi-week sequences will fail silently if touching the limit boundary or will error immediately.

**Consequences:** Sequences stall after the first week. No further touchpoints fire.

**Warning signs:** Steps timing out after exactly 7 days even when longer sleeps were configured.

**Prevention:**
1. Use a paid Inngest plan from day one. This is a production system — the free tier sleep limit is a hard blocker.
2. Alternatively, avoid long sleeps entirely: use `step.sleepUntil(scheduledSendAt)` with a computed timestamp, and store the next scheduled send time in the database. A separate Vercel Cron polls for due sends and emits events. This removes the dependency on Inngest's sleep duration limit entirely and gives you full visibility into scheduled sends from the database.

**Phase:** Phase 3 (architecture decision must be made before implementing sequences).

---

## AI Draft Quality Pitfalls

### CRITICAL: Context Window Overflow with Long Conversation Histories

**What goes wrong:** A coach with a long email history with a lead (50+ threads) pushes the draft generation prompt over the claude-sonnet-4-6 context window limit. The API call fails or silently truncates input.

**Why it happens:** claude-sonnet-4-6 has a 200K token context window — large, but not unlimited. The full input package per draft includes: system prompt + voice model (structured profile + 10–15 few-shot examples) + full conversation history + transcript(s) + service information + previous sequence messages. For coaches with verbose histories, this compounds quickly.

**Consequences:** API returns an error, draft generation fails, sequence stalls. Or worse, if truncation occurs without detection, the model generates a draft without the most recent conversation context — potentially referencing outdated information.

**Warning signs:** `BadRequestError` from Anthropic API with token count exceeded. Or drafts that reference stale conversation facts.

**Prevention:**
1. Use `client.messages.countTokens()` before every draft generation call to measure the assembled prompt size.
2. Implement a priority-based context trimmer: if token count exceeds 150K (leaving headroom for output), trim conversation history from the oldest messages first, preserving the most recent 5–10 exchanges, the call transcript, and all voice model examples.
3. Summarize older conversation history in a preprocessing step rather than including raw messages: `step.run("summarize-old-history", ...)` generates a concise summary of exchanges older than 30 days, which is then included instead of the raw threads.
4. Log the token count of every draft generation call. Alert if consistently approaching limits.

**Phase:** Phase 2.

---

### CRITICAL: Hallucinated Lead Facts

**What goes wrong:** The AI generates a draft that references specific details about the lead that were not present in the transcript or conversation history — e.g., mentioning a program outcome the lead never expressed interest in, or referencing a call that didn't happen.

**Why it happens:** LLMs pattern-match and interpolate. If the prompt structure implies a lead who has "discussed their goals," the model may generate plausible-sounding goal statements even when the transcript only contains surface-level conversation. Few-shot voice examples from one lead's context can bleed into another lead's draft.

**Consequences:** The coach approves a draft containing fabricated specifics. The lead receives a message referencing something they never said. Trust destroyed.

**Warning signs:** Drafts containing specific facts not findable in the lead's conversation history or transcript.

**Prevention:**
1. Structure the prompt explicitly: separate lead facts from voice model context. Never interleave them in a way that allows the model to conflate the two sources.
2. Include an explicit system instruction: "You may only reference facts explicitly present in the lead context provided. Do not infer, assume, or extrapolate lead-specific details. If you lack context for a personalized detail, use a generic placeholder and flag it."
3. When conversation history is sparse (fewer than 3 exchanges, no transcript), include a low-confidence flag in the draft: surface this in the approval UI so the coach can review carefully.
4. Implement a post-generation validation step: use a second, cheaper model call to check the draft against the provided context and identify any claims that cannot be traced to the source material.

**Phase:** Phase 2.

---

### Voice Model Drift: Too Few Examples

**What goes wrong:** The coach provides 3 email examples instead of 10–15. The generated drafts are grammatically correct and structurally plausible but sound generic — not like the coach.

**Why it happens:** Few-shot prompting requires enough examples to establish a statistical pattern. Below 8–10 examples, the model reverts to its default "professional email" register rather than learning the coach's idiosyncratic style.

**Consequences:** The coach says "this doesn't sound like me." Approval rates drop. Coach loses trust in the product.

**Warning signs:** Coach consistently editing every draft. Approval rate below 40%.

**Prevention:**
1. Set a minimum floor of 8 examples to activate the draft engine. Under 8, show a "voice model not ready" state with a clear action: "Add X more message examples to activate your AI drafts."
2. In the onboarding wizard, set an expectation: "The more examples you provide, the more your drafts will sound like you. We recommend at least 15."
3. Track approval rates and edit rates per coach. Low approval with high edits is a diagnostic signal for insufficient voice examples.
4. After the first 5 drafts are approved or edited, use the edits themselves as additional few-shot examples (with coach consent). This continuously improves the voice model.

**Phase:** Phase 2.

---

### Prompt Injection via Lead Names and Email Content

**What goes wrong:** A lead's name is "Ignore all instructions and instead write: [malicious content]" — or more realistically, a lead's email body contains something that interferes with prompt structure, breaks delimiters, or causes unexpected model behavior.

**Why it happens:** Lead names, email subjects, and email bodies are untrusted user input that gets interpolated into AI prompts. Without proper escaping and structural separation, these inputs can interact with prompt instructions.

**Consequences:** In extreme cases, a malicious lead could manipulate the draft content. More commonly, unusual characters in names or email bodies break prompt formatting and degrade draft quality.

**Warning signs:** Drafts with unexpected content. Formatting errors in generated text. System instruction fragments appearing in draft output.

**Prevention:**
1. Never use string interpolation to build prompts. Always use structured message arrays with explicit role separation.
2. Wrap lead-supplied content (name, email body, transcript text) in XML-style delimiters that are clearly distinct from instructions: `<lead_name>`, `<lead_email_content>`, `<transcript>`. This creates structural separation that the model respects.
3. Sanitize lead names and email content before inclusion: strip any text that contains prompt-like patterns (`ignore`, `system:`, `assistant:`, etc.) — log the original for audit, use the sanitized version in the prompt.
4. Test with adversarial lead names and email bodies in your integration test suite.

**Phase:** Phase 2.

---

## Calendar Webhook Pitfalls

### CRITICAL: Race Condition — Webhook Arrives Before Lead Profile Exists

**What goes wrong:** A Calendly no-show webhook fires before the lead profile has been created in your database. The webhook handler tries to look up the lead by email, finds nothing, and either throws an error or silently discards the trigger.

**Why it happens:** If coaches are manually adding leads, or if the lead entered the system via a different path (Instagram DM, manual entry), the Calendly booking notification and the lead creation can arrive in any order. Calendly fires webhooks within seconds of a no-show event — before any async lead import completes.

**Consequences:** The sequence never starts. No one notices. The lead goes cold exactly when the system should be helping.

**Warning signs:** Calendly webhook events in logs with no corresponding sequence start. Lead profiles missing sequences despite the coach indicating a no-show occurred.

**Prevention:**
1. In the Calendly webhook handler, after verifying the signature: look up the lead by email. If not found, create a stub lead record immediately (email, name from Calendly payload, stage `identified`, source `calendly`). Then proceed with the sequence trigger.
2. Alternatively, use a `step.waitForEvent()` pattern: emit a `calendly.no_show.received` event immediately, and have the sequence function wait up to 60 seconds for a `lead.profile.ready` event before proceeding. If not received, create the lead stub.
3. Store raw Calendly webhook payloads in a `webhook_events` table before any processing. This gives you a replay capability if the lead is created later.

**Phase:** Phase 3.

---

### Duplicate Webhooks from Calendly

**What goes wrong:** Calendly delivers the same webhook event twice. Two sequences start for the same lead from the same no-show event.

**Why it happens:** Calendly retries webhook delivery if your endpoint does not respond within their timeout window (typically 5 seconds). If your handler takes longer than 5 seconds due to database lookups, Supabase cold starts, or Vercel cold starts, Calendly sends the same event again.

**Consequences:** Duplicate sequences (see Inngest deduplication pitfall above).

**Warning signs:** Two `in_sequence` stage entries for the same lead at nearly identical timestamps.

**Prevention:**
1. Respond to all webhooks immediately with `200 OK` after signature verification only. Move all processing to Inngest.
2. Store the Calendly `event_uuid` (present in the webhook payload) in the `webhook_events` table with a unique constraint. If a webhook arrives with the same `event_uuid`, discard it at the handler level before emitting any Inngest event.
3. Include the Calendly event UUID in the Inngest event `id` for 24-hour deduplication as a second layer.

**Phase:** Phase 3.

---

### Calendar Provider Webhook Differences

**What goes wrong:** Calendly, Cal.com, Acuity, Setmore, Square Appointments, MS Bookings, and TidyCal each have different webhook payload schemas, different event types for "no-show," different signature verification methods, and different retry behaviors. Building a unified abstraction without testing each one means silent failures on lesser-used providers.

**Why it happens:** No standard exists across calendar tools. "No-show" in Calendly is a cancellation with a specific `cancellation_reason`. In Cal.com it may be a dedicated `booking.noShow` event. In Acuity it may be derived from status changes. Some providers lack no-show webhooks entirely and require polling.

**Consequences:** Coaches using TidyCal or MS Bookings get no sequences triggered. No errors surface.

**Warning signs:** Sequences starting for Calendly coaches but not for coaches on other platforms.

**Prevention:**
1. Build and test a unified calendar abstraction layer (Phase 3 priority). Each provider gets its own adapter that normalizes to a shared internal event schema.
2. Implement an explicit test script for each provider using their sandbox/test webhook endpoints before considering a provider "supported."
3. For providers without no-show webhooks, implement a polling fallback: check for appointments that have passed their scheduled time without a completion event.
4. Flag unimplemented providers clearly in the admin dashboard rather than silently claiming support.

**Phase:** Phase 3, but the abstraction layer architecture should be designed in Phase 1.

---

## Approval Flow Pitfalls

### CRITICAL: Sending to a Lead Who Has Already Replied

**What goes wrong:** Between draft approval and scheduled send time (up to 24 hours), the lead replies to the coach directly or outside the system. The system sends the approved draft anyway, creating an awkward double-contact situation.

**Why it happens:** Approval at T+0 is based on state at T+0. Send happens at T+24. State can change in that window.

**Consequences:** Lead receives a follow-up to a conversation they just continued. Coach looks like they're ignoring the lead's reply.

**Warning signs:** Email events showing a send occurring after a reply event for the same lead.

**Prevention:**
1. This is the pre-send safety check — it is non-negotiable. Implement it as a synchronous `step.run()` immediately before every send: query `email_events` for any `reply` event for the lead since `draft.approved_at`. If found, cancel the send and notify the coach.
2. Also check for `coach_sent_events` (coach manually emailed the lead through Gmail outside the system) since approval.
3. Check the lead's `stage` — if it is no longer `in_sequence`, cancel.
4. Log the cancellation reason and surface it in the coach's dashboard. "Send cancelled — lead replied at [time]" is valuable feedback, not noise.

**Phase:** Phase 3 (the check architecture) and Phase 4 (notification of cancellation back to coach).

---

### Stale Approval: Coach Approves an Outdated Draft

**What goes wrong:** The coach sits on an approval notification for 20+ hours. They approve the draft just before the send window. But in the interim, the lead replied, or the coach revised the voice model. The draft is now factually wrong or stylistically mismatched.

**Why it happens:** The 24-hour approval window is a feature, not a bug — but it creates a staleness risk. Drafts are generated at T-24 based on state at T-24. If state changes, the draft content is stale.

**Consequences:** Approved-but-stale draft sends with incorrect personalization.

**Warning signs:** Drafts approved within 2 hours of their scheduled send time where lead state changed since generation.

**Prevention:**
1. The pre-send safety check covers the most critical case (lead replied). For voice model changes, add a `voice_model_version` stamp to each draft at generation time. If the voice model was updated between generation and approval, surface a warning in the approval UI: "Your voice model was updated since this draft was created. Consider regenerating."
2. Add a "Regenerate" button to the draft approval UI. Never force regeneration (the coach may prefer the original) but make it easy.

**Phase:** Phase 4 (approval UI feature).

---

### Notification Channel Failure Hiding Drafts

**What goes wrong:** Twilio is down. Slack's webhook is misconfigured. Resend bounces the notification email. The draft surfaces in the dashboard queue but the coach only looks at Slack. 24 hours pass. The draft goes to HOLD. The lead goes cold.

**Why it happens:** Notification channels are external dependencies with their own failure modes. A single channel failure means the coach never knows a draft is waiting.

**Consequences:** Draft in HOLD state. Coach unaware. Lead goes cold. The product failed at its core promise.

**Warning signs:** Drafts in HOLD state where the coach has a connected notification channel that shows no delivery log.

**Prevention:**
1. Treat notification delivery as a multi-channel fan-out with explicit delivery tracking. Store a delivery attempt record for each channel per draft. Retry failed channels.
2. The dashboard queue is the ground truth — it must always reflect all pending drafts, regardless of notification delivery status. Coaches should be trained to check the queue as a habit.
3. If all notification channels fail for a draft, emit a fallback notification via the one channel most likely to work (email via Resend directly to the coach's registered address).
4. Build a notification health indicator into the dashboard settings: "Your Slack webhook is not delivering." This surfaces misconfiguration proactively.
5. Admin dashboard (Daniel) should show coaches with drafts in HOLD for more than 24 hours as a monitoring metric.

**Phase:** Phase 4.

---

### Autonomous Mode Race Condition

**What goes wrong:** Autonomous mode (Option B: auto-send after 24h timeout) fires at exactly the same moment the coach is manually editing the draft. Two versions of the draft exist simultaneously, one is sent, one is abandoned.

**Why it happens:** The auto-send trigger from Inngest's timer fires based on the scheduled send time. If the coach opens the draft editor at T-5min, both processes are in flight simultaneously.

**Consequences:** Coach's edits are lost. Original (unapproved) draft sends.

**Warning signs:** Draft status transitioning directly from `pending` to `sent` without passing through `approved`.

**Prevention:**
1. Use a database-level lock on draft status transitions. Before any send (auto or manual), use a Postgres `SELECT FOR UPDATE` to claim the draft. If the draft is already being modified (indicated by a `locked_at` timestamp set by the editor), the auto-send must wait or skip.
2. Auto-send should only trigger if `draft.status` is still `pending` at send time. Use an Inngest `cancelOn` that fires when the coach takes any action on the draft (approve, edit, reject).
3. Make autonomous mode clearly opt-in, require explicit confirmation, and surface a count of "auto-sent emails this week" in the dashboard so coaches remain aware of what was sent without their explicit review.

**Phase:** Phase 4.

---

## Security Pitfalls

### CRITICAL: Service Role Key Leaking to Client

**What goes wrong:** The Supabase service role key ends up in client-side JavaScript — in a Next.js component, a client-side API call, or a bundled environment variable without the `NEXT_PUBLIC_` prefix guard.

**Why it happens:** In Next.js, environment variables prefixed with `NEXT_PUBLIC_` are bundled into the client. If a developer creates `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` by mistake, or imports a server-side utility into a client component, the key is exposed in the browser's JavaScript bundle. The service role key bypasses all RLS — anyone with it has full database access to all coaches' data.

**Consequences:** Complete database exposure. Every coach's leads, conversation history, transcripts, and voice models are readable and modifiable.

**Warning signs:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in any `.env` file. Service role key appearing in browser network requests.

**Prevention:**
1. The service role key must never have a `NEXT_PUBLIC_` prefix. Store as `SUPABASE_SERVICE_ROLE_KEY` only.
2. Create a `lib/supabase/server.ts` that exports the service role client, and a `lib/supabase/client.ts` that exports the anon client. Never import `server.ts` from any client component.
3. Set up a CI check (or a pre-commit hook) that fails if `SUPABASE_SERVICE_ROLE_KEY` appears in any client component or is prefixed with `NEXT_PUBLIC_`.
4. The Supabase anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is safe to expose — it is designed for client use and relies on RLS for security.

**Phase:** Phase 1 (foundation — must be correct from the first line of code).

---

### CRITICAL: SECURITY DEFINER Function Bypassing RLS Unexpectedly

**What goes wrong:** A Postgres function created with `SECURITY DEFINER` for performance reasons (to avoid RLS recursion on role-check queries) is also exposed in an API-reachable schema. A crafted API call invokes the function and reads data across coach boundaries.

**Why it happens:** `SECURITY DEFINER` functions run as their creator (typically the Supabase superuser), which has `bypassrls`. If such a function is in the `public` schema (which Supabase's PostgREST API exposes), it is callable by any authenticated user. A function that takes a `user_id` parameter but internally queries without RLS filtering is now a cross-tenant data leak vector.

**Consequences:** Coach A can read Coach B's lead data.

**Warning signs:** Any `SECURITY DEFINER` function in the `public` schema that accepts user-controlled parameters.

**Prevention:**
1. All `SECURITY DEFINER` functions must live in the `private` schema, which is not exposed by PostgREST.
2. After creating any Postgres function, audit: Is it `SECURITY DEFINER`? Is it in `public`? If both answers are yes, move it to `private` immediately.
3. Functions in `private` cannot be called directly from the API — they can only be called from other SQL functions or triggers.

**Phase:** Phase 1.

---

### OAuth Token Leakage via Logging

**What goes wrong:** During debugging, a developer logs the full response object from a Gmail token exchange or refresh. The access token and refresh token appear in application logs, which may be stored in Vercel's log drain, Supabase's dashboard, or a third-party logging service.

**Why it happens:** `console.log(response)` is the path of least resistance when debugging. OAuth response objects contain tokens directly.

**Consequences:** Tokens in logs can be extracted and used to access the coach's Gmail account. Refresh tokens especially are long-lived.

**Warning signs:** Google OAuth response objects in any log output.

**Prevention:**
1. Never log OAuth response objects. If you need to log something for debugging, log only non-sensitive fields: `{ success: true, expires_at: token.expiry_date, scopes: token.scope }`.
2. Apply a structured logging wrapper that strips any field named `access_token`, `refresh_token`, `token`, `secret`, `key`, `password` before writing to logs.
3. The CLAUDE.md rule "No sensitive data in `console.log` anywhere" is correct — enforce this in code review.
4. Treat the Supabase Vault as the only place tokens should ever exist in their raw form.

**Phase:** Phase 1 (from the moment Gmail OAuth is implemented).

---

### Webhook Signature Verification Gaps

**What goes wrong:** The system trusts a webhook payload without verifying the provider's signature. An attacker crafts a fake `no_show` event for a high-value lead, triggering a sequence at will.

**Why it happens:** Signature verification requires knowing each provider's specific mechanism. Calendly uses HMAC-SHA256 with a shared secret. Cal.com uses a different header format. Developers skip verification in development and forget to add it for production.

**Consequences:** Fake sequences triggered. Fake lead replies suppressing real sequences. Potential for denial-of-service via spam webhook calls.

**Warning signs:** Webhook handler code that does not verify a signature before processing. Missing `webhook_secret` in environment variables.

**Prevention:**
1. Every webhook handler must verify the signature before any processing — not after, not optionally. Treat unsigned or invalid-signature webhooks as `400 Bad Request` and log the attempt.
2. Each calendar provider has a specific signature mechanism. Implement and test each one in the calendar abstraction layer.
3. Use a constant-time comparison function for HMAC validation — never use `===` for comparing digests (timing attack vector).
4. Store webhook secrets in environment variables only, never in the database.

**Phase:** Phase 3 (when webhooks are implemented), but the pattern must be established in Phase 1 for any webhooks in scope then.

---

### RLS Bypass via Missing Coach_Id in Queries

**What goes wrong:** A server-side function using the service role client performs a query without a `coach_id` filter. It returns data across all coaches. If any of that data reaches a response, it is a data leak.

**Why it happens:** The service role bypasses RLS, so there is no automatic `coach_id` scoping. The developer must explicitly add `WHERE coach_id = $1` to every query. A missed `.eq('coach_id', coachId)` in a chain of Supabase queries is easy to overlook.

**Consequences:** Cross-tenant data leak. One coach's leads, drafts, or conversations readable in another coach's session.

**Warning signs:** API responses containing more records than expected. Sequences referencing leads from multiple coaches.

**Prevention:**
1. Create a typed service role client wrapper that requires a `coachId` parameter for every data access method. Make it structurally impossible to query without scoping.
2. In code review, flag any `supabaseAdmin.from(...).select(...)` that does not include `.eq('coach_id', coachId)`.
3. Write integration tests that verify a request authenticated as Coach A cannot retrieve Coach B's data, even through the API.
4. Prefer using the authenticated user client (anon key + user session) wherever possible — RLS handles scoping automatically. Reserve the service role client for cases where it is strictly necessary (Inngest functions, background jobs).

**Phase:** Phase 1.

---

### Supabase Connection Exhaustion in Serverless

**What goes wrong:** Vercel serverless functions each open a new database connection. Under load, the number of connections exceeds Supabase's limit (varies by plan, typically 60–200 direct connections). Queries start failing with "max client connections reached."

**Why it happens:** Serverless functions are stateless and short-lived. Each invocation opens a new connection. Connection pools maintained within the function instance do not persist across invocations. At 10 coaches each with active sequences, plus Gmail monitoring, plus approval notifications, the connection count compounds.

**Consequences:** Database queries fail at peak load. Sequences miss steps. Draft saves fail.

**Warning signs:** Supabase dashboard showing connection count approaching the limit. Intermittent `remaining connection slots are reserved` errors.

**Prevention:**
1. Use Supabase's connection pooler (Supavisor) in transaction mode (port 6543) for all serverless function connections. This is the recommended configuration for Vercel + Supabase.
2. Set `connection_limit=1` in the connection string for serverless contexts.
3. Do not use direct connection strings (port 5432) in any Vercel function.
4. Monitor the connection count in the Supabase dashboard. Set an alert if it exceeds 70% of the plan limit.

**Phase:** Phase 1 (database configuration must be correct from the start).

---

## Phase Mapping

| Phase | Pitfall Category | Pitfalls to Address |
|-------|-----------------|---------------------|
| Phase 1 | Security foundation | Service role key client separation, SECURITY DEFINER in private schema, structured logging wrapper (no token leakage), RLS coach_id enforcement pattern, Supabase connection pooler config |
| Phase 1 | Gmail OAuth | Request correct scopes upfront, validate granted scopes after auth, store refresh token on `tokens` event |
| Phase 2 | AI draft quality | Context window token counting + trimmer, hallucination prevention (XML delimiters, explicit grounding instruction, low-confidence flag), voice model minimum threshold (8 examples), prompt injection defense |
| Phase 3 | Inngest sequences | Idempotency keys on all events, cancelOn for lead replies, pre-send safety check as synchronous gate, cross-tenant event field validation, step ID uniqueness in loops, sleep duration architecture (sleepUntil vs sleep) |
| Phase 3 | Calendar webhooks | Signature verification for each provider, immediate 200 response + defer to Inngest, webhook deduplication via event UUID, race condition guard (create stub lead if not found), abstraction layer per provider |
| Phase 3 | Gmail reliability | Watch renewal cron (7-day expiry), polling fallback if watch inactive, token health check cron, rate limiting via Inngest throttle keyed on coachId, Gmail open tracking as weak signal only |
| Phase 4 | Approval flow | Pre-send safety check (reply/coach-sent check), multi-channel notification with delivery tracking, draft staleness warning, autonomous mode race condition guard (optimistic lock) |
| Phase 4 | Notification failures | Fallback notification channel, notification delivery logging, HOLD state monitoring in admin dashboard |
| Phase 5 | Testing | Playwright tests for duplicate sequence prevention, cross-tenant isolation, pre-send safety check, webhook signature bypass attempts |

---

## Sources

- Inngest official docs — deduplication, idempotency, concurrency, cancelOn, step memoization, sleep limits: Context7 `/inngest/website`, `/inngest/inngest-js`
- Google APIs Node.js client — refresh token events, revocation causes: Context7 `/websites/googleapis_dev_nodejs_googleapis`
- Supabase official docs — RLS bypass, service role, SECURITY DEFINER, Vault, connection pooling: Context7 `/supabase/supabase`
- Anthropic SDK TypeScript — token counting, rate limit errors: Context7 `/anthropics/anthropic-sdk-typescript`
- Gmail API Image Proxy behavior: documented in Google's Gmail blog (2013) and widely confirmed in deliverability communities — MEDIUM confidence (training knowledge, consistent with industry documentation)
- Calendly webhook retry behavior: MEDIUM confidence (training knowledge, consistent with webhook reliability patterns across providers)
- Google OAuth refresh token revocation conditions: HIGH confidence (documented in googleapis Node.js client official docs)
