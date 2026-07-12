import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isHardBlocked } from '@client/ai-engine';
import { VoiceProfileSchema, coerceSalesToolkit } from '@client/shared/validators';
import { inngest } from '@/inngest/client';
import { buildDraftOutcome } from '@/lib/autonomous-mode';
import { draftsGenerateLimiter, enforce } from '@/lib/security/ratelimit';
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

  // Cost-guard rate limit (T-06-02-06): 20 draft generations per coach per hour.
  const rl = await enforce(draftsGenerateLimiter, `coach:${user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded, try again in an hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { leadId } = parsed.data;

  // Load lead, verify ownership
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

  // Load voice model + booking URL for the AI prompt
  const { data: coach, error: coachError } = await supabase
    .from('coaches')
    .select('voice_model, name, autonomous_mode, public_booking_url, sales_toolkit')
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

  // Insert a 'generating' draft row, client subscribes to this ID
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

  // Background generation, `after()` keeps the lambda alive on Vercel until
  // this work finishes. Plain fire-and-forget (`void (async () => …)()`) was
  // killed when the 202 response returned, leaving the draft row stuck at
  // status='generating' and the client spinner spinning forever.
  after(async () => {
    let transcript: string | null = null;
    let conversationHistory: string | null = null;
    let generated: Awaited<ReturnType<typeof import('@client/ai-engine').generateDraft>> = null;

    // PHASE 1: AI generation, failure here means the draft is unusable, flip to 'error'
    try {
      const { generateDraft } = await import('@client/ai-engine');

      // Day-to-day drafts use the LATEST transcript only. Full transcript history
      // is kept in the DB and will be consumed by the future "Continuation" module
      // for recap-style messages. For now: most-recent call drives the next message.
      const { data: latestTranscript } = await supabase
        .from('transcripts')
        .select('content')
        .eq('lead_id', leadId)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      transcript = latestTranscript?.content ?? null;

      const { data: sentDrafts } = await supabase
        .from('drafts')
        .select('body, created_at')
        .eq('lead_id', leadId)
        .eq('coach_id', coachId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: true });
      conversationHistory =
        sentDrafts && sentDrafts.length > 0
          ? sentDrafts.map((d) => d.body).join('\n\n')
          : null;

      generated = await generateDraft(
        {
          coachId,
          leadId,
          leadStatus: lead.status as TLeadStatus,
          leadName: lead.name,
          aiSummary: lead.ai_summary,
          transcript,
          conversationHistory,
          coachNotes: lead.coach_notes,
          bookingUrl: coach.public_booking_url,
          salesToolkit: coerceSalesToolkit(coach.sales_toolkit),
          touchpointIndex,
          voiceModel,
        },
        coachName,
      );
    } catch (err) {
      console.error('[drafts/generate] AI generation failed', { draftId, err });
      await supabase.from('drafts').update({ status: 'error' }).eq('id', draftId);
      return;
    }

    if (!generated) {
      await supabase.from('drafts').update({ status: 'error' }).eq('id', draftId);
      return;
    }

    // PHASE 2: persist successful draft, once this lands the draft is "ready"
    const now = new Date().toISOString();
    const outcome = buildDraftOutcome(
      autonomousMode,
      draftId,
      coachId,
      lead.name,
      generated.confidenceLevel,
      now,
    );

    const { error: persistError } = await supabase
      .from('drafts')
      .update({
        body: generated.body,
        subject: generated.subject,
        status: outcome.status,
        confidence_level: generated.confidenceLevel,
        generation_context: {
          truncation_applied: generated.truncationLog.length > 0,
          truncation_log: generated.truncationLog,
          input_tokens: null,
          quality_flags: generated.qualityFlags,
        },
      })
      .eq('id', draftId);

    if (persistError) {
      console.error('[drafts/generate] persist failed', { draftId, persistError });
      await supabase.from('drafts').update({ status: 'error' }).eq('id', draftId);
      return;
    }

    // PHASE 3: side-effects, failures here MUST NOT flip the draft to 'error'.
    // The draft is already valid and visible to the coach.
    try {
      await Promise.all(
        outcome.events.map((e) =>
          inngest.send(e as Parameters<typeof inngest.send>[0]),
        ),
      );
    } catch (err) {
      console.error('[drafts/generate] inngest events failed (draft still valid)', {
        draftId,
        err,
      });
    }

    // D-19: Update ai_summary if not protected, best-effort, never poisons the draft
    if (!lead.ai_summary_protected) {
      try {
        const { updateLeadDescription } = await import('@client/ai-engine');
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
      } catch (err) {
        console.error('[drafts/generate] ai_summary refresh failed (draft still valid)', {
          draftId,
          err,
        });
      }
    }
  });

  return NextResponse.json({ draftId, status: 'generating' }, { status: 202 });
}
