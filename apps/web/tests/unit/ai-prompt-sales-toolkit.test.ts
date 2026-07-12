// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildDraftUserPrompt } from "@client/ai-engine/prompts/draft";
import type { DraftGenerationParams } from "@client/ai-engine/types";
import type { TVoiceProfile, TSalesToolkit } from "@client/shared/validators";

// Issue #39: the coach's sales toolkit is injected into every draft so the AI
// can bridge objections the way the coach would. These tests lock two things:
//   1. No regression — an absent / empty toolkit produces NO <sales_toolkit>
//      block, so pre-toolkit coaches see byte-identical prompts.
//   2. A populated toolkit surfaces its bridges/downsells/philosophy verbatim.

const voiceModel: TVoiceProfile = {
  tone_adjectives: ["warm", "direct", "encouraging"],
  formality_level: "conversational",
  sentence_length: "medium",
  emoji_usage: "rare",
  opener_phrases: ["Hey there,"],
  closer_phrases: ["Talk soon,"],
  never_say_list: [],
  selected_examples: [
    "Example 1", "Example 2", "Example 3", "Example 4",
    "Example 5", "Example 6", "Example 7", "Example 8",
  ],
};

const baseParams: DraftGenerationParams = {
  leadId: "lead-toolkit-001",
  coachId: "coach-toolkit-001",
  leadName: "Camilla",
  leadStatus: "replied",
  touchpointIndex: 2,
  voiceModel,
  transcript: null,
  conversationHistory: null,
  aiSummary: "Price objection: wants to revisit in a few months.",
  coachNotes: "She said the $3k feels like a stretch right now.",
  inboundMessages: "price is a stretch, can we revisit in a few months?",
  bookingUrl: null,
};

const populatedToolkit: TSalesToolkit = {
  philosophy: "Gentle, never pushy, but I still help people past the resistance.",
  bridges: [
    { name: "Payment plan (3-month split)", when_to_offer: "if price is the stated objection but interest is real" },
  ],
  downsells: [
    { name: "4-week intensive", when_to_offer: "if the full container is too long a commitment" },
  ],
  leverage_points: "I always ask what their current situation costs them each month.",
};

const emptyToolkit: TSalesToolkit = {
  philosophy: "",
  bridges: [],
  downsells: [],
  leverage_points: "",
};

describe("AI-Prompt sales toolkit injection (issue #39)", () => {
  it("omits the <sales_toolkit> block entirely when the toolkit is absent", () => {
    const prompt = buildDraftUserPrompt(baseParams);
    // The framing prose can mention the tag conditionally ("if the
    // <sales_toolkit> block is present"), so the closing tag is the reliable
    // sentinel for the actual injected data block.
    expect(prompt).not.toContain("</sales_toolkit>");
  });

  it("no regression: absent vs empty vs undefined toolkit are byte-identical", () => {
    const absent = buildDraftUserPrompt(baseParams);
    const withNull = buildDraftUserPrompt({ ...baseParams, salesToolkit: null });
    const withEmpty = buildDraftUserPrompt({ ...baseParams, salesToolkit: emptyToolkit });
    expect(withNull).toBe(absent);
    expect(withEmpty).toBe(absent);
  });

  it("injects a <sales_toolkit> block carrying bridges, downsells, philosophy and leverage", () => {
    const prompt = buildDraftUserPrompt({ ...baseParams, salesToolkit: populatedToolkit });
    expect(prompt).toContain("<sales_toolkit>");
    expect(prompt).toContain("</sales_toolkit>");
    expect(prompt).toContain("Payment plan (3-month split)");
    expect(prompt).toContain("if price is the stated objection but interest is real");
    expect(prompt).toContain("4-week intensive");
    expect(prompt).toContain("Gentle, never pushy");
    expect(prompt).toContain("costs them each month");
  });

  it("skips option rows with a blank name but keeps valid ones", () => {
    const mixed: TSalesToolkit = {
      ...emptyToolkit,
      bridges: [
        { name: "", when_to_offer: "orphaned when-clause" },
        { name: "Lighter scope", when_to_offer: "" },
      ],
    };
    const prompt = buildDraftUserPrompt({ ...baseParams, salesToolkit: mixed });
    expect(prompt).toContain("<sales_toolkit>");
    expect(prompt).toContain("Lighter scope");
    expect(prompt).not.toContain("orphaned when-clause");
  });

  it("is deterministic for a fixed populated toolkit", () => {
    const first = buildDraftUserPrompt({ ...baseParams, salesToolkit: populatedToolkit });
    for (let i = 0; i < 25; i++) {
      expect(buildDraftUserPrompt({ ...baseParams, salesToolkit: populatedToolkit })).toBe(first);
    }
  });
});
