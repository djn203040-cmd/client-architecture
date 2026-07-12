import type { TVoiceProfile } from '@client/shared/validators';

/**
 * Builds the voice fine-tuning prompt. The coach hands us a draft that didn't
 * sound like them plus a critique of what's off; the model distills 1-3
 * specific, reusable usage rules that would prevent that exact mismatch in
 * future drafts. Rules are appended to the voice model's `usage_rules[]`.
 */
export function buildVoiceRefinePrompt(params: {
  voiceModel: TVoiceProfile;
  draftBody: string;
  critique: string;
}): { system: string; user: string } {
  const { voiceModel, draftBody, critique } = params;

  const examplesBlock = voiceModel.selected_examples
    .slice(0, 8)
    .map((ex, i) => `<example_${i + 1}>\n${ex}\n</example_${i + 1}>`)
    .join('\n');

  const existingRules = voiceModel.usage_rules ?? [];
  const existingBlock =
    existingRules.length > 0
      ? `\n<existing_usage_rules>\n${existingRules.map((r) => `- ${r.rule}`).join('\n')}\n</existing_usage_rules>\n`
      : '';

  const system = `You are refining a writer's voice profile. The writer received an email draft that they say doesn't sound like them, and gave a specific critique of what's off. The examples below show how the writer actually writes, they define both the voice and the language.

<voice_examples>
${examplesBlock}
</voice_examples>
${existingBlock}
Your job: identify 1 to 3 specific, actionable usage rules that, if added to the profile, would prevent this exact mismatch in every future draft.

Rules MUST be:
- Specific: name the actual word, phrase, or pattern. Never vague ("be more like me", "sound natural").
- Actionable and directional: phrased as "never X", "avoid X", or "always X when Y".
- Independent: do NOT restate anything already captured in the existing usage rules or obvious from the examples.
- Short: one line each, written in English (they are instructions to an AI, even when the writing itself is in another language). Quote the offending foreign-language phrase verbatim when the rule is about it.
- Grounded: derive them from the critique and the mismatch, do not invent unrelated preferences.

If the critique doesn't justify any durable, reusable rule (e.g. it's a one-off typo), return an empty array rather than inventing one.

Return ONLY a JSON object wrapped in <usage_rules>...</usage_rules> tags, no other commentary:
{
  "rules": ["rule one", "rule two"]
}`;

  const user = `<draft_that_sounded_wrong>
${draftBody}
</draft_that_sounded_wrong>

<coach_critique>
${critique}
</coach_critique>

Produce the usage rules now.`;

  return { system, user };
}
