// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildDraftUserPrompt } from "@client/ai-engine/prompts/draft";
import { buildSystemPrompt } from "@client/ai-engine/prompts/system";
import type { DraftGenerationParams } from "@client/ai-engine/types";
import type { TVoiceProfile } from "@client/shared/validators";

// 06-PLAN.md §1.2 — "AI engine prompt generation deterministic given fixed seed inputs"
//
// Determinism guarantee: identical params produce byte-identical prompts.
// Anthropic's sampling layer is the only nondeterministic step; everything before
// the API call is a pure function of params.

const voiceModel: TVoiceProfile = {
  tone_adjectives: ["warm", "direct", "encouraging"],
  formality_level: "conversational",
  sentence_length: "medium",
  emoji_usage: "rare",
  opener_phrases: ["Hey there,"],
  closer_phrases: ["Talk soon,"],
  never_say_list: ["circle back", "synergy"],
  selected_examples: [
    "Example 1", "Example 2", "Example 3", "Example 4",
    "Example 5", "Example 6", "Example 7", "Example 8",
  ],
};

const baseParams: DraftGenerationParams = {
  leadId: "lead-deterministic-001",
  coachId: "coach-deterministic-001",
  leadName: "Sam Rivera",
  leadStatus: "no_show",
  touchpointIndex: 1,
  voiceModel,
  transcript: "Coach: We discussed scheduling.\nLead: I'll think about it.",
  conversationHistory: null,
  aiSummary: "Lead inquired about pricing.",
  coachNotes: null,
  bookingUrl: null,
};

describe("AI-Prompt-Deterministic: byte-identical output for identical inputs", () => {
  it("buildDraftUserPrompt produces identical strings across 100 invocations", () => {
    const first = buildDraftUserPrompt(baseParams);
    for (let i = 0; i < 99; i++) {
      expect(buildDraftUserPrompt(baseParams)).toBe(first);
    }
  });

  it("buildSystemPrompt produces identical strings across 100 invocations", () => {
    const first = buildSystemPrompt(voiceModel, "Daniel");
    for (let i = 0; i < 99; i++) {
      expect(buildSystemPrompt(voiceModel, "Daniel")).toBe(first);
    }
  });

  it("changing leadStatus changes the prompt (sanity)", () => {
    const a = buildDraftUserPrompt(baseParams);
    const b = buildDraftUserPrompt({ ...baseParams, leadStatus: "call_completed" });
    expect(a).not.toBe(b);
  });

  it("changing touchpointIndex changes prompt only when in_sequence (state-aware)", () => {
    const inSeq = { ...baseParams, leadStatus: "in_sequence" as const };
    const a = buildDraftUserPrompt({ ...inSeq, touchpointIndex: 1 });
    const b = buildDraftUserPrompt({ ...inSeq, touchpointIndex: 3 });
    expect(a).not.toBe(b);
  });

  // Regression: coach_notes were silently dropped from the prompt for the
  // entire §2.4 walk, causing the model to hallucinate replies that weren't
  // sent and refuse to respond to replies that were quoted in the notes.
  it("coach_notes content is injected into the prompt when present", () => {
    const distinctive = "QUOTED_REPLY_FROM_LEAD_THAT_MUST_APPEAR_VERBATIM";
    const prompt = buildDraftUserPrompt({ ...baseParams, coachNotes: distinctive });
    expect(prompt).toContain(distinctive);
    expect(prompt).toContain("<coach_notes>");
  });

  it("coach_notes block renders an empty-state marker when null", () => {
    const prompt = buildDraftUserPrompt({ ...baseParams, coachNotes: null });
    expect(prompt).toContain("<coach_notes>");
    expect(prompt).toContain("No coach notes on this lead.");
  });
});
