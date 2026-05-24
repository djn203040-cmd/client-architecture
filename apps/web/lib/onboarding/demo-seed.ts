import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDraft } from "@client/ai-engine";
import type { Database } from "@client/database";

type AdminClient = SupabaseClient<Database>;

const DEMO_TRANSCRIPT = `
Coach: Thanks for making time today. Tell me a bit about where you're at right now.

Alex: Honestly, I feel like I've been running in place for two years. I'm doing all the "right" things — working out, journaling, good job — but I still feel stuck. Like something's missing and I can't name it.

Coach: That feeling of doing the work but still not moving — what does that cost you day to day?

Alex: It's subtle but it's there. I second-guess decisions way more than I used to. I'll spend a week overthinking something that should take an hour. And then I feel bad about the overthinking, which makes everything slower.

Coach: What would it look like for you to trust yourself again — what's the first decision you'd make differently?

Alex: I'd probably stop waiting for the "perfect moment" to apply for that senior role I've been eyeing for eight months. I keep telling myself I'm not ready, but I know that's not really true.

Coach: That's a really honest thing to say. Here's what I'm hearing: you already know what you want. You're just waiting for someone to give you permission. What if that person was you?

Alex: [pause] That hits harder than I expected. I think I've been waiting for external validation my whole career. This is the first time I've framed it like that.
`.trim();

// Demo marker stored in generation_context since drafts table doesn't have external_ids
const DEMO_GENERATION_CONTEXT = { demo: true };

export async function seedDemoLeadForCoach(
  coachId: string,
  adminClient: AdminClient,
): Promise<{ leadId: string; draftId: string }> {
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
  } else {
    const { data: lead, error: leadErr } = await adminClient
      .from("leads")
      .insert({
        coach_id: coachId,
        name: "Demo Lead — Alex Rivera",
        email: `demo+${coachId}@sonorous.test`,
        source: "manual",
        status: "call_completed",
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
      content: DEMO_TRANSCRIPT,
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

  if (existingDraft) {
    return { leadId, draftId: existingDraft.id };
  }

  // Fetch coach voice model + name for generation
  const { data: coach } = await adminClient
    .from("coaches")
    .select("name, voice_model")
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
          leadStatus: "call_completed",
          leadName: "Alex Rivera",
          aiSummary:
            "Lead feels stuck despite doing 'the right things'. Identifies pattern of waiting for external validation. Key insight: knows what they want (senior role application) but seeks permission.",
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
      // Voice model may not be complete yet — use fallback body
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

  return { leadId, draftId: draft.id };
}
