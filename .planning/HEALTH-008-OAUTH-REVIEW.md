# HEALTH-008: Google OAuth App Verification Tracking

**Status:** pending_submission
**Created:** 2026-05-07
**Phase:** 01-foundation (Plan 01-05)
**Owner:** Daniel (djn203040@gmail.com)

---

## What This Is

Google's OAuth verification process for the sensitive Gmail scopes used by The Client Architecture.
This MUST begin in Phase 1 because verification takes 1–2 weeks and Phase 3 sequences will break
weekly if the app remains in "Testing" mode (7-day refresh token expiry).

**Scopes requiring verification (Sensitive — not Restricted):**
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`

Sensitive scope verification does NOT require a $15,000–$75,000 third-party security assessment.

---

## Review Timeline

| Stage | Typical Duration |
|-------|-----------------|
| Brand verification | 2–3 business days |
| Sensitive scope review | 3–5 business days after brand |
| Total | ~1–2 weeks |

---

## Daniel's Action Items

### Step 1: Google Cloud Console Setup

1. Go to https://console.cloud.google.com/ (use djn203040@gmail.com — per RESEARCH.md Open Question 2)
2. Create project: `client-architecture-prod`
3. APIs & Services → Library → Enable **Gmail API**

### Step 2: OAuth Consent Screen

4. APIs & Services → OAuth consent screen:
   - User Type: **External**
   - App name: **The Client Architecture**
   - User support email: djn203040@gmail.com
   - App logo: [upload Sonorous Digital / The Client Architecture logo]
   - Authorized domain: your production domain (e.g., sonorous-digital.com)
   - Developer contact: djn203040@gmail.com
5. Scopes: add all 3 Gmail sensitive scopes
6. Scope justification text (required for review):
   - **gmail.send** — "Sends follow-up emails to coaching leads on the coach's behalf, from the coach's own Gmail address, using AI-drafted content the coach reviews and approves before any send."
   - **gmail.readonly** — "Reads incoming email replies from leads so the system can auto-pause sequences when a lead responds, preventing duplicate outreach."
   - **gmail.modify** — "Adds labels to emails sent by the system for organizational purposes in the coach's Gmail account."
7. Privacy policy URL: must be live at a real URL before submission
8. Terms of service URL: must be live at a real URL before submission

### Step 3: Create OAuth Credentials

9. APIs & Services → Credentials → Create OAuth Client ID:
   - Application type: **Web application**
   - Name: The Client Architecture
   - Authorized JavaScript origins: `https://[YOUR_APP_URL]`
   - Authorized redirect URIs: `https://[YOUR_APP_URL]/api/auth/gmail/callback`
10. Save → copy GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET into 1Password
11. Add these to Vercel environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

### Step 4: Test Users (Testing Mode)

12. While in Testing mode, add test users:
    - djn203040@gmail.com (Daniel)
    - Any coach Gmail accounts for Phase 1 testing (up to 100 users allowed in Testing mode)

### Step 5: Submit for Verification

13. Submit for brand verification first (fastest path)
14. After brand approval, submit for sensitive scope verification
15. Prepare a short video demonstration (~2 min): coach clicks "Connect Gmail" → authorizes → system sends an email on their behalf

---

## Current Status

| Field | Value |
|-------|-------|
| **Submission status** | pending_submission |
| **GCP Project ID** | [to be filled when Daniel creates the project] |
| **Submission date** | [to be filled when Daniel submits] |
| **Brand review result** | pending |
| **Scope review result** | pending |
| **Verified date** | — |
| **Test users** | [add Gmail accounts here] |

---

## Phase 3 Dependency

**HARD BLOCKER for Phase 3 launch:** The OAuth app MUST exit "Testing" mode before Phase 3 sequences
deploy to production. In Testing mode, refresh tokens expire after 7 days — sequences would break weekly.

Re-check verification status at Phase 3 entry. If not verified, Phase 3 cannot deploy coach-facing sequences.

---

## How to Update This File

When Daniel submits for verification, update this file with:

```
Submission status: submitted
GCP Project ID: [id]
Submission date: [date]
```

When verification is approved:

```
Brand review result: approved — [date]
Scope review result: approved — [date]
Verified date: [date]
```

Close this tracking item when `Scope review result: approved`.

---

*Tracked by Plan 01-05. Rechecked at Phase 3 entry.*
