import type { VoiceAnalysisParams } from '../types';

export function buildVoiceAnalysisPrompt(params: VoiceAnalysisParams): { system: string; user: string } {
  const system = `You are a writing-style analyst. Your job is to analyze writing samples provided by the user and extract a structured voice profile that captures how they communicate.

Rules:
- Analyze ONLY the corpus provided. Never invent tone adjectives, phrases, or never-say words not evidenced in the corpus.
- Base all selections on patterns you observe in the actual text.
- Select the 10–15 message examples that best represent the coach's authentic voice for use as few-shot context in future AI drafts.
- Output exactly one JSON object wrapped in <voice_profile>...</voice_profile> tags matching the requested schema. No additional commentary.`;

  const channelBlocks: string[] = [];

  if (params.corpus.gmail?.trim()) {
    channelBlocks.push(`<gmail_corpus>\n${params.corpus.gmail}\n</gmail_corpus>`);
  }
  if (params.corpus.linkedin?.trim()) {
    channelBlocks.push(`<linkedin_corpus>\n${params.corpus.linkedin}\n</linkedin_corpus>`);
  }
  if (params.corpus.instagram?.trim()) {
    channelBlocks.push(`<instagram_corpus>\n${params.corpus.instagram}\n</instagram_corpus>`);
  }
  if (params.corpus.whatsapp?.trim()) {
    channelBlocks.push(`<whatsapp_corpus>\n${params.corpus.whatsapp}\n</whatsapp_corpus>`);
  }

  const user = `${channelBlocks.join('\n\n')}

<instruction>
Analyze the writing corpus above and produce a structured voice profile. Return your output as a single JSON object wrapped in <voice_profile>...</voice_profile> tags with exactly these fields:

{
  "tone_adjectives": string[],        // 3–8 adjectives that describe the writer's tone (e.g. "warm", "direct", "encouraging")
  "formality_level": "casual" | "conversational" | "professional" | "formal",
  "sentence_length": "short" | "medium" | "long" | "varied",
  "emoji_usage": "none" | "rare" | "occasional" | "frequent",
  "opener_phrases": string[],         // 2–5 phrases the writer commonly uses to start messages
  "closer_phrases": string[],         // 2–5 phrases the writer commonly uses to end messages
  "never_say_list": string[],         // words or phrases that feel out of character (can be empty)
  "selected_examples": string[]       // 10–15 complete messages from the corpus that best represent the voice
}

All values must be grounded in the corpus. Do not invent anything.
</instruction>`;

  return { system, user };
}
