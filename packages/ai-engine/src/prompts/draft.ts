import type { DraftGenerationParams } from '../types';
import type { TLeadStatus } from '../types';

const STATE_FRAMING: Record<TLeadStatus, string> = {
  identified:
    'This is a first-touch message. The coach has not yet spoken with this person. Lead with warmth and genuine curiosity. Keep the voice coach-heavy. Do not assume specific pain points — speak broadly to the coaching offer. Invite a conversation, not a commitment.',
  call_booked:
    'The lead has booked a call. Write with a welcoming, excited, and authoritative tone. Build anticipation for the upcoming conversation. Make them feel they made the right decision. Keep it brief — they just need to feel good about the booking.',
  no_show:
    'The lead did not show up for their call. Open with understanding — life happens. Then pivot to determined: make clear this opportunity has a finite window. Firm, not punishing. Give them one clear path to rebook. No guilt-tripping, no desperation.',
  call_completed:
    'The coach just had a sales call with this lead. Write with an understanding, uplifting, and determined tone. Bridge the interest they showed on the call to the commitment of signing up. Reference specifics from the transcript if available. Help them see the next step as the obvious move.',
  in_sequence:
    'This is touchpoint #{touchpointIndex} in an active follow-up sequence. Adapt the register to the touchpoint position — earlier touchpoints should be warmer and more exploratory; later ones should be more direct and outcome-focused. Maintain the coach\'s authentic voice throughout.',
  replied:
    'The lead has replied. This message must be highly tailored and reactive to what the lead actually said. Read their reply carefully. Address their specific words, concerns, or questions directly. This is a conversation, not a broadcast.',
  converted:
    'The lead has become a client. Write a warm, personal, forward-looking welcome-aboard message. Celebrate their decision without being over-the-top. Set a positive tone for the journey ahead. Reference their goals if available from the transcript.',
  closed:
    'The lead has become a client. Write a warm, personal, forward-looking welcome-aboard message. Celebrate their decision without being over-the-top. Set a positive tone for the journey ahead. Reference their goals if available from the transcript.',
  // These states are hard-blocked — generateDraft returns null before reaching this map.
  // Entries are required for TypeScript exhaustiveness on the full TLeadStatus union.
  unsubscribed: '',
  do_not_contact: '',
  bounced: '',
};

export function buildDraftUserPrompt(params: DraftGenerationParams): string {
  const stateInstruction = STATE_FRAMING[params.leadStatus].replace(
    '{touchpointIndex}',
    String(params.touchpointIndex),
  );

  const transcriptBlock = params.transcript
    ? `<transcript>\n${params.transcript}\n</transcript>`
    : '<transcript>\nNo transcript available.\n</transcript>';

  const summaryBlock = params.aiSummary
    ? `<ai_lead_description>\n${params.aiSummary}\n</ai_lead_description>`
    : '<ai_lead_description>\nNo lead description yet.\n</ai_lead_description>';

  const historyBlock = params.conversationHistory
    ? `<conversation_history>\n${params.conversationHistory}\n</conversation_history>`
    : '<conversation_history>\nNo prior conversation on record.\n</conversation_history>';

  return `<lead_context>
Name: ${params.leadName}
Status: ${params.leadStatus}
Touchpoint: ${params.touchpointIndex}
</lead_context>

${summaryBlock}

${transcriptBlock}

${historyBlock}

<instruction>
${stateInstruction}

Write the email body now. No subject line. No preamble. Just the message.
</instruction>`;
}
