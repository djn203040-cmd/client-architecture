// INFRA-008: Server-only package. Hard-fail if imported in browser context.
if (typeof window !== "undefined") {
  throw new Error(
    "@client/ai-engine must not be imported in client-side code. " +
    "This package wraps Anthropic API calls (server-only)."
  );
}

import { anthropic } from './client';
import { buildVoiceAnalysisPrompt } from './prompts/voice-analysis';
import { buildLeadDescriptionPrompt } from './prompts/lead-description';
import { VoiceProfileSchema } from '@client/shared/validators';
import { assembleContext } from './context-assembler';
import { countTokens } from './token-counter';
import { isHardBlocked, scanNeverSayList, assertCoachIdScope, stripDashes } from './guardrails';
import { traceGeneration } from './tracing';
import type { VoiceAnalysisParams, DraftGenerationParams } from './types';
import type { TVoiceProfile } from '@client/shared/validators';

export { isHardBlocked, scanNeverSayList, assertCoachIdScope, stripDashes } from './guardrails';
export type { DraftGenerationParams, VoiceAnalysisParams, VoiceAnalysisResult } from './types';

export class VoiceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceParseError';
  }
}

function extractVoiceProfile(text: string): unknown {
  const match = text.match(/<voice_profile>([\s\S]*?)<\/voice_profile>/);
  if (!match || match[1] === undefined) throw new VoiceParseError('No <voice_profile> block found in response');
  try {
    return JSON.parse(match[1].trim());
  } catch (err) {
    // Malformed JSON (e.g. an unescaped quote) — surface as a VoiceParseError
    // so analyzeVoiceCorpus retries with a corrective instruction instead of
    // failing outright.
    const reason = err instanceof Error ? err.message : 'unknown parse error';
    throw new VoiceParseError(`Voice profile JSON did not parse: ${reason}`);
  }
}

export async function analyzeVoiceCorpus(params: VoiceAnalysisParams): Promise<TVoiceProfile> {
  const { system, user } = buildVoiceAnalysisPrompt(params);

  const attempt = async (extraInstruction?: string): Promise<TVoiceProfile> => {
    const userContent = extraInstruction ? `${user}\n\n${extraInstruction}` : user;
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userContent }],
    });

    const block = message.content[0];
    if (!block || block.type !== 'text') throw new VoiceParseError('Unexpected content block type from Anthropic');

    const parsed = extractVoiceProfile(block.text);
    const result = VoiceProfileSchema.safeParse(parsed);
    if (!result.success) {
      throw new VoiceParseError(`Voice profile schema validation failed: ${result.error.message}`);
    }
    // The corpus may contain em/en dashes, but the product never uses them.
    // Strip them from the stored examples + phrases so the few-shot context
    // doesn't teach the draft model a habit the system prompt forbids.
    return {
      ...result.data,
      selected_examples: result.data.selected_examples.map(stripDashes),
      opener_phrases: result.data.opener_phrases.map(stripDashes),
      closer_phrases: result.data.closer_phrases.map(stripDashes),
    };
  };

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof VoiceParseError) {
      return await attempt(
        'IMPORTANT: Your previous response did not match the required JSON schema. Return ONLY a JSON object inside <voice_profile>...</voice_profile> tags with all required fields.'
      );
    }
    throw err;
  }
}

export interface GenerateDraftResult {
  body: string;
  // Subject line the model produced for this draft. null when the model
  // omitted the <subject> tag — the send path falls back (Re:<thread> when
  // threading, otherwise a neutral default).
  subject: string | null;
  confidenceLevel: 'high' | 'low';
  truncationLog: string[];
  qualityFlags: string[];
}

/**
 * Splits a raw model response into its <subject> line and the email body.
 * The model is instructed to emit `<subject>...</subject>` followed by the
 * body; if the tag is missing we keep the whole response as the body and
 * return a null subject.
 */
export function parseSubjectAndBody(raw: string): { subject: string | null; body: string } {
  const match = raw.match(/<subject>([\s\S]*?)<\/subject>/i);
  const subject = match && match[1] !== undefined ? match[1].trim() : '';
  const body = raw.replace(/<subject>[\s\S]*?<\/subject>/i, '').trim();
  return { subject: subject.length > 0 ? subject : null, body };
}

export async function generateDraft(
  params: DraftGenerationParams,
  coachName: string,
): Promise<GenerateDraftResult | null> {
  // T-02-13: Hard-block gate — must run before any API call
  if (isHardBlocked(params.leadStatus)) return null;

  if (!params.voiceModel) {
    throw new Error('Voice model is required to generate a draft.');
  }

  // T-02-14: Scope check
  assertCoachIdScope(params.coachId, params.coachId);

  const ctx = await assembleContext(params, coachName);

  // AI-004: Token gate before the real API call
  const inputTokens = await countTokens(ctx.systemPrompt, ctx.userPrompt);

  const attemptGeneration = async (): Promise<string> => {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: ctx.systemPrompt,
      messages: [{ role: 'user', content: ctx.userPrompt }],
    });
    const block = message.content[0];
    if (!block || block.type !== 'text') throw new Error('Unexpected content block type from Anthropic');
    return block.text.trim();
  };

  let parsed = parseSubjectAndBody(await attemptGeneration());
  const qualityFlags: string[] = [];

  // AI-003: Never-say scan with one auto-regen attempt. The scan only looks at
  // the body — the subject is short and shares the same voice constraints.
  const violations = scanNeverSayList(parsed.body, params.voiceModel.never_say_list);
  if (violations.length > 0) {
    parsed = parseSubjectAndBody(await attemptGeneration());
    const secondViolations = scanNeverSayList(parsed.body, params.voiceModel.never_say_list);
    if (secondViolations.length > 0) {
      qualityFlags.push('never_say_violation');
    }
  }

  // AI-015: Language + voice review pass ("double-check"). A second model call
  // proofreads the draft against the coach's real examples to guarantee native
  // fluency in the examples' language (no stray foreign words, no calques, no
  // grammar errors) while preserving the voice, meaning, and URL. Best-effort:
  // if it fails or returns nothing usable, keep the original draft.
  const reviewed = await reviewDraft(params.voiceModel, coachName, parsed.subject, parsed.body);
  if (reviewed) {
    parsed = reviewed;
    // Re-scan after the rewrite so a reintroduced banned phrase is still flagged.
    if (scanNeverSayList(parsed.body, params.voiceModel.never_say_list).length > 0) {
      if (!qualityFlags.includes('never_say_violation')) {
        qualityFlags.push('never_say_violation');
      }
    }
  } else {
    qualityFlags.push('review_skipped');
  }

  // Hard guarantee: no em-dash / en-dash ever reaches a coach, regardless of
  // what the model produced. Applies to both subject and body.
  const body = stripDashes(parsed.body);
  const subject = parsed.subject ? stripDashes(parsed.subject) : null;

  traceGeneration('generateDraft', {
    leadId: params.leadId,
    coachId: params.coachId,
    confidenceLevel: ctx.confidenceLevel,
    truncationLog: ctx.truncationLog,
    inputTokens,
  });

  return {
    body,
    subject,
    confidenceLevel: ctx.confidenceLevel,
    truncationLog: ctx.truncationLog,
    qualityFlags,
  };
}

export async function updateLeadDescription(params: {
  leadId: string;
  coachId: string;
  leadName: string;
  transcript?: string;
  conversationHistory?: string;
  existingSummary?: string;
  isProtected: boolean;
  coachNotes?: string;
}): Promise<string | null> {
  // D-22: Coach edits win — never overwrite a protected summary
  if (params.isProtected) return null;

  const { system, user } = buildLeadDescriptionPrompt({
    transcript: params.transcript,
    conversationHistory: params.conversationHistory,
    existingSummary: params.existingSummary,
    coachNotes: params.coachNotes,
    leadName: params.leadName,
  });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const block = message.content[0];
  if (!block || block.type !== 'text') return null;

  traceGeneration('updateLeadDescription', {
    leadId: params.leadId,
    coachId: params.coachId,
  });

  return block.text.trim();
}
