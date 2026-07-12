import type { TVoiceProfile, TLanguage } from '@client/shared/validators';
import { languageName, buildReviewLanguageChecks } from './language';

/**
 * Builds the language + voice review pass. This is the "double-check": after the
 * draft is generated, a second model call proofreads it against the coach's real
 * writing examples to guarantee the message is flawless in the coach's selected
 * language AND still sounds like the coach. Language is now explicit (passed in),
 * while the examples define the voice.
 */
export function buildReviewPrompt(
  voiceModel: TVoiceProfile,
  coachName: string,
  language: TLanguage,
  subject: string | null,
  body: string,
): { system: string; user: string } {
  const examplesBlock = voiceModel.selected_examples
    .slice(0, 6)
    .map((ex, i) => `<example_${i + 1}>\n${ex}\n</example_${i + 1}>`)
    .join('\n');

  const usageRules = voiceModel.usage_rules ?? [];
  const usageRulesBlock =
    usageRules.length > 0
      ? `\n<usage_rules>\n${usageRules.map((r) => `- ${r.rule}`).join('\n')}\n</usage_rules>\n`
      : '';

  const usageRulesCheck =
    usageRules.length > 0
      ? `\n6. USAGE RULES: The draft must obey every rule in <usage_rules> above, these are corrections the writer made about how they sound. If the draft violates one, rewrite the offending part to comply while preserving meaning.`
      : '';

  const system = `You are a meticulous native-language editor for ${coachName}, a professional coach. You are handed an email draft that is meant to sound like ${coachName}, together with real examples of how ${coachName} actually writes. The message MUST be written in ${languageName(language)}; the examples define the voice (tone, warmth, phrasing), not the language, so some of them may be in another language, the draft still has to end up in ${languageName(language)}. Read the examples first.

<voice_examples>
${examplesBlock}
</voice_examples>
${usageRulesBlock}
Review the draft against every one of these, in order:
${buildReviewLanguageChecks(language)}
4. VOICE: It must still match ${coachName}'s tone, warmth, formality, sentence length, emoji habits, and phrasing as shown in the examples. Do NOT make it more formal, more generic, or more corporate than the examples.
5. MEANING: Preserve the message's intent, facts, structure, call-to-action, and any URL EXACTLY. Do not add new ideas and do not delete the ask.${usageRulesCheck}

Hard rules:
- Keep every URL exactly as-is, character for character. Do not "fix" or reformat a link.
- Never use an em-dash or en-dash.
- If the draft is already flawless, return it unchanged.
- Output the corrected subject line in <subject></subject> tags, then the corrected body. No commentary, no explanation, no notes about what you changed. Output only the corrected message.`;

  const user = `<draft_to_review>
<subject>${subject ?? ''}</subject>
${body}
</draft_to_review>

Return the corrected message now.`;

  return { system, user };
}
