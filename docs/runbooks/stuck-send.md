# Runbook — A send is stuck

**Severity:** Low to Medium. One lead stops progressing; nothing is at risk of
leaking. The one way to make it worse is to resend an email that already went
out.
**Owner:** Daniel.
**Trigger:** `/admin` → System health shows a **Stuck sends** card, or a banner
appears at the top of `/admin` saying a send needs a decision.

## What "stuck" means

Every send claims its draft first, flipping it to a transient `sending` status,
then hands the message to Gmail, then records the result. If the process dies
between the claim and the record, the draft is left in `sending` with nothing to
move it on. After 15 minutes it is treated as stuck rather than in flight.

The database cannot tell these two apart:

- Gmail never received the message → the lead got nothing.
- Gmail received it and the bookkeeping died → the lead already has the email.

That distinction is the entire decision you are being asked to make, and it is
why the system will not retry on its own. A duplicate email to a lead cannot be
taken back.

## Step 0 — Check whether you need to act at all

Rows labelled **Delivered · self-healing** need nothing from you. A `sent` event
is already on record, which proves the email left; the reconciler finishes the
bookkeeping within 10 minutes. Ignore them.

Only rows labelled **Needs a decision** are yours.

## Step 1 — Ask the coach's Gmail

Click **Check Gmail** on the row. This reads the coach's Sent mail (using the
Gmail connection they already granted us for sending) and lists every message to
that lead since the send started, with subject and timestamp.

Read the result, don't skim it:

- **Nothing found** — the email did not go out. Safe to send.
- **A message found, subject matches** — it went out. Do not resend.
- **A message found, subject does NOT match** — the coach probably emailed that
  lead by hand in the meantime. That is not this draft. Judge on the timestamp
  and subject; when unsure, treat it as sent and follow up with the coach.
- **"Couldn't reach this coach's Gmail"** — this is *unknown*, not *unsent*. It
  usually means their Gmail connection needs re-authorising. Stop here and fix
  that first (Step 4), unless you can confirm with the coach directly.

## Step 2 — Apply the decision

**It went out → "It went out — mark as sent"**

Closes out the draft and writes the records that were interrupted. Where Gmail
gave us the real message ID, it is stored, so the lead's reply still lands in the
right thread. Nothing is emailed.

**It didn't → "It didn't — send it"**

Releases the claim and re-queues the send. Before anything leaves, the pipeline
re-runs its full pre-send safety check, so a lead who has replied, bounced,
unsubscribed or gone do-not-contact since is still not emailed.

The button will refuse if a send is already on record, or if Gmail shows a
message to that lead after the send started. If it refuses, believe it — use
"mark as sent" instead.

## Step 3 — Confirm

Refresh `/admin`. The row should be gone. If it reappears in `sending`, the
re-queue failed to reach the queue and the claim was deliberately restored so it
stays visible; wait a minute and try again.

## Step 4 — Root cause

One stuck send is not a pattern. Several, or repeats on the same coach, are.

1. **Same coach every time** — check their Gmail connection on the roster. An
   expired or revoked grant is the usual cause. Have them reconnect Gmail in
   Settings → Integrations.
2. **Spread across coaches** — check the Inngest dashboard for failed runs of
   `send-via-gmail`. Repeated deaths past the retry limit point at Gmail API
   errors or a deploy that interrupted in-flight sends.
3. **Started after a deploy** — sends interrupted mid-flight by a redeploy will
   surface here. Expected in small numbers; resolve them and move on.

Unwitnessed stuck sends are also logged with
`[due-draft-reconciler] … awaiting an operator decision on /admin#system-health`
in the Vercel logs, if you need to correlate against a specific time window.

## Do not

- **Do not flip a draft's status by hand in the database.** The panel writes
  several linked records in a specific order; a bare status change leaves the
  reply threading and the lead's timeline wrong.
- **Do not resend when Gmail is unreachable.** Unknown is not the same as
  unsent, and this is exactly how a lead gets the same email twice.
