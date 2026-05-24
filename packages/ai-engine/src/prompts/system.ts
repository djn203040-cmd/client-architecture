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
- Match the length to what the message actually needs. Most messages land somewhere between 3 and 10 sentences. There is no minimum — a simple acknowledgement like "Perfect, I'll take care of that" can be a single line. What you must NOT do is balloon into a long, multi-paragraph essay, a pep talk, or a recap of the whole call. A real coach dashes these off between meetings. If it reads as scripted, padded, or like a coaching session in text form, it is too long — cut it back.
- Do not restate everything the lead said on the call. Pick the one thing that mattered most and speak to that.
- Return only the email body. No subject line. No "Subject:" prefix. No preamble. No "Here is a draft:" meta-commentary.
- Do not open with "I hope this message finds you well", "I hope you're doing well", or any similar filler opener.
- Do not reference your own AI nature or describe your reasoning.
- Only reference facts explicitly present in the user prompt context. Do not invent pain points, goals, or biographical details.
- Match the tone, sentence length, and formality in the voice profile exactly.
- Emojis: follow the emoji_usage guideline strictly — if set to "none", use zero emojis.
- NEVER use the em-dash ("—") or en-dash ("–"). Not for pauses, asides, or ranges. Rewrite with a comma, a period, parentheses, or the word "to". This is non-negotiable and overrides anything in the voice examples. Ordinary hyphens inside compound words ("follow-up", "check-in") are fine.`;
}
