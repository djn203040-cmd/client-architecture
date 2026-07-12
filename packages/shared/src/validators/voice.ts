import { z } from 'zod';

// A single usage rule refines HOW the coach's vocabulary is combined, capturing
// nuances the 10-15 corpus examples can't. `source` distinguishes rules derived
// from the original corpus from rules a coach added via the fine-tuning loop
// (Settings -> My Voice). `added_at` is an ISO timestamp for ordering + display.
export const UsageRuleSchema = z.object({
  rule: z.string().min(1).max(240),
  source: z.enum(['corpus', 'feedback']),
  added_at: z.string(),
});

export type TUsageRule = z.infer<typeof UsageRuleSchema>;

export const VoiceProfileSchema = z.object({
  tone_adjectives: z.array(z.string()).min(3).max(8),
  formality_level: z.enum(['casual', 'conversational', 'professional', 'formal']),
  sentence_length: z.enum(['short', 'medium', 'long', 'varied']),
  emoji_usage: z.enum(['none', 'rare', 'occasional', 'frequent']),
  opener_phrases: z.array(z.string()).min(2).max(5),
  closer_phrases: z.array(z.string()).min(2).max(5),
  never_say_list: z.array(z.string()),
  selected_examples: z.array(z.string()).min(8).max(15),
  // Optional so pre-existing voice models (and freshly analyzed corpora, which
  // don't produce rules) parse unchanged. Absent/empty == current behavior.
  usage_rules: z.array(UsageRuleSchema).max(60).optional(),
});

export type TVoiceProfile = z.infer<typeof VoiceProfileSchema>;

// Request body for the voice fine-tuning loop: a draft that didn't sound right
// plus the coach's free-text critique of what's off.
export const VoiceRefineRequestSchema = z.object({
  draft_body: z.string().min(1).max(8000),
  critique: z.string().min(1).max(2000),
});

export type TVoiceRefineRequest = z.infer<typeof VoiceRefineRequestSchema>;
