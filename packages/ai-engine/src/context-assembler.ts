import type { DraftGenerationParams } from './types';
import type { TVoiceProfile } from '@client/shared/validators';
import { buildSystemPrompt } from './prompts/system';
import { buildDraftUserPrompt } from './prompts/draft';
import { estimateTokens } from './token-counter';

const TOKEN_BUDGET = 7700;
const MIN_EXAMPLES = 8;

interface AssembleResult {
  systemPrompt: string;
  userPrompt: string;
  truncationLog: string[];
  confidenceLevel: 'high' | 'low';
}

function truncateTranscript(transcript: string): string {
  // Keep roughly first ~300 tokens (~1050 chars) and last ~200 tokens (~700 chars)
  const headChars = 1050;
  const tailChars = 700;
  if (transcript.length <= headChars + tailChars) return transcript;
  return (
    transcript.slice(0, headChars) +
    '\n...[transcript truncated]...\n' +
    transcript.slice(-tailChars)
  );
}

function keepRecentMessages(history: string, maxMessages: number): string {
  // Split on blank lines separating messages, keep last N
  const messages = history.split(/\n{2,}/).filter(Boolean);
  if (messages.length <= maxMessages) return history;
  return messages.slice(-maxMessages).join('\n\n');
}

function trimExamples(voiceModel: TVoiceProfile, targetCount: number): TVoiceProfile {
  if (voiceModel.selected_examples.length <= targetCount) return voiceModel;
  return {
    ...voiceModel,
    selected_examples: voiceModel.selected_examples.slice(0, targetCount),
  };
}

export async function assembleContext(
  params: DraftGenerationParams,
  coachName: string,
): Promise<AssembleResult> {
  const voiceModel = params.voiceModel as TVoiceProfile;
  const truncationLog: string[] = [];
  const confidenceLevel: 'high' | 'low' =
    voiceModel.selected_examples.length < MIN_EXAMPLES ? 'low' : 'high';

  let mutableParams = { ...params };
  let currentVoiceModel = { ...voiceModel };

  function estimate(): number {
    const sys = buildSystemPrompt(currentVoiceModel, coachName, mutableParams.language, mutableParams.salesToolkit);
    const usr = buildDraftUserPrompt(mutableParams);
    return estimateTokens(sys) + estimateTokens(usr);
  }

  // Fast pre-sizing, apply truncations if over budget
  if (estimate() > TOKEN_BUDGET) {
    // 1. Transcript body
    if (mutableParams.transcript) {
      const truncated = truncateTranscript(mutableParams.transcript);
      if (truncated !== mutableParams.transcript) {
        mutableParams = { ...mutableParams, transcript: truncated };
        truncationLog.push('transcript');
      }
    }
  }

  if (estimate() > TOKEN_BUDGET) {
    // 2. Conversation history, keep most recent 3 messages
    if (mutableParams.conversationHistory) {
      const trimmed = keepRecentMessages(mutableParams.conversationHistory, 3);
      if (trimmed !== mutableParams.conversationHistory) {
        mutableParams = { ...mutableParams, conversationHistory: trimmed };
        truncationLog.push('conversationHistory');
      }
    }
  }

  if (estimate() > TOKEN_BUDGET) {
    // 3. Coach notes, keep most recent note only (last paragraph)
    if (mutableParams.coachNotes) {
      const notes = mutableParams.coachNotes.split(/\n{2,}/).filter(Boolean);
      if (notes.length > 1) {
        mutableParams = { ...mutableParams, coachNotes: notes[notes.length - 1] ?? null };
        truncationLog.push('coachNotes');
      }
    }
  }

  if (estimate() > TOKEN_BUDGET) {
    // 4. Layer 2 examples, drop from the end, never below MIN_EXAMPLES
    let targetCount = currentVoiceModel.selected_examples.length - 1;
    while (targetCount >= MIN_EXAMPLES && estimate() > TOKEN_BUDGET) {
      currentVoiceModel = trimExamples(
        { ...currentVoiceModel, selected_examples: voiceModel.selected_examples },
        targetCount,
      );
      targetCount -= 1;
    }
    if (currentVoiceModel.selected_examples.length < voiceModel.selected_examples.length) {
      truncationLog.push('voiceExamples');
    }
  }

  const systemPrompt = buildSystemPrompt(currentVoiceModel, coachName, mutableParams.language, mutableParams.salesToolkit);
  const userPrompt = buildDraftUserPrompt(mutableParams);

  return { systemPrompt, userPrompt, truncationLog, confidenceLevel };
}
