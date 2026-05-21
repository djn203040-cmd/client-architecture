# Data Processing Addendum (DPA) — Template

> **Use:** Send this to any coach who requests a DPA for their B2B clients.
> Fill in the placeholders, sign, return. Sonorous Digital countersigns
> within 5 business days.

---

This Data Processing Addendum ("DPA") forms part of the agreement between:

- **Controller:** _____________________ ("Coach")
- **Processor:** Sonorous Digital ("Sonorous"), the operator of The Client
  Architecture

regarding the processing of personal data on behalf of the Coach's clients
("Data Subjects").

## 1. Subject matter

Sonorous processes personal data on behalf of the Coach to deliver the
features described in the Terms of Service: AI-drafted follow-up, multi-
channel approval, calendar-driven sequencing, and operator-managed
infrastructure.

## 2. Duration

This DPA is effective for the duration of the Coach's subscription to The
Client Architecture and terminates 30 days after deletion of the account,
during which Sonorous retains backups for incident recovery.

## 3. Categories of data subject

- The Coach's leads
- The Coach's clients
- Anyone whose messages flow through the Coach's connected Gmail inbox

## 4. Categories of personal data

- Identifiers — name, email, phone
- Communications content — drafts, transcripts, message history
- Engagement signals — opens, clicks, bounces, replies
- Calendar metadata — booking time, status

No special-category data is intentionally processed. If the Coach uploads
such data via the voice corpus or call transcripts, the Coach is
responsible for obtaining the appropriate legal basis.

## 5. Processor obligations

Sonorous shall:
- Process personal data only on documented instructions from the Coach.
- Ensure personnel handling personal data are bound by confidentiality.
- Implement the technical and organisational measures listed in Annex A.
- Engage sub-processors only as listed in Annex B, with the right to
  object to changes via 30-day written notice.
- Assist the Coach in responding to data subject requests within 14 days.
- Notify the Coach within 24 hours of any personal-data breach.
- Delete or return personal data at the Coach's option upon termination.

## 6. Sub-processors

See `docs/privacy-policy.md → Sub-processors` for the live list. Sonorous
shall give the Coach 30 days' notice before adding or replacing a sub-
processor.

## 7. International transfers

Sub-processors outside the EU/UK operate under Standard Contractual
Clauses or equivalent adequacy mechanisms.

## 8. Audit

The Coach may, no more than once per year and with 30 days' notice, audit
Sonorous's compliance with this DPA. Sonorous will provide reasonable
information in lieu of an on-site audit where practical.

## 9. Liability

Liability under this DPA is subject to the limitations in the Terms of
Service.

---

## Annex A — Technical and organisational measures

- Encryption at rest (Supabase + Vault for secrets)
- Encryption in transit (TLS for all API and database traffic)
- Row-level security on every database table, scoped per coach
- Multi-factor authentication available for all dashboard accounts
- Audit logging of administrative actions
- Quarterly key rotation and dependency-vulnerability scanning
- Incident-response runbooks (see `docs/runbooks/`)

## Annex B — Approved sub-processors

(Live list maintained in `docs/privacy-policy.md`.)

---

**Signed:**

Coach: _______________________ Date: __________

Sonorous Digital: _______________________ Date: __________
