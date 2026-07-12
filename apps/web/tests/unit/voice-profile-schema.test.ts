import { describe, it, expect } from "vitest";
import { VoiceProfileSchema } from "@client/shared/validators";

const validProfile = {
  tone_adjectives: ["warm", "direct", "encouraging"],
  formality_level: "conversational" as const,
  sentence_length: "medium" as const,
  emoji_usage: "rare" as const,
  opener_phrases: ["Hey there,", "Hope you're well,"],
  closer_phrases: ["Talk soon,", "Best,"],
  never_say_list: [],
  selected_examples: [
    "Example 1", "Example 2", "Example 3", "Example 4",
    "Example 5", "Example 6", "Example 7", "Example 8",
  ],
};

describe("VOICE-001: VoiceProfileSchema", () => {
  it("accepts a fully valid profile with 3 tone_adjectives and 8 examples", () => {
    const result = VoiceProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it("rejects an object with only 2 tone_adjectives (min is 3)", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      tone_adjectives: ["warm", "direct"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects selected_examples of length 7 (min is 8)", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      selected_examples: [
        "Example 1", "Example 2", "Example 3", "Example 4",
        "Example 5", "Example 6", "Example 7",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid formality_level value", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      formality_level: "ultra_casual",
    });
    expect(result.success).toBe(false);
  });

  it("accepts 8 tone_adjectives at max", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      tone_adjectives: ["a", "b", "c", "d", "e", "f", "g", "h"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects 9 tone_adjectives (max is 8)", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      tone_adjectives: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects 16 selected_examples (max is 15)", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      selected_examples: Array.from({ length: 16 }, (_, i) => `Example ${i + 1}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts 15 selected_examples at max", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      selected_examples: Array.from({ length: 15 }, (_, i) => `Example ${i + 1}`),
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 opener_phrases", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      opener_phrases: ["Hey,"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required field", () => {
    const { tone_adjectives: _, ...withoutTone } = validProfile;
    const result = VoiceProfileSchema.safeParse(withoutTone);
    expect(result.success).toBe(false);
  });

  it("accepts a profile with no usage_rules (backward compatible)", () => {
    const result = VoiceProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.usage_rules).toBeUndefined();
  });

  it("accepts valid usage_rules with source and added_at", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      usage_rules: [
        { rule: "LMK is only used as a sign-off, never mid-sentence", source: "feedback", added_at: "2026-07-12T00:00:00.000Z" },
        { rule: "Avoid 'smutter forbi' constructions", source: "feedback", added_at: "2026-07-12T00:00:00.000Z" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a usage_rule with an invalid source", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      usage_rules: [{ rule: "x", source: "manual", added_at: "2026-07-12T00:00:00.000Z" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a usage_rule with an empty rule string", () => {
    const result = VoiceProfileSchema.safeParse({
      ...validProfile,
      usage_rules: [{ rule: "", source: "feedback", added_at: "2026-07-12T00:00:00.000Z" }],
    });
    expect(result.success).toBe(false);
  });
});
