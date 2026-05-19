import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isHardBlocked } from '@client/ai-engine';
import { VoiceProfileSchema } from '@client/shared/validators';
import type { TLeadStatus } from '@client/shared/types';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load draft + ownership check (T-02-21)
  const { data: draft } = await supabase
    .from('drafts')
    .select('coach_id, lead_id, touchpoint_index')
    .eq('id', id)
    .maybeSingle();
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (draft.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { lead_id: leadId, touchpoint_index: touchpointIndex } = draft;
  const coachId = user.id;

  // Load lead fresh (AI-011 — regenerate with current state, not cached snapshot)
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, status, ai_summary, ai_summary_protected, coach_notes')
    .eq('id', leadId)
    .single();
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // T-02-22: Hard-block gate (generateDraft also checks; reject early to avoid spurious 'error' state)
  if (isHardBlocked(lead.status as TLeadStatus)) {
    return NextResponse.json(
      { error: 'Cannot regenerate draft for a lead in this state.' },
      { status: 409 },
    );
  }

  // Load voice model
  const { data: coach } = await supabase
    .from('coaches')
    .select('voice_model, name')
    .eq('id', coachId)
    .single();
  if (!coach) return NextResponse.json({ error: 'Coach record not found' }, { status: 500 });

  const voiceModelParsed = VoiceProfileSchema.safeParse(coach.voice_model);
  if (!voiceModelParsed.success || !coach.voice_model) {
    return NextResponse.json(
      { error: 'Set up your voice model in Settings → My Voice before regenerating drafts.' },
      { status: 400 },
    );
  }

  const voiceModel = voiceModelParsed.data;
  const coachName = coach.name;

  // D-23: Mark generating in place (no new row)
  await supabase.from('drafts').update({ status: 'generating' }).eq('id', id);

  // Fire-and-forget regeneration
  void (async () => {
    try {
      const { generateDraft } = await import('@client/ai-engine');

      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('content')
        .eq('lead_id', leadId)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: true });

      const transcript =
        transcripts && transcripts.length > 0
          ? transcripts.map((t) => t.content).join('\n\n---\n\n')
          : null;

      const { data: sentDrafts } = await supabase
        .from('drafts')
        .select('body, created_at')
        .eq('lead_id', leadId)
        .eq('coach_id', coachId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: true });

      const conversationHistory =
        sentDrafts && sentDrafts.length > 0
          ? sentDrafts.map((d) => d.body).join('\n\n')
          : null;

      const result = await generateDraft(
        {
          coachId,
          leadId,
          leadStatus: lead.status as TLeadStatus,
          leadName: lead.name,
          aiSummary: lead.ai_summary,
          transcript,
          conversationHistory,
          coachNotes: lead.coach_notes,
          touchpointIndex: touchpointIndex ?? 1,
          voiceModel,
        },
        coachName,
      );

      if (!result) {
        await supabase.from('drafts').update({ status: 'error' }).eq('id', id);
        return;
      }

      await supabase
        .from('drafts')
        .update({
          body: result.body,
          status: 'pending',
          confidence_level: result.confidenceLevel,
          generation_context: {
            truncation_applied: result.truncationLog.length > 0,
            truncation_log: result.truncationLog,
            input_tokens: null,
            quality_flags: result.qualityFlags,
          },
        })
        .eq('id', id);
    } catch {
      await supabase.from('drafts').update({ status: 'error' }).eq('id', id);
    }
  })();

  return NextResponse.json({ draftId: id, status: 'generating' }, { status: 202 });
}
