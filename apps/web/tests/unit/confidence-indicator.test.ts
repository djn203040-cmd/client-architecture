// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Mock Anthropic before module import
vi.mock('@client/ai-engine/client', () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
      countTokens: vi.fn(),
    },
  },
}));

import { generateDraft } from '@client/ai-engine/index';
import { anthropic } from '@client/ai-engine/client';
import type { DraftGenerationParams } from '@client/ai-engine/types';
import type { TVoiceProfile } from '@client/shared/validators';

const mockCreate = vi.mocked(anthropic.messages.create);
const mockCountTokens = vi.mocked(anthropic.messages.countTokens);

function makeVoiceModel(exampleCount = 10): TVoiceProfile {
  return {
    tone_adjectives: ['warm', 'direct', 'encouraging'],
    formality_level: 'conversational',
    sentence_length: 'medium',
    emoji_usage: 'none',
    opener_phrases: ['Hey there', 'Hope you\'re well'],
    closer_phrases: ['Talk soon', 'Best'],
    never_say_list: [],
    selected_examples: Array.from({ length: exampleCount }, (_, i) => `Example ${i + 1}`),
  };
}

function makeParams(overrides: Partial<DraftGenerationParams> = {}): DraftGenerationParams {
  return {
    coachId: 'coach-1',
    leadId: 'lead-1',
    leadStatus: 'no_show',
    leadName: 'Jane Smith',
    aiSummary: null,
    transcript: 'Call transcript content.',
    conversationHistory: null,
    coachNotes: null,
    bookingUrl: null,
    touchpointIndex: 1,
    voiceModel: makeVoiceModel(),
    ...overrides,
  };
}

beforeEach(() => {
  mockCreate.mockReset();
  mockCountTokens.mockReset();
  mockCountTokens.mockResolvedValue({ input_tokens: 1000 } as never);
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: 'Great draft content.' }],
  } as never);
});

describe('AI-007: confidence_level threshold', () => {
  it('returns high confidence when voice model has 10 examples', async () => {
    const result = await generateDraft(makeParams(), 'Coach Name');
    expect(result).not.toBeNull();
    expect(result!.confidenceLevel).toBe('high');
  });

  it('returns high confidence at exactly 8 examples', async () => {
    const result = await generateDraft(makeParams({ voiceModel: makeVoiceModel(8) }), 'Coach');
    expect(result!.confidenceLevel).toBe('high');
  });

  it('returns low confidence when voice model has fewer than 8 examples', async () => {
    const voiceModel = makeVoiceModel(8);
    // Bypass schema min for this specific test
    voiceModel.selected_examples = voiceModel.selected_examples.slice(0, 5);
    const result = await generateDraft(makeParams({ voiceModel }), 'Coach');
    expect(result!.confidenceLevel).toBe('low');
  });
});

describe('D-16: hard-block gate', () => {
  it('returns null for unsubscribed lead — no API call made', async () => {
    const result = await generateDraft(makeParams({ leadStatus: 'unsubscribed' }), 'Coach');
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns null for do_not_contact lead', async () => {
    const result = await generateDraft(makeParams({ leadStatus: 'do_not_contact' }), 'Coach');
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns null for bounced lead', async () => {
    const result = await generateDraft(makeParams({ leadStatus: 'bounced' }), 'Coach');
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('generates a draft for a no_show lead', async () => {
    const result = await generateDraft(makeParams({ leadStatus: 'no_show' }), 'Coach');
    expect(result).not.toBeNull();
    // One generation call + one language/voice review pass (AI-015).
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

describe('AI-003: never-say scan with auto-regen', () => {
  it('auto-regens once when first draft contains a never-say phrase', async () => {
    const voiceModel = makeVoiceModel();
    voiceModel.never_say_list = ['synergy'];

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'We believe synergy is key here.' }],
      } as never)
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'We believe collaboration is key here.' }],
      } as never);

    const result = await generateDraft(makeParams({ voiceModel }), 'Coach');
    expect(result).not.toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(result!.qualityFlags).not.toContain('never_say_violation');
  });

  it('adds never_say_violation flag when both attempts violate', async () => {
    const voiceModel = makeVoiceModel();
    voiceModel.never_say_list = ['synergy'];

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Synergy drives everything.' }],
    } as never);

    const result = await generateDraft(makeParams({ voiceModel }), 'Coach');
    expect(result).not.toBeNull();
    expect(result!.qualityFlags).toContain('never_say_violation');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
