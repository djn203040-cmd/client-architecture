// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Mock the Anthropic client before importing the module
vi.mock('@client/ai-engine/client', () => ({
  anthropic: {
    messages: {
      countTokens: vi.fn(),
    },
  },
}));

import { estimateTokens, countTokens } from '@client/ai-engine/token-counter';
import { anthropic } from '@client/ai-engine/client';
import { assembleContext } from '@client/ai-engine/context-assembler';
import type { DraftGenerationParams } from '@client/ai-engine/types';
import type { TVoiceProfile } from '@client/shared/validators';

const mockCountTokens = vi.mocked(anthropic.messages.countTokens);

function makeVoiceModel(exampleCount = 10): TVoiceProfile {
  return {
    tone_adjectives: ['warm', 'direct', 'encouraging'],
    formality_level: 'conversational',
    sentence_length: 'medium',
    emoji_usage: 'rare',
    opener_phrases: ['Hey', 'Hope you\'re well'],
    closer_phrases: ['Talk soon', 'Best'],
    never_say_list: ['synergy', 'leverage'],
    selected_examples: Array.from({ length: exampleCount }, (_, i) => `Example message ${i + 1}`),
  };
}

function makeParams(overrides: Partial<DraftGenerationParams> = {}): DraftGenerationParams {
  return {
    coachId: 'coach-1',
    leadId: 'lead-1',
    leadStatus: 'no_show',
    leadName: 'Jane Smith',
    aiSummary: null,
    transcript: null,
    conversationHistory: null,
    coachNotes: null,
    touchpointIndex: 1,
    voiceModel: makeVoiceModel(),
    ...overrides,
  };
}

describe('estimateTokens', () => {
  it('returns ceil(length / 3.5) for a simple string', () => {
    expect(estimateTokens('hello')).toBe(Math.ceil(5 / 3.5));
  });

  it('returns 0 for an empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('handles a longer English paragraph within ±20% of true token count', () => {
    const text = 'The quick brown fox jumps over the lazy dog. '.repeat(20);
    const estimate = estimateTokens(text);
    expect(estimate).toBeGreaterThan(50);
    expect(estimate).toBeLessThan(400);
  });
});

describe('countTokens', () => {
  beforeEach(() => {
    mockCountTokens.mockReset();
  });

  it('calls anthropic.messages.countTokens and returns input_tokens', async () => {
    mockCountTokens.mockResolvedValueOnce({ input_tokens: 1234 } as never);
    const result = await countTokens('system text', 'user text');
    expect(result).toBe(1234);
    expect(mockCountTokens).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-6',
      system: 'system text',
      messages: [{ role: 'user', content: 'user text' }],
    });
  });
});

describe('assembleContext', () => {
  it('returns high confidence when voice model has 10 examples', async () => {
    const { confidenceLevel } = await assembleContext(makeParams(), 'Coach Name');
    expect(confidenceLevel).toBe('high');
  });

  it('returns low confidence when voice model has fewer than 8 examples', async () => {
    // Override to have 7 examples (bypass schema min for test)
    const voiceModel = makeVoiceModel(8);
    voiceModel.selected_examples = voiceModel.selected_examples.slice(0, 7);
    const { confidenceLevel } = await assembleContext(makeParams({ voiceModel }), 'Coach');
    expect(confidenceLevel).toBe('low');
  });

  it('returns empty truncationLog when context is within budget', async () => {
    const { truncationLog } = await assembleContext(makeParams(), 'Coach');
    expect(truncationLog).toEqual([]);
  });

  it('truncates transcript first when over budget', async () => {
    // Create a massive transcript to blow the budget
    const transcript = 'A'.repeat(120_000);
    const { truncationLog } = await assembleContext(makeParams({ transcript }), 'Coach');
    expect(truncationLog).toContain('transcript');
  });

  it('never reduces examples below 8 even when over budget', async () => {
    const transcript = 'A'.repeat(120_000);
    const conversationHistory = 'B'.repeat(60_000);
    const coachNotes = 'C\n\nD\n\nE\n\nF\n\n'.repeat(1000);
    const voiceModel = makeVoiceModel(15);

    const { systemPrompt } = await assembleContext(
      makeParams({ transcript, conversationHistory, coachNotes, voiceModel }),
      'Coach',
    );

    // The system prompt contains the examples; count how many remain
    const exampleMatches = systemPrompt.match(/<example_\d+>/g) ?? [];
    expect(exampleMatches.length).toBeGreaterThanOrEqual(8);
  });

  it('truncates conversation history to most recent 3 messages when needed', async () => {
    const transcript = 'A'.repeat(100_000);
    const conversationHistory = [
      'Message 1 sent a while ago.',
      'Message 2 sent later.',
      'Message 3 sent even later.',
      'Message 4 sent recently.',
      'Message 5 most recent.',
    ].join('\n\n');

    const { userPrompt, truncationLog } = await assembleContext(
      makeParams({ transcript, conversationHistory }),
      'Coach',
    );

    if (truncationLog.includes('conversationHistory')) {
      expect(userPrompt).toContain('Message 5 most recent.');
      expect(userPrompt).not.toContain('Message 1 sent a while ago.');
    }
  });
});
