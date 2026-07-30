import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { getGmailClientForCoach } from "@/lib/gmail/client";
import { extractHeader } from "@/lib/gmail/thread";
import { stuckSendingCutoff } from "@client/shared/constants/sends";

/**
 * Operator surface for drafts stranded in the transient `sending` status (#139).
 *
 * The reconciler's sweep resolves the *witnessed* case on its own (an
 * `email_events` 'sent' row proves the email left, so it finishes the
 * bookkeeping). What it deliberately will NOT do is re-send an UNwitnessed one:
 * "Gmail never got it" and "Gmail got it but recordDelivery died" are
 * indistinguishable from the database, and a duplicate email to a lead is not
 * retractable. So it logs and leaves the draft parked.
 *
 * That left the outcome invisible outside the logs, and unanswerable besides:
 * the note said "check the coach's Gmail Sent folder", but Daniel operates the
 * system and does not have the coach's mailbox open. He does, however, hold that
 * coach's Gmail OAuth grant — so this module answers the question with the
 * coach's own Gmail (`checkGmailForSend`) rather than asking a human to guess,
 * and then applies the operator's decision (`resolveStuckSend`).
 */

// A generous back-window on the Gmail search. `updated_at` is stamped when the
// draft was claimed, microseconds before `messages.send`, so any real delivery
// is at or after it; the slack absorbs clock skew between us and Gmail.
const SEARCH_BACKDATE_MS = 5 * 60_000;

export type StuckSend = {
  draft_id: string;
  coach_id: string;
  coach_name: string | null;
  coach_email: string | null;
  lead_id: string;
  lead_name: string | null;
  lead_email: string | null;
  subject: string | null;
  /** `drafts.updated_at`, i.e. when the send claimed the draft and then died. */
  stuck_since: string;
  /**
   * An `email_events` 'sent' row exists, so the email definitely went out and
   * the next reconciler tick (every 10 min) will complete this by itself. Shown
   * so the operator knows which rows need them and which are self-healing.
   */
  witnessed: boolean;
};

/**
 * Drafts parked in `sending` past the shared stuck threshold. Uses the same
 * cutoff as the reconciler so this panel and that sweep never disagree.
 *
 * ADMIN-005: adminClient bypasses RLS, server-only.
 */
export async function fetchStuckSends(): Promise<StuckSend[]> {
  const { data: drafts } = await adminClient
    .from("drafts")
    .select("id, coach_id, lead_id, subject, updated_at")
    .eq("status", "sending")
    .lte("updated_at", stuckSendingCutoff())
    .order("updated_at", { ascending: true });

  if (!drafts?.length) return [];

  const draftIds = drafts.map((d) => d.id);
  const coachIds = [...new Set(drafts.map((d) => d.coach_id))];
  const leadIds = [...new Set(drafts.map((d) => d.lead_id))];

  const [{ data: coaches }, { data: leads }, { data: witnesses }] = await Promise.all([
    adminClient.from("coaches").select("id, name, email").in("id", coachIds),
    adminClient.from("leads").select("id, name, email").in("id", leadIds),
    adminClient
      .from("email_events")
      .select("draft_id")
      .in("draft_id", draftIds)
      .eq("event_type", "sent"),
  ]);

  const witnessed = new Set((witnesses ?? []).map((w) => w.draft_id));

  return drafts.map((d) => {
    const coach = coaches?.find((c) => c.id === d.coach_id);
    const lead = leads?.find((l) => l.id === d.lead_id);
    return {
      draft_id: d.id,
      coach_id: d.coach_id,
      coach_name: coach?.name ?? null,
      coach_email: coach?.email ?? null,
      lead_id: d.lead_id,
      lead_name: lead?.name ?? null,
      lead_email: lead?.email ?? null,
      subject: d.subject,
      stuck_since: d.updated_at,
      witnessed: witnessed.has(d.id),
    };
  });
}

// ----------------------------------------------------------------------------
// Gmail ground truth
// ----------------------------------------------------------------------------

export type SentMatch = {
  gmailMessageId: string;
  gmailThreadId: string;
  /** RFC 822 Message-ID — the value inbound replies carry in In-Reply-To. */
  rfcMessageId: string;
  subject: string;
  sentAt: string;
  /** The subject matches the draft's, ignoring any Re: chain. */
  subjectMatches: boolean;
};

export type GmailCheck =
  | { status: "found"; matches: SentMatch[] }
  | { status: "none" }
  | { status: "unavailable"; message: string };

function normalizeSubject(subject: string): string {
  return subject.replace(/^(\s*re\s*:\s*)+/i, "").trim().toLowerCase();
}

/**
 * Ask the coach's own mailbox whether this draft actually went out.
 *
 * Read-only (`messages.list` + `messages.get`) against the Gmail grant we
 * already hold for sends. Returns every message to the lead since the draft was
 * claimed, newest last, rather than a bare yes/no — the coach may have emailed
 * that lead by hand in the meantime, so the operator sees the evidence (subject
 * + timestamp) and decides, instead of trusting a heuristic.
 */
export async function checkGmailForSend(draftId: string): Promise<GmailCheck> {
  const { data: draft } = await adminClient
    .from("drafts")
    .select("id, coach_id, lead_id, subject, status, updated_at")
    .eq("id", draftId)
    .maybeSingle();

  if (!draft) return { status: "unavailable", message: "Draft not found." };

  const { data: lead } = await adminClient
    .from("leads")
    .select("email")
    .eq("id", draft.lead_id)
    .maybeSingle();

  if (!lead?.email) {
    return { status: "unavailable", message: "This lead has no email address on file." };
  }

  const after = Math.floor(
    (new Date(draft.updated_at).getTime() - SEARCH_BACKDATE_MS) / 1000,
  );

  try {
    const gmail = await getGmailClientForCoach(draft.coach_id);
    const list = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["SENT"],
      maxResults: 10,
      q: `to:${lead.email} after:${after}`,
    });

    const ids = (list.data.messages ?? []).flatMap((m) => (m.id ? [m.id] : []));
    if (ids.length === 0) return { status: "none" };

    const draftSubject = normalizeSubject(draft.subject ?? "");
    const matches: SentMatch[] = [];

    for (const id of ids) {
      const { data: msg } = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["Subject", "Message-ID", "Date"],
      });
      const headers = msg.payload?.headers ?? [];
      const subject = extractHeader(headers, "subject");
      matches.push({
        gmailMessageId: msg.id ?? id,
        gmailThreadId: msg.threadId ?? "",
        rfcMessageId: extractHeader(headers, "message-id").replace(/[<>]/g, "").trim(),
        subject,
        sentAt: msg.internalDate
          ? new Date(Number(msg.internalDate)).toISOString()
          : new Date().toISOString(),
        subjectMatches: !!draftSubject && normalizeSubject(subject) === draftSubject,
      });
    }

    matches.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    return { status: "found", matches };
  } catch (err) {
    // A revoked/expired grant must not read as "nothing was sent" — that would
    // walk the operator straight into a duplicate. Say we could not tell.
    console.error(`[stuck-sends] Gmail check failed for draft ${draftId}:`, err);
    return {
      status: "unavailable",
      message:
        "Couldn't reach this coach's Gmail. Their connection may need re-authorising.",
    };
  }
}

/**
 * The single best candidate for "this draft's send": the earliest message to the
 * lead after the claim, preferring one whose subject matches the draft.
 */
function bestMatch(matches: SentMatch[]): SentMatch | null {
  return matches.find((m) => m.subjectMatches) ?? matches[0] ?? null;
}

// ----------------------------------------------------------------------------
// Resolution
// ----------------------------------------------------------------------------

export type ResolveAction = "mark_sent" | "resend";

export type ResolveResult =
  | { ok: true; outcome: "marked_sent" | "resent"; message: string }
  | {
      ok: false;
      reason: "not_found" | "not_stuck" | "already_sent" | "requeue_failed";
      message: string;
    };

/**
 * Apply the operator's decision to a stuck draft.
 *
 * `mark_sent`  — the email did go out. Finish the interrupted bookkeeping,
 *                recovering the real Gmail ids where we can so reply correlation
 *                still works on the thread.
 * `resend`     — the email did not go out. Release the claim and re-emit the
 *                send. `send-via-gmail` re-runs the full pre-send safety check,
 *                so a lead who has since replied, bounced or gone DNC is still
 *                not emailed, and re-claims atomically.
 *
 * Both writes are conditional on the draft still being `sending`, so a
 * reconciler tick or a second operator resolving it first is a no-op, never a
 * clobber.
 */
export async function resolveStuckSend(
  draftId: string,
  action: ResolveAction,
): Promise<ResolveResult> {
  const { data: draft } = await adminClient
    .from("drafts")
    .select("id, coach_id, lead_id, subject, status")
    .eq("id", draftId)
    .maybeSingle();

  if (!draft) {
    return { ok: false, reason: "not_found", message: "That draft no longer exists." };
  }
  if (draft.status !== "sending") {
    return {
      ok: false,
      reason: "not_stuck",
      message: `This draft is already ${draft.status} — nothing to resolve.`,
    };
  }

  const { data: witness } = await adminClient
    .from("email_events")
    .select("id, created_at, gmail_message_id, gmail_thread_id")
    .eq("draft_id", draftId)
    .eq("event_type", "sent")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return action === "mark_sent"
    ? markSent(draft, witness)
    : resend(draft, witness);
}

type StuckDraftRow = {
  id: string;
  coach_id: string;
  lead_id: string;
  subject: string | null;
};

type WitnessRow = {
  id: string;
  created_at: string;
  gmail_message_id: string | null;
  gmail_thread_id: string | null;
} | null;

async function markSent(draft: StuckDraftRow, witness: WitnessRow): Promise<ResolveResult> {
  // Recover the true Gmail ids when the send was never witnessed: they are what
  // inbound reply correlation matches on, so a draft marked sent without them
  // would leave the lead's reply unthreaded.
  let sentAt = witness?.created_at ?? null;
  let match: SentMatch | null = null;

  if (!witness) {
    const check = await checkGmailForSend(draft.id);
    if (check.status === "found") {
      match = bestMatch(check.matches);
      sentAt = match?.sentAt ?? null;
    }
    // `none` / `unavailable` still proceed: the operator is asserting the send
    // happened, and they may have confirmed it out-of-band with the coach.
  }

  // email_events before the status flip, preserving the invariant the reconciler
  // relies on — a witnessed row must never predate a `sent` draft.
  if (!witness) {
    await adminClient.from("email_events").insert({
      coach_id: draft.coach_id,
      lead_id: draft.lead_id,
      draft_id: draft.id,
      event_type: "sent",
      gmail_message_id: match?.rfcMessageId || null,
      gmail_thread_id: match?.gmailThreadId || null,
      raw_payload: {
        subject: draft.subject,
        source: "admin_manual_resolve",
        gmail_verified: !!match,
      },
    });
  }

  const resolvedAt = sentAt ?? new Date().toISOString();

  const { data: flipped } = await adminClient
    .from("drafts")
    .update({ status: "sent", sent_at: resolvedAt })
    .eq("id", draft.id)
    .eq("status", "sending")
    .select("id");

  if (!flipped?.length) {
    return {
      ok: false,
      reason: "not_stuck",
      message: "Something else resolved this draft first. Refresh to see its state.",
    };
  }

  const { data: logged } = await adminClient
    .from("lead_events")
    .select("id")
    .eq("lead_id", draft.lead_id)
    .eq("event_type", "email_sent")
    .contains("payload", { draft_id: draft.id })
    .limit(1)
    .maybeSingle();

  if (!logged) {
    await adminClient.from("lead_events").insert({
      coach_id: draft.coach_id,
      lead_id: draft.lead_id,
      event_type: "email_sent",
      payload: {
        draft_id: draft.id,
        subject: draft.subject,
        source: "admin_manual_resolve",
      },
      triggered_by: "system",
    });
  }

  console.warn(`[stuck-sends] draft ${draft.id} manually marked sent by operator`);

  return {
    ok: true,
    outcome: "marked_sent",
    message: match
      ? "Marked as sent, and matched to the message in Gmail so replies stay threaded."
      : "Marked as sent.",
  };
}

async function resend(draft: StuckDraftRow, witness: WitnessRow): Promise<ResolveResult> {
  if (witness) {
    return {
      ok: false,
      reason: "already_sent",
      message:
        "This email is already on record as sent — resending would give the lead a duplicate. Mark it as sent instead.",
    };
  }

  // Second opinion from the mailbox itself before we risk a duplicate. An
  // unreachable Gmail does not block the operator; a positive match does.
  const check = await checkGmailForSend(draft.id);
  if (check.status === "found") {
    const found = bestMatch(check.matches);
    return {
      ok: false,
      reason: "already_sent",
      message: `Gmail shows a message to this lead${
        found ? ` ("${found.subject}")` : ""
      } after the send started. Check it, then mark this as sent rather than resending.`,
    };
  }

  const { data: released } = await adminClient
    .from("drafts")
    .update({ status: "approved" })
    .eq("id", draft.id)
    .eq("status", "sending")
    .select("id");

  if (!released?.length) {
    return {
      ok: false,
      reason: "not_stuck",
      message: "Something else resolved this draft first. Refresh to see its state.",
    };
  }

  // `sequence_scheduled` bypasses the cadence gate: this draft's send time has
  // by definition already passed (it was claimed once), and a draft left in
  // `approved` behind its own gate would just strand all over again.
  try {
    await inngest.send({
      name: "draft/send_via_gmail",
      data: { draftId: draft.id, coachId: draft.coach_id, source: "sequence_scheduled" },
    });
  } catch (err) {
    // The claim is already released at this point. Put it back so the draft
    // stays on this panel and stays retryable — an ad-hoc draft left in
    // `approved` has no scheduled_send_at, so the reconciler would never pick it
    // up and it would strand silently, which is the failure we set out to kill.
    //
    // Safe even if the event actually landed and only the response was lost:
    // `claimDraftForSend` only accepts approved/edited, so that send skips
    // rather than duplicating, and the draft simply shows up here again.
    console.error(`[stuck-sends] draft ${draft.id} re-queue failed, restoring claim:`, err);
    await adminClient
      .from("drafts")
      .update({ status: "sending" })
      .eq("id", draft.id)
      .eq("status", "approved");

    return {
      ok: false,
      reason: "requeue_failed",
      message: "Couldn't reach the send queue. Nothing was sent — try again in a moment.",
    };
  }

  console.warn(`[stuck-sends] draft ${draft.id} released and re-sent by operator`);

  return {
    ok: true,
    outcome: "resent",
    message: "Send re-queued. It'll go out within a minute if the lead is still contactable.",
  };
}
