import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptTranscript } from "@/lib/crypto/transcript-cipher";
import { generateDraft } from "@client/ai-engine";
import { coerceLanguage } from "@client/shared/validators";
import type { Database } from "@client/database";

type AdminClient = SupabaseClient<Database>;

const DEMO_TRANSCRIPT = `
Coach: Thanks for making time today. Tell me a bit about where you're at right now.

Alex: Honestly, I feel like I've been running in place for two years. I'm doing all the "right" things, working out, journaling, good job, but I still feel stuck. Like something's missing and I can't name it.

Coach: That feeling of doing the work but still not moving, what does that cost you day to day?

Alex: It's subtle but it's there. I second-guess decisions way more than I used to. I'll spend a week overthinking something that should take an hour. And then I feel bad about the overthinking, which makes everything slower.

Coach: What would it look like for you to trust yourself again, what's the first decision you'd make differently?

Alex: I'd probably stop waiting for the "perfect moment" to apply for that senior role I've been eyeing for eight months. I keep telling myself I'm not ready, but I know that's not really true.

Coach: That's a really honest thing to say. Here's what I'm hearing: you already know what you want. You're just waiting for someone to give you permission. What if that person was you?

Alex: [pause] That hits harder than I expected. I think I've been waiting for external validation my whole career. This is the first time I've framed it like that.
`.trim();

// Demo marker stored in generation_context since drafts table doesn't have external_ids
const DEMO_GENERATION_CONTEXT = { demo: true };

// The AI-written lead description shown on the profile. Kept in sync with the
// aiSummary passed to generateDraft so the demo reads coherently.
const DEMO_SUMMARY =
  "Alex feels stuck despite doing everything 'right', training, journaling, a good job, and can't name what's missing. Over-thinks and second-guesses decisions. The real block: they've wanted a senior role for eight months but keep waiting for the 'perfect moment' and external permission. The opening is helping Alex give themselves that permission.";

interface SeedOptions {
  /**
   * Tour mode. Produces a fuller, always-fresh demo: sets the AI lead
   * description, enrolls a demo sequence, and (re)sets the demo draft to a
   * pending, sequence-linked message so it appears both on the lead profile
   * and in the Drafts queue, ready to approve during the walkthrough.
   */
  rich?: boolean;
}

export async function seedDemoLeadForCoach(
  coachId: string,
  adminClient: AdminClient,
  opts: SeedOptions = {},
): Promise<{ leadId: string; draftId: string }> {
  const rich = opts.rich ?? false;

  // Idempotency: check for existing demo lead (leads table has external_ids)
  const { data: existing } = await adminClient
    .from("leads")
    .select("id")
    .eq("coach_id", coachId)
    .eq("external_ids->>demo" as never, "true")
    .maybeSingle();

  let leadId: string;

  if (existing) {
    leadId = existing.id;
    if (rich) {
      // Refresh the demo to a clean, coherent state each time the tour runs.
      await adminClient
        .from("leads")
        .update({ ai_summary: DEMO_SUMMARY, status: "in_sequence" })
        .eq("id", leadId);
    }
  } else {
    const { data: lead, error: leadErr } = await adminClient
      .from("leads")
      .insert({
        coach_id: coachId,
        name: "Demo Lead, Alex Rivera",
        email: `demo+${coachId}@sonorous.test`,
        source: "manual",
        status: rich ? "in_sequence" : "call_completed",
        ai_summary: DEMO_SUMMARY,
        external_ids: { demo: true },
      })
      .select("id")
      .single();

    if (leadErr || !lead) throw new Error(`Failed to seed demo lead: ${leadErr?.message}`);
    leadId = lead.id;

    // Transcript uses external_id (string) to mark demo since it has no external_ids JSONB
    await adminClient.from("transcripts").insert({
      coach_id: coachId,
      lead_id: leadId,
      content: encryptTranscript(DEMO_TRANSCRIPT),
      provider: "manual",
      external_id: "demo",
    });
  }

  // Idempotency: check for existing demo draft (marked via generation_context)
  const { data: existingDraft } = await adminClient
    .from("drafts")
    .select("id")
    .eq("coach_id", coachId)
    .eq("lead_id", leadId)
    .eq("generation_context->>demo" as never, "true")
    .maybeSingle();

  let draftId: string;

  if (existingDraft) {
    draftId = existingDraft.id;
  } else {
    // Fetch coach voice model + name for generation
    const { data: coach } = await adminClient
      .from("coaches")
      .select("name, voice_model, language")
      .eq("id", coachId)
      .single();

    let draftBody =
      "Thank you for our conversation today, Alex. I appreciated your honesty and self-awareness. I'd love to continue exploring what's possible for you. Shall we schedule a follow-up?";

    if (coach?.voice_model) {
      try {
        const result = await generateDraft(
          {
            coachId,
            leadId,
            language: coerceLanguage(coach.language),
            leadStatus: "call_completed",
            leadName: "Alex Rivera",
            aiSummary: DEMO_SUMMARY,
            transcript: DEMO_TRANSCRIPT,
            conversationHistory: null,
            coachNotes: null,
            bookingUrl: null,
            touchpointIndex: 1,
            voiceModel: coach.voice_model as never,
          },
          coach.name,
        );
        if (result) draftBody = result.body;
      } catch {
        // Voice model may not be complete yet, use fallback body
      }
    }

    const { data: draft, error: draftErr } = await adminClient
      .from("drafts")
      .insert({
        coach_id: coachId,
        lead_id: leadId,
        body: draftBody,
        status: "pending",
        generation_context: DEMO_GENERATION_CONTEXT,
      })
      .select("id")
      .single();

    if (draftErr || !draft) throw new Error(`Failed to create demo draft: ${draftErr?.message}`);
    draftId = draft.id;
  }

  if (rich) {
    // Enroll a demo sequence so the profile's Sequence panel and the Drafts
    // queue both have real content. Idempotent: reuse any sequence on the lead.
    const { data: seq } = await adminClient
      .from("sequences")
      .select("id")
      .eq("lead_id", leadId)
      .limit(1)
      .maybeSingle();

    let sequenceId = seq?.id ?? null;
    if (!sequenceId) {
      const { data: newSeq } = await adminClient
        .from("sequences")
        .insert({ coach_id: coachId, lead_id: leadId, track: "call_completed", status: "active" })
        .select("id")
        .single();
      sequenceId = newSeq?.id ?? null;
    }

    // Reset the demo draft to a fresh, sequence-linked pending message. This is
    // what the coach reviews on the profile and finds waiting in the queue.
    if (sequenceId) {
      const scheduledSendAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await adminClient
        .from("drafts")
        .update({
          sequence_id: sequenceId,
          touchpoint_index: 2,
          total_touchpoints: 3,
          scheduled_send_at: scheduledSendAt,
          subject: "Following up on our conversation",
          status: "pending",
        })
        .eq("id", draftId);
    }
  }

  return { leadId, draftId };
}
