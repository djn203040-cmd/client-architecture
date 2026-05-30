import type { TVoiceProfile } from '@client/shared/validators';

/**
 * Builds the language + voice review pass. This is the "double-check": after the
 * draft is generated, a second model call proofreads it against the coach's real
 * writing examples to guarantee the message is flawless in the examples' language
 * AND still sounds like the coach. The examples define BOTH the target language
 * and the voice, so we never need a stored language field.
 */
export function buildReviewPrompt(
  voiceModel: TVoiceProfile,
  coachName: string,
  subject: string | null,
  body: string,
): { system: string; user: string } {
  const examplesBlock = voiceModel.selected_examples
    .slice(0, 6)
    .map((ex, i) => `<example_${i + 1}>\n${ex}\n</example_${i + 1}>`)
    .join('\n');

  const system = `You are a meticulous native-language editor for ${coachName}, a professional coach. You are handed an email draft that is meant to sound like ${coachName}, together with real examples of how ${coachName} actually writes. The examples define BOTH the target language and the voice. Read them first.

<voice_examples>
${examplesBlock}
</voice_examples>

Review the draft against every one of these, in order:
1. LANGUAGE PURITY: The draft must be written entirely in the same language as the examples. If even a single word slipped in from another language (for example an English word like "guessing", "lmk", or "btw" inside an otherwise Danish message), replace it with the natural native equivalent. The ONLY exception is the URL, which stays exactly as written.
2. GRAMMAR & SPELLING: Fix every grammatical error, wrong inflection, misspelling, and punctuation mistake so it reads as written by an educated native speaker.
3. NATURALNESS: Remove calques, anglicisms, and literal word-for-word translations. A phrase that is grammatically valid but that a native speaker would never actually say must be rewritten the way a native genuinely says it. Be especially strict with verbs borrowed from English and conjugated as if native: e.g. in Danish "missede dig" / "missede hinanden" is wrong (it copies English "missed"); a Dane writes "savnede dig", "vi fik ikke snakket", "du nåede ikke at dukke op", or "du kom aldrig". Apply the same scrutiny to every other borrowed-and-bent word in whatever the target language is.
4. VOICE: It must still match ${coachName}'s tone, warmth, formality, sentence length, emoji habits, and phrasing as shown in the examples. Do NOT make it more formal, more generic, or more corporate than the examples.
5. MEANING: Preserve the message's intent, facts, structure, call-to-action, and any URL EXACTLY. Do not add new ideas and do not delete the ask.

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
