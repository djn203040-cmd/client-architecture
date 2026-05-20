import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isHardBlocked } from '@client/ai-engine';
import { VoiceProfileSchema } from '@client/shared/validators';
import { inngest } from '@/inngest/client';
import { buildDraftOutcome } from '@/lib/autonomous-mode';
import type { TLeadStatus } from '@client/shared/types';

const GenerateRequestSchema = z.object({
  leadId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { leadId } = parsed.data;

  // Load lead — verify ownership
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, name, status, coach_id, ai_summary, ai_summary_protected, coach_notes')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  if (lead.coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // T-02-13: Hard-block gate
  if (isHardBlocked(lead.status as TLeadStatus)) {
    return NextResponse.json(
      { error: 'Cannot generate draft for a lead in this state.' },
      { status: 409 },
    );
  }

  // Load voice model
  const { data: coach, error: coachError } = await supabase
    .from('coaches')
    .select('voice_model, name, autonomous_mode')
    .eq('id', user.id)
    .single();

  if (coachError || !coach) {
    return NextResponse.json({ error: 'Coach record not found' }, { status: 500 });
  }

  const voiceModelRaw = coach.voice_model;
  const voiceModelParsed = VoiceProfileSchema.safeParse(voiceModelRaw);

  if (!voiceModelParsed.success || !voiceModelRaw) {
    return NextResponse.json(
      {
        error:
          'Set up your voice model in Settings → My Voice before generating drafts.',
      },
      { status: 400 },
    );
  }

  const voiceModel = voiceModelParsed.data;

  // Count existing drafts for this lead to determine touchpoint_index
  const { count: draftCount } = await supabase
    .from('drafts')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('coach_id', user.id);

  const touchpointIndex = (draftCount ?? 0) + 1;

  // Insert a 'generating' draft row — client subscribes to this ID
  const { data: draft, error: insertError } = await supabase
    .from('drafts')
    .insert({
      coach_id: user.id,
      lead_id: leadId,
      body: '',
      status: 'generating',
      touchpoint_index: touchpointIndex,
      ai_model: 'claude-sonnet-4-6',
    })
    .select('id')
    .single();

  if (insertError || !draft) {
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }

  const draftId = draft.id;
  const coachName = coach.name;
  const coachId = user.id;
  const autonomousMode = coach.autonomous_mode as string | null;

  // Fire-and-forget generation
  void (async () => {
    try {
      const { generateDraft, updateLeadDescription } = await import('@client/ai-engine');

      // Fetch transcript (oldest-first per TRANS-008)
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

      // Fetch prior sent emails as conversation history
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
          touchpointIndex,
          voiceModel,
        },
        coachName,
      );

      if (!result) {
        await supabase
          .from('drafts')
          .update({ status: 'error' })
          .eq('id', draftId);
        return;
      }

      const now = new Date().toISOString();
      const outcome = buildDraftOutcome(
        autonomousMode,
        draftId,
        coachId,
        lead.name,
        result.confidenceLevel,
        now,
      );

      await supabase
        .from('drafts')
        .update({
          body: result.body,
          status: outcome.status,
          confidence_level: result.confidenceLevel,
          generation_context: {
            truncation_applied: result.truncationLog.length > 0,
            truncation_log: result.truncationLog,
            input_tokens: null,
            quality_flags: result.qualityFlags,
          },
        })
        .eq('id', draftId);

      await Promise.all(
        outcome.events.map((e) =>
          inngest.send(e as Parameters<typeof inngest.send>[0]),
        ),
      );

      // D-19: Update ai_summary if not protected
      if (!lead.ai_summary_protected) {
        const summary = await updateLeadDescription({
          leadId,
          coachId,
          leadName: lead.name,
          transcript: transcript ?? undefined,
          conversationHistory: conversationHistory ?? undefined,
          existingSummary: lead.ai_summary ?? undefined,
          isProtected: lead.ai_summary_protected,
          coachNotes: lead.coach_notes ?? undefined,
        });

        if (summary) {
          await supabase
            .from('leads')
            .update({ ai_summary: summary })
            .eq('id', leadId)
            .eq('coach_id', coachId);
        }
      }
    } catch {
      await supabase
        .from('drafts')
        .update({ status: 'error' })
        .eq('id', draftId);
    }
  })();

  return NextResponse.json({ draftId, status: 'generating' }, { status: 202 });
}
