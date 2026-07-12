import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { VoiceProfileSchema, coerceSalesToolkit, coerceLanguage } from "@client/shared/validators";
import type { TLeadStatus } from "@client/shared/types";

const AI_MODEL = "claude-sonnet-4-6";

export type GenerateTouchpointParams = {
  coachId: string;
  leadId: string;
  sequenceId: string;
  touchpointIndex: number; // 1-based
  totalTouchpoints: number;
  track: "no_show" | "call_completed";
  /** Fixed cadence send time (ISO). The draft is generated ~24h before this. */
  scheduledSendAt: string;
};

export type GenerateTouchpointResult =
  | {
      ok: true;
      draftId: string;
      leadName: string;
      status: "pending" | "approved";
      confidenceLevel: "high" | "low";
    }
  | { ok: false; reason: string };

/**
 * Generates one sequence touchpoint draft and persists it with its sequence
 * linkage and fixed send time. Runs server-side (admin client) from the
 * sequence Inngest functions, NOT the manual "Generate Draft" path, which
 * stays unscheduled.
 *
 * The draft is created `pending` (awaits review) unless the coach is in
 * Send-without-review mode (mode_a), where it lands `approved`. Either way the
 * actual send is owned by sequence-scheduled-send at `scheduledSendAt`.
 */
export async function generateTouchpointDraft(
  params: GenerateTouchpointParams,
): Promise<GenerateTouchpointResult> {
  const {
    coachId,
    leadId,
    sequenceId,
    touchpointIndex,
    totalTouchpoints,
    track,
    scheduledSendAt,
  } = params;

  const { data: lead } = await adminClient
    .from("leads")
    .select("id, name, coach_id, ai_summary, ai_summary_protected, coach_notes")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead || lead.coach_id !== coachId) return { ok: false, reason: "lead_not_found" };

  const { data: coach } = await adminClient
    .from("coaches")
    .select("name, voice_model, public_booking_url, autonomous_mode, sales_toolkit, language")
    .eq("id", coachId)
    .maybeSingle();
  if (!coach) return { ok: false, reason: "coach_not_found" };

  const voiceModelParsed = VoiceProfileSchema.safeParse(coach.voice_model);
  if (!voiceModelParsed.success) return { ok: false, reason: "no_voice_model" };
  const language = coerceLanguage(coach.language);

  // Latest transcript drives the next message; full history is kept for later.
  const { data: latestTranscript } = await adminClient
    .from("transcripts")
    .select("content")
    .eq("lead_id", leadId)
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const transcript = latestTranscript?.content ?? null;

  // Conversation history must be scoped to THIS sequence's already-sent
  // touchpoints, not every draft ever sent to the lead. Otherwise touchpoint 1
  // (which should read as a fresh outreach) picks up unrelated prior messages
  // and the model writes a mid-conversation reply instead. For touchpoint 1 this
  // is empty by definition, so the "FIRST outreach" framing holds.
  const { data: sentDrafts } = await adminClient
    .from("drafts")
    .select("body")
    .eq("lead_id", leadId)
    .eq("coach_id", coachId)
    .eq("sequence_id", sequenceId)
    .eq("status", "sent")
    .order("sent_at", { ascending: true });
  const conversationHistory =
    sentDrafts && sentDrafts.length > 0 ? sentDrafts.map((d) => d.body).join("\n\n") : null;

  // Touchpoint 1 uses the track's framing so it opens by acknowledging WHY the
  // sequence started (e.g. the missed call for no_show). Later touchpoints use
  // the generic in-sequence nudge framing so they don't keep re-announcing the
  // no-show on every message.
  const leadStatusForPrompt: TLeadStatus =
    touchpointIndex === 1 ? (track as TLeadStatus) : "in_sequence";

  const { generateDraft } = await import("@client/ai-engine");
  let generated: Awaited<ReturnType<typeof generateDraft>>;
  try {
    generated = await generateDraft(
      {
        coachId,
        leadId,
        language,
        leadStatus: leadStatusForPrompt,
        leadName: lead.name,
        aiSummary: lead.ai_summary,
        transcript,
        conversationHistory,
        coachNotes: lead.coach_notes,
        bookingUrl: coach.public_booking_url,
        salesToolkit: coerceSalesToolkit(coach.sales_toolkit),
        touchpointIndex,
        voiceModel: voiceModelParsed.data,
      },
      coach.name,
    );
  } catch (err) {
    console.error("[generateTouchpointDraft] AI generation failed", {
      leadId,
      touchpointIndex,
      err,
    });
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
      sequence_id: sequenceId,
      body: generated.body,
      subject: generated.subject,
      status,
      touchpoint_index: touchpointIndex,
      total_touchpoints: totalTouchpoints,
      scheduled_send_at: scheduledSendAt,
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
    console.error("[generateTouchpointDraft] draft insert failed", { leadId, touchpointIndex });
    return { ok: false, reason: "insert_failed" };
  }

  // Best-effort lead summary refresh, mirrors the manual route; a failure here
  // must never invalidate the draft we just persisted.
  if (!lead.ai_summary_protected) {
    try {
      const { updateLeadDescription } = await import("@client/ai-engine");
      const summary = await updateLeadDescription({
        leadId,
        coachId,
        leadName: lead.name,
        language,
        transcript: transcript ?? undefined,
        conversationHistory: conversationHistory ?? undefined,
        existingSummary: lead.ai_summary ?? undefined,
        isProtected: lead.ai_summary_protected,
        coachNotes: lead.coach_notes ?? undefined,
      });
      if (summary) {
        await adminClient
          .from("leads")
          .update({ ai_summary: summary })
          .eq("id", leadId)
          .eq("coach_id", coachId);
      }
    } catch (err) {
      console.error("[generateTouchpointDraft] summary refresh failed (draft still valid)", {
        leadId,
        err,
      });
    }
  }

  return {
    ok: true,
    draftId: draft.id,
    leadName: lead.name,
    status,
    confidenceLevel: generated.confidenceLevel,
  };
}
