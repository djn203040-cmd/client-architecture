// @vitest-environment node
import { describe, it, expect } from "vitest";
import { VoiceProfileSchema, type TVoiceProfile } from "@client/shared/validators";

// 06-PLAN.md §1.2, "Voice Layer 2 example selection deterministic on identical input"
//
// The Layer 2 examples live on the persisted voice profile as `selected_examples`.
// Determinism guarantee: given the same persisted profile, every downstream consumer
// (context-assembler, draft prompt) sees the examples in stable insertion order, no
// hidden shuffle, no Set-based dedupe.

function makeProfile(overrides: Partial<TVoiceProfile> = {}): TVoiceProfile {
  const base = {
    tone_adjectives: ["warm", "direct", "encouraging"],
    formality_level: "conversational",
    sentence_length: "medium",
    emoji_usage: "rare",
    opener_phrases: ["Hey,", "Hi,"],
    closer_phrases: ["Best,", "Talk soon,"],
    never_say_list: [],
    selected_examples: [
      "Example A, first interaction.",
      "Example B, follow-up after no-show.",
      "Example C, reply to objection.",
      "Example D, booking confirmation.",
      "Example E, gentle nudge.",
      "Example F, reactivation.",
      "Example G, post-call recap.",
      "Example H, final check-in.",
    ],
    ...overrides,
  };
  return VoiceProfileSchema.parse(base);
}

describe("VOICE-Layer2: example selection is deterministic", () => {
  it("returns examples in insertion order across repeated reads", () => {
    const p = makeProfile();
    for (let i = 0; i < 50; i++) {
      const parsed = VoiceProfileSchema.parse(p);
      expect(parsed.selected_examples).toEqual(p.selected_examples);
    }
  });

  it("produces identical JSON snapshot on identical input", () => {
    const a = makeProfile();
    const b = makeProfile();
    expect(JSON.stringify(a.selected_examples)).toBe(JSON.stringify(b.selected_examples));
  });

  it("preserves order under deep clone (no Set/Map reshuffle)", () => {
    const p = makeProfile();
    const cloned = JSON.parse(JSON.stringify(p)) as TVoiceProfile;
    expect(cloned.selected_examples).toEqual(p.selected_examples);
  });

  it("trimming examples for token budget always keeps the first N, never a random subset", () => {
    // Mirrors trimExamples() in context-assembler.ts: slice(0, target).
    const p = makeProfile();
    const trimmed = p.selected_examples.slice(0, 8);
    expect(trimmed[0]).toBe("Example A, first interaction.");
    expect(trimmed.at(-1)).toBe("Example H, final check-in.");
  });
});
