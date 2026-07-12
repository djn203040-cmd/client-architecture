import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { VoiceProfileSchema, coerceSalesToolkit } from "@client/shared/validators";
import { fetchLeadThread, fetchMessageById } from "@/lib/gmail/thread";
import {
  extractUnansweredInbound,
  formatInboundMessages,
} from "@/lib/drafts/thread-context";

const AI_MODEL = "claude-sonnet-4-6";

export type GenerateReplyParams = {
  coachId: string;
  leadId: string;
  // The Gmail id + thread of the inbound that triggered this reply. Optional so
  // existing callers (and re-runs of legacy events) still work; when present they
  // let us answer the EXACT message instead of guessing from the send-thread.
  messageId?: string;
  threadId?: string;
};

export type GenerateReplyResult =
  | {
      ok: true;
      draftId: string;
      leadName: string;
      status: "pending" | "approved";
      confidenceLevel: "high" | "low";
      // The coach's autonomous mode at generation time. The caller needs it to
      // route the draft: mode_a sends now, mode_b arms the 24h auto-send timer,
      // off/manual waits for review.
      autonomousMode: string;
    }
  | { ok: false; reason: string };

/**
 * Generates a single standalone (sequence_id = null) AI reply draft for a lead
 * that has just replied, and persists it awaiting review. Mirrors
 * generateTouchpointDraft but with no sequence linkage, no scheduled send, and
 * the "replied" state framing (D-14). The send itself is owned by the normal
 * approval → draft/send_via_gmail path, NOT a scheduled timer.
 *
 * Called directly from the reply-handler Inngest function. There is no
 * "draft/generate" Inngest consumer, every generation path calls a function
 * like this one synchronously inside a step.
 */
export async function generateReplyDraft(
  params: GenerateReplyParams,
): Promise<GenerateReplyResult> {
  const { coachId, leadId, messageId, threadId } = params;

  const { data: lead } = await adminClient
    .from("leads")
    .select("id, name, email, coach_id, ai_summary, ai_summary_protected, coach_notes")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead || lead.coach_id !== coachId) return { ok: false, reason: "lead_not_found" };

  const { data: coach } = await adminClient
    .from("coaches")
    .select("name, voice_model, public_booking_url, autonomous_mode, sales_toolkit")
    .eq("id", coachId)
    .maybeSingle();
  if (!coach) return { ok: false, reason: "coach_not_found" };

  const voiceModelParsed = VoiceProfileSchema.safeParse(coach.voice_model);
  if (!voiceModelParsed.success) return { ok: false, reason: "no_voice_model" };

  // Latest transcript drives context; full history is kept for later.
  const { data: latestTranscript } = await adminClient
    .from("transcripts")
    .select("content")
    .eq("lead_id", leadId)
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const transcript = latestTranscript?.content ?? null;

  // A reply IS mid-conversation: feed every message already sent to this lead
  // (across any sequence) so the model writes a coherent next reply rather than
  // a fresh outreach. Unlike touchpoints, this is NOT scoped to one sequence.
  const { data: sentDrafts } = await adminClient
    .from("drafts")
    .select("body")
    .eq("lead_id", leadId)
    .eq("coach_id", coachId)
    .eq("status", "sent")
    .order("sent_at", { ascending: true });
  const conversationHistory =
    sentDrafts && sentDrafts.length > 0 ? sentDrafts.map((d) => d.body).join("\n\n") : null;

  // The lead's ACTUAL inbound message(s), the ground truth the reply must
  // answer. The prompt's "replied" framing reads from <lead_reply>; without this
  // the draft is written blind. Resolved in layers, most-authoritative first, so
  // a flaky Gmail call or a stale thread can't make us answer the wrong message:
  //   1. The `received` rows monitor.ts already persisted for this lead since our
  //      last outbound, durable, body-captured, burst-coalesced, no live call.
  //   2. The exact triggering message fetched by id (covers replies recorded
  //      before this row existed, or a layer-1 storage hiccup).
  //   3. A scan of the Gmail thread (legacy best-effort).
  // If all layers are empty the draft is written blind, but the prompt's
  // no-inbound framing keeps it sane and we never auto-send it (status forced
  // to pending below), so a missed inbound is reviewable, never a phantom send.
  let inboundMessages: string | null = null;

  // Layer 1, stored inbound after our most recent outbound.
  try {
    const { data: lastSent } = await adminClient
      .from("email_events")
      .select("created_at")
      .eq("lead_id", leadId)
      .eq("coach_id", coachId)
      .eq("event_type", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let receivedQuery = adminClient
      .from("email_events")
      .select("raw_payload, created_at")
      .eq("lead_id", leadId)
      .eq("coach_id", coachId)
      .eq("event_type", "received")
      .order("created_at", { ascending: true });
    if (lastSent?.created_at) {
      receivedQuery = receivedQuery.gt("created_at", lastSent.created_at);
    }

    const { data: received } = await receivedQuery;
    if (received && received.length > 0) {
      const bodies = received.map((r) => {
        const p = (r.raw_payload ?? {}) as { body?: string; snippet?: string };
        return p.body || p.snippet || "";
      });
      inboundMessages = formatInboundMessages(bodies);
    }
  } catch {
    console.error("[generateReplyDraft] stored-inbound read failed", { leadId });
  }

  // Layer 2, the exact message that triggered this reply, by id.
  if (!inboundMessages && messageId) {
    const msg = await fetchMessageById(coachId, messageId);
    if (msg) inboundMessages = formatInboundMessages([msg.body || msg.snippet]);
  }

  // Layer 3, legacy thread scan.
  if (!inboundMessages) {
    try {
      let scanThreadId = threadId ?? null;
      if (!scanThreadId) {
        const { data: threadEvent } = await adminClient
          .from("email_events")
          .select("gmail_thread_id")
          .eq("lead_id", leadId)
          .eq("coach_id", coachId)
          .not("gmail_thread_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        scanThreadId = (threadEvent?.gmail_thread_id as string | null) ?? null;
      }
      if (scanThreadId) {
        const thread = await fetchLeadThread(coachId, scanThreadId);
        inboundMessages = extractUnansweredInbound(thread, lead.email);
      }
    } catch {
      console.error("[generateReplyDraft] thread-scan inbound fetch failed", {
        leadId,
      });
    }
  }

  // touchpointIndex is a required prompt hint. The 'replied' leadStatus drives the
  // mid-conversation framing (D-14); we pass the lead's running draft count so the
  // reply is never mistaken for a first outreach.
  const { count: draftCount } = await adminClient
    .from("drafts")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .eq("coach_id", coachId);
  const touchpointIndex = (draftCount ?? 0) + 1;

  const { generateDraft } = await import("@client/ai-engine");
  let generated: Awaited<ReturnType<typeof generateDraft>>;
  try {
    generated = await generateDraft(
      {
        coachId,
        leadId,
        leadStatus: "replied",
        leadName: lead.name,
        aiSummary: lead.ai_summary,
        transcript,
        conversationHistory,
        coachNotes: lead.coach_notes,
        inboundMessages,
        bookingUrl: coach.public_booking_url,
        salesToolkit: coerceSalesToolkit(coach.sales_toolkit),
        touchpointIndex,
        voiceModel: voiceModelParsed.data,
      },
      coach.name,
    );
  } catch (err) {
    console.error("[generateReplyDraft] AI generation failed", { leadId, err });
    return { ok: false, reason: "ai_error" };
  }
  if (!generated) return { ok: false, reason: "ai_null" };

  // Mirror generateTouchpointDraft: only Send-without-review (mode_a) auto-approves.
  // Exception: when we couldn't read the lead's actual inbound, the draft is a
  // best-effort blind continuation, never auto-send that. Force it to pending so
  // the coach reviews it even in mode_a.
  const status: "pending" | "approved" =
    coach.autonomous_mode === "mode_a" && inboundMessages ? "approved" : "pending";
  const now = new Date().toISOString();

  const { data: draft, error: insertError } = await adminClient
    .from("drafts")
    .insert({
      coach_id: coachId,
      lead_id: leadId,
      sequence_id: null,
      body: generated.body,
      subject: generated.subject,
      status,
      confidence_level: generated.confidenceLevel,
      ai_model: AI_MODEL,
      approved_at: status === "approved" ? now : null,
      generation_context: {
        truncation_applied: generated.truncationLog.length > 0,
        truncation_log: generated.truncationLog,
        input_tokens: null,
        quality_flags: generated.qualityFlags,
      },
    })
    .select("id")
    .single();

  if (insertError || !draft) {
    console.error("[generateReplyDraft] draft insert failed", { leadId });
    return { ok: false, reason: "insert_failed" };
  }

  return {
    ok: true,
    draftId: draft.id,
    leadName: lead.name,
    status,
    confidenceLevel: generated.confidenceLevel,
    autonomousMode: coach.autonomous_mode ?? "off",
  };
}
