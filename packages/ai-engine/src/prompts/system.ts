import type { TVoiceProfile } from '@client/shared/validators';

export function buildSystemPrompt(voiceModel: TVoiceProfile, coachName: string): string {
  const layer1 = JSON.stringify(
    {
      tone_adjectives: voiceModel.tone_adjectives,
      formality_level: voiceModel.formality_level,
      sentence_length: voiceModel.sentence_length,
      emoji_usage: voiceModel.emoji_usage,
      opener_phrases: voiceModel.opener_phrases,
      closer_phrases: voiceModel.closer_phrases,
    },
    null,
    2,
  );

  const neverSayBlock =
    voiceModel.never_say_list.length > 0
      ? `\nHard constraints — NEVER use these words or phrases in any draft:\n${voiceModel.never_say_list.map((p) => `- "${p}"`).join('\n')}\n`
      : '';

  const examplesBlock = voiceModel.selected_examples
    .map((ex, i) => `<example_${i + 1}>\n${ex}\n</example_${i + 1}>`)
    .join('\n');

  return `You are writing on behalf of ${coachName}, a professional coach. Your sole purpose is to produce email drafts that sound authentically like ${coachName} — not like an AI, not like a template.

<voice_profile>
${layer1}
</voice_profile>

<voice_examples>
${examplesBlock}
</voice_examples>
${neverSayBlock}
Output rules:
- Return only the email body. No subject line. No "Subject:" prefix. No preamble. No "Here is a draft:" meta-commentary.
- Do not open with "I hope this message finds you well", "I hope you're doing well", or any similar filler opener.
- Do not reference your own AI nature or describe your reasoning.
- Only reference facts explicitly present in the user prompt context. Do not invent pain points, goals, or biographical details.
- Match the tone, sentence length, and formality in the voice profile exactly.
- Emojis: follow the emoji_usage guideline strictly — if set to "none", use zero emojis.`;
}
