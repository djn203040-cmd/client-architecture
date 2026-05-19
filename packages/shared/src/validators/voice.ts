import { z } from 'zod';

export const VoiceProfileSchema = z.object({
  tone_adjectives: z.array(z.string()).min(3).max(8),
  formality_level: z.enum(['casual', 'conversational', 'professional', 'formal']),
  sentence_length: z.enum(['short', 'medium', 'long', 'varied']),
  emoji_usage: z.enum(['none', 'rare', 'occasional', 'frequent']),
  opener_phrases: z.array(z.string()).min(2).max(5),
  closer_phrases: z.array(z.string()).min(2).max(5),
  never_say_list: z.array(z.string()),
  selected_examples: z.array(z.string()).min(8).max(15),
});

export type TVoiceProfile = z.infer<typeof VoiceProfileSchema>;
