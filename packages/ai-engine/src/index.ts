// INFRA-008: Server-only package. Hard-fail if imported in browser context.
if (typeof window !== "undefined") {
  throw new Error(
    "@client/ai-engine must not be imported in client-side code. " +
    "This package wraps Anthropic API calls (server-only)."
  );
}

import { anthropic } from './client';
import { buildVoiceAnalysisPrompt } from './prompts/voice-analysis';
import { buildVoiceRefinePrompt } from './prompts/voice-refine';
import { buildLeadDescriptionPrompt } from './prompts/lead-description';
import { VoiceProfileSchema } from '@client/shared/validators';
import { assembleContext } from './context-assembler';
import { countTokens } from './token-counter';
import { isHardBlocked, scanNeverSayList, assertCoachIdScope, stripDashes } from './guardrails';
import { traceGeneration } from './tracing';
import { recordUsage } from './usage';
import { buildReviewPrompt } from './prompts/review';
import type { VoiceAnalysisParams, DraftGenerationParams } from './types';
import type { TVoiceProfile, TLanguage } from '@client/shared/validators';

// Model routing. Draft generation and voice analysis are voice/quality-critical
// and stay on Sonnet; the review pass is a mechanical native-language proofread,
// so it runs on Haiku (~3x cheaper), see reviewDraft.
const DRAFT_MODEL = 'claude-sonnet-4-6';
const REVIEW_MODEL = 'claude-haiku-4-5';
const VOICE_MODEL = 'claude-sonnet-4-6';
const DESCRIPTION_MODEL = 'claude-sonnet-4-6';

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
    // Malformed JSON (e.g. an unescaped quote), surface as a VoiceParseError
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
      model: VOICE_MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userContent }],
    });
    await recordUsage({
      coachId: params.coachId,
      operation: 'voice_analysis',
      model: VOICE_MODEL,
      usage: message.usage,
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

function extractUsageRules(text: string): string[] {
  const match = text.match(/<usage_rules>([\s\S]*?)<\/usage_rules>/);
  if (!match || match[1] === undefined) throw new VoiceParseError('No <usage_rules> block found in response');
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1].trim());
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown parse error';
    throw new VoiceParseError(`Usage rules JSON did not parse: ${reason}`);
  }
  const rules = (parsed as { rules?: unknown } | null)?.rules;
  if (!Array.isArray(rules) || !rules.every((r): r is string => typeof r === 'string')) {
    throw new VoiceParseError('Usage rules payload must be { "rules": string[] }');
  }
  return rules;
}

/**
 * Voice fine-tuning loop: given a draft that didn't sound like the coach and
 * their critique, returns 1-3 short usage rules to append to the voice model.
 * Voice-quality-critical, so it runs on Sonnet. Returns cleaned, de-duplicated,
 * non-empty rule strings (may be empty when the critique warrants no rule).
 */
export async function refineVoiceRules(params: {
  coachId: string;
  voiceModel: TVoiceProfile;
  draftBody: string;
  critique: string;
}): Promise<string[]> {
  const { system, user } = buildVoiceRefinePrompt({
    voiceModel: params.voiceModel,
    draftBody: params.draftBody,
    critique: params.critique,
  });

  const attempt = async (extraInstruction?: string): Promise<string[]> => {
    const userContent = extraInstruction ? `${user}\n\n${extraInstruction}` : user;
    const message = await anthropic.messages.create({
      model: VOICE_MODEL,
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: userContent }],
    });
    await recordUsage({
      coachId: params.coachId,
      operation: 'voice_refine',
      model: VOICE_MODEL,
      usage: message.usage,
    });
    const block = message.content[0];
    if (!block || block.type !== 'text') throw new VoiceParseError('Unexpected content block type from Anthropic');
    return extractUsageRules(block.text);
  };

  let rules: string[];
  try {
    rules = await attempt();
  } catch (err) {
    if (err instanceof VoiceParseError) {
      rules = await attempt(
        'IMPORTANT: Return ONLY a JSON object inside <usage_rules>...</usage_rules> tags shaped {"rules": string[]}.'
      );
    } else {
      throw err;
    }
  }

  // Clean: strip dashes (the product never uses them, and rules feed the prompt),
  // trim, drop empties, cap length, de-duplicate case-insensitively, limit to 3.
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of rules) {
    const rule = stripDashes(raw).trim().slice(0, 240);
    if (!rule) continue;
    const key = rule.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(rule);
    if (cleaned.length >= 3) break;
  }
  return cleaned;
}

export interface GenerateDraftResult {
  body: string;
  // Subject line the model produced for this draft. null when the model
  // omitted the <subject> tag, the send path falls back (Re:<thread> when
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

/**
 * Language + voice review pass ("double-check"). A second model call proofreads
 * the generated draft against the coach's real examples to guarantee native
 * fluency in the examples' language (no stray foreign words, no calques, no
 * grammar errors) while preserving voice, meaning, and the URL. Returns the
 * corrected {subject, body}, or null when it can't run or yields nothing
 * usable (the caller then keeps the original draft).
 */
async function reviewDraft(
  coachId: string,
  voiceModel: DraftGenerationParams['voiceModel'],
  coachName: string,
  language: TLanguage,
  subject: string | null,
  body: string,
): Promise<{ subject: string | null; body: string } | null> {
  if (!voiceModel) return null;
  try {
    const { system, user } = buildReviewPrompt(voiceModel, coachName, language, subject, body);
    const message = await anthropic.messages.create({
      model: REVIEW_MODEL,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: user }],
    });
    await recordUsage({
      coachId,
      operation: 'draft_review',
      model: REVIEW_MODEL,
      usage: message.usage,
    });
    const block = message.content[0];
    if (!block || block.type !== 'text') return null;
    const out = parseSubjectAndBody(block.text.trim());
    if (!out.body.trim()) return null; // guard against a degenerate empty rewrite
    return { subject: out.subject || subject, body: out.body };
  } catch {
    return null;
  }
}

export async function generateDraft(
  params: DraftGenerationParams,
  coachName: string,
): Promise<GenerateDraftResult | null> {
  // T-02-13: Hard-block gate, must run before any API call
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
      model: DRAFT_MODEL,
      max_tokens: 600,
      system: ctx.systemPrompt,
      messages: [{ role: 'user', content: ctx.userPrompt }],
    });
    await recordUsage({
      coachId: params.coachId,
      operation: 'draft_generate',
      model: DRAFT_MODEL,
      usage: message.usage,
    });
    const block = message.content[0];
    if (!block || block.type !== 'text') throw new Error('Unexpected content block type from Anthropic');
    return block.text.trim();
  };

  let parsed = parseSubjectAndBody(await attemptGeneration());
  const qualityFlags: string[] = [];

  // AI-003: Never-say scan with one auto-regen attempt. The scan only looks at
  // the body, the subject is short and shares the same voice constraints.
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
  const reviewed = await reviewDraft(params.coachId, params.voiceModel, coachName, params.language, parsed.subject, parsed.body);
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
  language: TLanguage;
  transcript?: string;
  conversationHistory?: string;
  existingSummary?: string;
  isProtected: boolean;
  coachNotes?: string;
}): Promise<string | null> {
  // D-22: Coach edits win, never overwrite a protected summary
  if (params.isProtected) return null;

  const { system, user } = buildLeadDescriptionPrompt({
    transcript: params.transcript,
    conversationHistory: params.conversationHistory,
    existingSummary: params.existingSummary,
    coachNotes: params.coachNotes,
    leadName: params.leadName,
    language: params.language,
  });

  const message = await anthropic.messages.create({
    model: DESCRIPTION_MODEL,
    max_tokens: 300,
    system,
    messages: [{ role: 'user', content: user }],
  });
  await recordUsage({
    coachId: params.coachId,
    operation: 'lead_description',
    model: DESCRIPTION_MODEL,
    usage: message.usage,
  });

  const block = message.content[0];
  if (!block || block.type !== 'text') return null;

  traceGeneration('updateLeadDescription', {
    leadId: params.leadId,
    coachId: params.coachId,
  });

  // Hard guarantee: no em-dash / en-dash ever reaches a coach, regardless of
  // whether the model honored the prompt rule.
  return stripDashes(block.text.trim());
}
