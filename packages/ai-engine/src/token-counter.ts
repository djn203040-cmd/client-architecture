import { anthropic } from './client';

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export async function countTokens(system: string, userPrompt: string): Promise<number> {
  const result = await anthropic.messages.countTokens({
    model: 'claude-sonnet-4-6',
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return result.input_tokens;
}
