import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { VoiceProfileSchema } from "@client/shared/validators";
import { fetchLeadThread } from "@/lib/gmail/thread";
import { extractUnansweredInbound } from "@/lib/drafts/thread-context";

const AI_MODEL = "claude-sonnet-4-6";

export type GenerateReplyParams = {
  coachId: string;
  leadId: string;
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
 * "draft/generate" Inngest consumer — every generation path calls a function
 * like this one synchronously inside a step.
 */
export async function generateReplyDraft(
  params: GenerateReplyParams,
): Promise<GenerateReplyResult> {
  const { coachId, leadId } = params;

  const { data: lead } = await adminClient
    .from("leads")
    .select("id, name, email, coach_id, ai_summary, ai_summary_protected, coach_notes")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead || lead.coach_id !== coachId) return { ok: false, reason: "lead_not_found" };

  const { data: coach } = await adminClient
    .from("coaches")
    .select("name, voice_model, public_booking_url, autonomous_mode")
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

  // The lead's ACTUAL inbound message(s) — the ground truth the reply must
  // answer. The prompt's "replied" framing reads from <lead_reply>; without this
  // the draft is written blind to what the lead said. Pull the Gmail thread and
  // take every message from the lead since our last outbound, so a burst of
  // replies is answered together. Best-effort: a Gmail hiccup degrades to no
  // inbound block rather than failing the whole draft.
  let inboundMessages: string | null = null;
  try {
    const { data: threadEvent } = await adminClient
      .from("email_events")
      .select("gmail_thread_id")
      .eq("lead_id", leadId)
      .eq("coach_id", coachId)
      .not("gmail_thread_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (threadEvent?.gmail_thread_id) {
      const thread = await fetchLeadThread(coachId, threadEvent.gmail_thread_id);
      inboundMessages = extractUnansweredInbound(thread, lead.email);
    }
  } catch {
    console.error("[generateReplyDraft] inbound fetch failed; proceeding without", {
      leadId,
    });
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
  const status: "pending" | "approved" =
    coach.autonomous_mode === "mode_a" ? "approved" : "pending";
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
