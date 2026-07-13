# ADR-0001 — Security Architecture for Client Data

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-13 |
| **Decision makers** | Daniel (operator, Sonorous Digital) |
| **Supersedes** | — |
| **Related** | [`SECURITY-POSTURE.md`](../SECURITY-POSTURE.md) (controls register), [`privacy-policy.md`](../privacy-policy.md), [`dpa-template.md`](../dpa-template.md) |

> **Who this document is for.** Coaches evaluating whether it is safe to put real
> client data into this system, and anyone doing due diligence on their behalf.
> It states plainly what we protect, how, why each control exists, and — just as
> importantly — **what we deliberately did not build, and why that is the right
> call rather than a gap.** Security theatre is easy to write; this document
> tries to be honest instead.
>
> It contains no secrets, keys, or infrastructure identifiers.

---

## 1. Context: what is actually at stake

This product ingests **sales-call transcripts** and lead contact details on behalf
of coaching businesses, then drafts follow-up emails in the coach's voice.

That makes the data unusually sensitive. A coaching sales call is not a B2B
procurement call — people disclose health problems, money problems, relationship
problems, and career fears. A transcript may therefore contain what GDPR calls
**special-category data**, even though we never ask for it. The realistic harm
from a breach is not "a spreadsheet of emails leaked"; it is "a named person's
private confession became public." We designed for that, not for the spreadsheet.

**Data we hold:** lead name, email, phone; call transcripts; AI-drafted and sent
email content; email engagement events; coach profile and voice model; OAuth
tokens for the coach's connected Gmail/calendar/Slack.

**Roles under GDPR:** the **coach is the data controller** (they decide to
contact their leads). **We are the data processor.** Data is stored in the EU
(Frankfurt region). A signable DPA is available.

---

## 2. Threat model — who we actually defend against

Controls are only meaningful against a named adversary. Ranked by realistic
likelihood for a product of this size and shape:

| # | Threat | Realistic? | Primary defence |
|---|--------|-----------|-----------------|
| **T-1** | **One coach reads another coach's clients** — via a bug, a guessed ID, or a crafted request | **Highest.** This is the single most damaging and most likely failure for any multi-tenant product. | Database-enforced tenant isolation (D-1) |
| **T-2** | **A stranger triggers privileged actions** without logging in — e.g. causing an email to send, or overwriting a connected account | **High.** Any publicly reachable API is probed continuously. | Least-privilege on database functions (D-4); auth + signature verification on every entry point (D-6, D-7) |
| **T-3** | **The database contents leak** — a stolen backup, a misconfigured replica, an exfiltration bug | **Moderate.** The classic "we were breached" headline. | Transcript encryption with an app-held key (D-3); secrets in a vault (D-2) |
| **T-4** | **Injection** — hostile input reinterpreted as a command | **Moderate** in general; **structurally eliminated** here (D-5) | No hand-written SQL anywhere (D-5) |
| **T-5** | **A connected account is hijacked** — someone spoofs a calendar/email webhook to inject fake leads or transcripts | **Moderate.** | Cryptographic signature verification on every webhook (D-6) |
| **T-6** | **Credential leak into source control or logs** | **Moderate.** The most common real-world breach cause industry-wide. | Automated secret scanning + PII redaction (D-9) |
| **T-7** | **Data retained forever** with no lawful basis | **Certain, if unmanaged.** A compliance failure rather than a hack. | Enforced retention, export, erasure (D-8) |
| **T-8** | Nation-state adversary, malicious cloud-provider insider, physical datacentre attack | **Not realistically in scope** for a product at this scale. | See §4 — accepted, with reasoning. |

---

## 3. Decisions

Each decision states what we did, **why**, and **what specific threat it kills**.

### D-1 — Tenant isolation is enforced by the database, not the application
**Decision.** Every table carries a `coach_id`. Row-Level Security is `ENABLED`
**and `FORCED`** on every one of them, with a policy that a row is only visible
when `coach_id` equals the currently authenticated user.

**Why this and not the obvious alternative.** The common approach is to filter by
owner in application code (`WHERE coach_id = ...` in every query). That works
until the one query where a developer forgets — and *that single omission is a
cross-tenant data breach*. We push the check **below** the application, into
Postgres itself. A forgotten filter is then not a breach: the database returns
zero rows regardless, because the query executes *as that coach*, not as an
administrator.

**Kills:** T-1. This is the most important decision in this document.

### D-2 — Credentials live in a vault, never in ordinary table columns
**Decision.** OAuth tokens (Gmail, calendar providers, Slack), webhook signing
secrets, and the coach's voice corpus are stored in Supabase Vault — encrypted at
rest, retrievable only by trusted server-side functions. The database tables hold
only an opaque reference.

**Why.** Tokens are more dangerous than the data they protect: a Gmail refresh
token is a durable key to the coach's real inbox. Treating them as ordinary
columns means any read-only leak becomes a full account takeover. Storing them as
secrets means a table dump yields references that decrypt to nothing.

**Kills:** T-3, and contains the blast radius of T-1 if it ever failed.

### D-3 — Call transcripts are encrypted with a key the database does not hold
**Decision.** `transcripts.content` is encrypted in the **application** with
AES-256-GCM (a unique random IV per record, plus an authentication tag that makes
silent tampering detectable) before it is ever sent to the database. The key lives
in the application environment, **not** in the database.

**Why this is not redundant with the platform's encryption.** Supabase already
encrypts its disks and backups. But that key is held by the platform, so anything
that can read the database can read the plaintext. By encrypting *above* the
database with a key the database never sees, a database-only compromise — a
leaked backup file, an exposed read-replica, an exfiltration bug — yields
**ciphertext, not transcripts.** This is the control that specifically addresses
the "private confession became public" harm described in §1.

**Its honest limit.** It does **not** protect against a full compromise of the
application server, because the key is there by necessity. We say so plainly
rather than implying it is a universal shield. It raises the bar from *"steal the
database"* to *"compromise the running application"* — a materially harder attack.

**Kills:** T-3.

### D-4 — Database functions are least-privilege by default
**Decision.** Every privileged database routine is executable **only** by the
trusted server identity — never by anonymous or ordinary logged-in callers.

**Why this is called out.** A hardening review on 2026-07-13 found that Postgres
grants execute permission on new functions to *everyone* by default, and that this
default had silently exposed several internal routines through the public API. In
principle an unauthenticated caller who guessed an internal ID could have
triggered a privileged action. **We found this, fixed it, and verified the fix**
(the platform's own security linter went from 18 warnings to 1, the last being an
account-setting toggle). No exploitation was observed.

We document this rather than quietly patching it, because a security document that
claims a flawless history is not a credible one. What matters is whether defects
are found and closed — and whether the *structural* controls (D-1) mean a single
defect is survivable. Here, they did.

**Kills:** T-2.

### D-5 — SQL injection is eliminated by construction, not by filtering
**Decision.** The application contains **no hand-written SQL**. Every database
call goes through a query builder that transmits values as typed parameters, and
every stored database routine was verified to use **no dynamic SQL**.

**Why.** Injection defences based on escaping or blocklisting bad characters fail
eventually, because they are a guessing game about parsers. Instead we removed the
condition that makes injection *possible*: data is never concatenated into a
command string, so a value like `'); DROP TABLE leads;--` is only ever a name.
Verified: 27/27 database routines use no dynamic SQL; 0 raw SQL statements in
application code.

**Kills:** T-4 — structurally, not probabilistically.

### D-6 — Nothing inbound is trusted without proof
**Decision.** Every webhook (calendar providers, email, transcript providers,
messaging) cryptographically verifies the sender's signature **before** the
payload is parsed or acted upon, using constant-time comparison. Every dashboard
endpoint requires an authenticated session. Automated jobs authenticate with a
secret.

**Why.** Webhook URLs are effectively public. Without signature verification,
anyone who learns the URL can inject fabricated leads, fake transcripts, or forged
booking events — polluting the coach's pipeline and the AI's context.

**Kills:** T-5, T-2.

### D-7 — Every input is validated at the boundary
**Decision.** Every API boundary validates its input against an explicit schema
(Zod) and rejects anything that does not match. TypeScript runs in strict mode
with no `any`.

**Why.** Validation is a contract, not a formality. Malformed input is refused at
the door rather than propagating into business logic where its behaviour is
undefined.

**Kills:** whole classes of T-2 and T-4 before they reach logic.

### D-8 — Privacy rights are enforced by code, not promised in prose
**Decision.**
- **Erasure:** deleting a coach or a lead cascades — transcripts, drafts, events
  and history are removed with it. Enforced by database constraints, asserted in
  a migration so it cannot silently regress.
- **Retention:** leads marked *do-not-contact* are **automatically purged after 90
  days** by a scheduled job. The clock starts at opt-out, tracked by the database.
- **Access & portability:** a coach can export **everything** we hold in
  machine-readable JSON — including transcripts, engagement history and audit log.
- **Accountability:** deletions, exports and purges are written to an audit log.

**Why this decision exists at all.** Our privacy policy already *promised* a
90-day purge. On 2026-07-13 we found that **no code enforced it.** A promise a
system does not keep is worse than no promise: it is a misrepresentation to every
coach who relied on it. It is now enforced, and the export was completed (it had
been silently omitting transcripts and engagement history, which would have made
any data-subject access request incomplete).

**Kills:** T-7.

### D-9 — Secrets and PII are kept out of source control and logs
**Decision.** Automated secret scanning runs in CI on every commit. A CI check
specifically blocks the server-side database key from ever being exposed to the
browser. PII (emails, phone numbers, tokens) is redacted before anything is
written to error monitoring or logs.

**Why.** Leaked credentials in git history and PII in logs are among the most
common real-world breach causes — far more common than exotic exploits.

**Kills:** T-6.

### D-10 — Data sent to the AI model is minimised
**Decision.** Draft generation sends the lead's **first name** and the transcript
content needed to write the message. It does not send email addresses or phone
numbers. The AI provider is bound by enterprise terms that prohibit training on
our inputs. All AI calls are server-side; the API key never reaches a browser.

**Why.** The smallest payload that does the job is the smallest payload that can
leak.

---

## 4. What we deliberately did NOT build — and why that is correct

This is the section most security documents omit. Every control has a cost, and
controls adopted for appearance rather than effect make a system *worse* by adding
failure modes and complexity. Here is what we consciously rejected.

### We do not encrypt lead names, emails, and phone numbers at the application layer
**Why not.** It sounds stronger. It would in practice make the product worse
without meaningfully improving safety.

The email address is the key we use to match an inbound reply back to the right
lead, and to prevent duplicates. Encrypted values cannot be searched, so we would
have to either decrypt every row on every lookup (slow, and the plaintext is
reconstructed in memory anyway) or adopt deterministic encryption — which leaks
equality, is materially weaker, and adds a whole new class of subtle bugs.

Meanwhile the *sensitivity gap is enormous*: a name and an email address are
low-harm and often already public. **The transcript is the crown jewel** — so we
spent the encryption budget precisely there (D-3), and left identifiers protected
by tenant isolation (D-1) and the platform's at-rest encryption. This is a
deliberate allocation of protection to where the harm actually is, not an
oversight.

### We do not offer customer-managed encryption keys or an HSM
**Why not.** At 5–10 coaches, a customer-managed key adds a permanent operational
failure mode (a lost or mis-rotated key destroys the client's own data) in
exchange for defending against a threat — a malicious cloud-provider insider —
that is far less likely than the operational outage it would introduce. This is a
control that belongs at enterprise scale with a dedicated key-management function.
We will revisit it if an enterprise client contractually requires it.

### We are not SOC 2 / ISO 27001 certified
**Why not, stated plainly.** A certification is an *attestation that a process
exists*, purchased through an audit — it is not itself a security control, and
plenty of certified companies get breached. At our current size the honest answer
is that the money buys a logo, not safety.

What we do instead is publish this document and a version-controlled
[controls register](../SECURITY-POSTURE.md) that records every control, every
audit, and every finding, including the ones that were unflattering. That is
strictly more information than a certificate conveys. If a coach's own compliance
process requires certification, tell us — it is a business decision, not a
technical objection.

### We do not self-host the database
**Why not.** Running our own Postgres would mean *we* become responsible for patch
management, backup integrity, and physical security — all things a specialised
provider does better than a small team. Delegating that to a managed EU provider is
a security *improvement*, not a compromise.

### We do not include a `List-Unsubscribe` header on outbound mail
**Why not — and this one is a genuine trade-off, not a clear win.** These are 1:1
emails sent as the coach, not bulk marketing. That header is a strong "bulk sender"
signal to Gmail and pushes the message to the Promotions tab, which defeats the
purpose of a personal follow-up. Opt-out is instead honoured via a tokenised
unsubscribe link and by reply, and an opt-out hard-stops all future sending and
triggers the 90-day purge (D-8).

We flag this openly as the control we are least certain about; a coach whose
market expects one-click unsubscribe should tell us and we will enable it.

### We do not show a cookie banner
**Why not.** We set no advertising or analytics cookies. The only cookies are the
ones required to keep you logged in and to remember your theme — which are exempt
from consent requirements under GDPR. A banner here would be compliance theatre.

---

## 5. Residual risks — stated honestly

No system is "unbreakable", and any vendor who tells you otherwise is selling
something. These are the risks we knowingly carry:

1. **Compromise of the running application** would expose transcript plaintext,
   because the decryption key must live there (see D-3's stated limit).
2. **A coach's own account being phished** would expose that coach's own data. We
   mitigate with leaked-password protection, but the coach's password hygiene is
   ultimately theirs. MFA is a candidate for a future ADR.
3. **Sub-processors** (AI provider, email, hosting, messaging) each see a
   minimised slice of data. They are enumerated in the privacy policy and bound by
   contract; we inherit their risk.
4. **The operator has administrative access** — inherent to a managed service.
   Administrative actions are written to an audit log.

---

## 6. How these claims are verified (not just asserted)

| Claim | How it is checked |
|---|---|
| Tenant isolation is on everywhere | Queried live against the production database: RLS enabled **and forced**, with a correct owner policy, on every table |
| Privileged functions are locked down | Permissions queried directly: anonymous execute = denied, trusted server = allowed |
| No SQL injection surface | 27/27 database routines confirmed free of dynamic SQL; 0 hand-written SQL statements in the codebase |
| Encryption works, and detects tampering | Unit-tested: round-trip, unique IV per record, tamper detection, unicode |
| Deletion is complete | A migration asserts every foreign key cascades; it fails the deploy if one does not |
| The platform agrees | Supabase's own security linter: **18 warnings → 1** (the last is an account-setting toggle) |
| Nothing regressed | Full suite green: type-check, lint, 327 unit tests |

---

## 7. Consequences

**Positive.** Tenant isolation survives developer error. A stolen database does
not yield transcripts. Injection is structurally impossible. Privacy rights are
enforced by code rather than promised in prose.

**Negative / accepted.** Encrypted transcripts cannot be searched or filtered
in the database (accepted: we never needed to). The encryption key becomes
operationally critical — losing it means losing transcript content, so it must be
backed up as carefully as the data itself. Application compromise remains the
top residual risk.

---

## 8. Review

This ADR is reviewed **quarterly**, and immediately upon: a new data category
being collected, a new sub-processor being added, a change in scale (e.g. an
enterprise client), or any security incident.

Findings and remediations are appended to the
[controls register](../SECURITY-POSTURE.md) — append-only, never rewritten.

**Security contact:** privacy@theclientarchitecture.com
