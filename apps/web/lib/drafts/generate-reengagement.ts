import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { VoiceProfileSchema } from "@client/shared/validators";
import { fetchLeadThread } from "@/lib/gmail/thread";
import { formatThreadAsConversation } from "@/lib/drafts/thread-context";

const AI_MODEL = "claude-sonnet-4-6";

export type GenerateReengagementParams = {
  coachId: string;
  leadId: string;
  /** 1-based re-engagement attempt number. */
  attempt: number;
  /** Total attempts allowed before the lead is marked lost. */
  maxAttempts: number;
};

export type GenerateReengagementResult =
  | {
      ok: true;
      draftId: string;
      leadName: string;
      status: "pending" | "approved";
      confidenceLevel: "high" | "low";
    }
  | { ok: false; reason: string };

/**
 * Bespoke framing for a silence-gated re-engagement nudge. The conversation went
 * quiet AFTER a real reply, so this is neither a cold first-touch nor a response
 * to a fresh message, it reopens an existing thread. Passed via framingOverride
 * so we don't have to mint a new lead_status enum value.
 */
export function buildReengagementFraming(attempt: number, maxAttempts: number): string {
  const base =
    "The lead replied earlier and you had a real exchange, but the conversation has since gone quiet, they have not responded for several days and there is NO new message from them to answer. Write a warm, low-pressure nudge that gently reopens the thread. Reference something specific from the prior conversation in <conversation_history> so it reads as a genuine continuation, not a cold template. Do NOT guilt-trip about the silence, do NOT sound desperate, and do NOT write as if they just messaged you. Offer one clear, easy way forward. Keep it short.";
  if (attempt >= maxAttempts) {
    return (
      base +
      " This is the FINAL re-engagement attempt, keep it especially light, give them an easy out (e.g. \"no pressure at all if the timing isn't right\"), and leave the door open without asking again."
    );
  }
  return base;
}

/**
 * Generates a single standalone (sequence_id = null) re-engagement draft for a
 * lead whose conversation has gone silent after a reply. Mirrors
 * generateReplyDraft but with no inbound message to answer and the bespoke
 * re-engagement framing. The send is owned by the normal approval →
 * draft/send_via_gmail path. Called from the sequence-reengage Inngest function.
 */
export async function generateReengagementDraft(
  params: GenerateReengagementParams,
): Promise<GenerateReengagementResult> {
  const { coachId, leadId, attempt, maxAttempts } = params;

  const { data: lead } = await adminClient
    .from("leads")
    .select("id, name, email, coach_id, ai_summary, coach_notes")
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

  const { data: latestTranscript } = await adminClient
    .from("transcripts")
    .select("content")
    .eq("lead_id", leadId)
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const transcript = latestTranscript?.content ?? null;

  // Build the fullest conversation we can: prefer the real Gmail thread (both
  // sides), fall back to our sent drafts (our side only) if Gmail is unavailable.
  let conversationHistory: string | null = null;
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
      conversationHistory = formatThreadAsConversation(
        thread,
        lead.email,
        lead.name,
        coach.name,
      );
    }
  } catch {
    console.error("[generateReengagementDraft] thread fetch failed; using sent drafts", {
      leadId,
    });
  }
  if (!conversationHistory) {
    const { data: sentDrafts } = await adminClient
      .from("drafts")
      .select("body")
      .eq("lead_id", leadId)
      .eq("coach_id", coachId)
      .eq("status", "sent")
      .order("sent_at", { ascending: true });
    conversationHistory =
      sentDrafts && sentDrafts.length > 0 ? sentDrafts.map((d) => d.body).join("\n\n") : null;
  }

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
        framingOverride: buildReengagementFraming(attempt, maxAttempts),
        leadName: lead.name,
        aiSummary: lead.ai_summary,
        transcript,
        conversationHistory,
        coachNotes: lead.coach_notes,
        inboundMessages: null,
        bookingUrl: coach.public_booking_url,
        touchpointIndex,
        voiceModel: voiceModelParsed.data,
      },
      coach.name,
    );
  } catch {
    console.error("[generateReengagementDraft] AI generation failed", { leadId });
    return { ok: false, reason: "ai_error" };
  }
  if (!generated) return { ok: false, reason: "ai_null" };

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
        reengagement_attempt: attempt,
        reengagement_max_attempts: maxAttempts,
      },
    })
    .select("id")
    .single();

  if (insertError || !draft) {
    console.error("[generateReengagementDraft] draft insert failed", { leadId });
    return { ok: false, reason: "insert_failed" };
  }

  return {
    ok: true,
    draftId: draft.id,
    leadName: lead.name,
    status,
    confidenceLevel: generated.confidenceLevel,
  };
}
