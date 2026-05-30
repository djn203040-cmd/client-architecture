import type { DraftGenerationParams } from '../types';
import type { TLeadStatus } from '../types';

// State-specific framing. Each entry must be explicit about:
// 1. Where the ground truth lives for THIS state (transcript vs coach_notes
//    vs neither), so the model doesn't invent context.
// 2. Whether the lead has actually sent a message in this state — many of
//    these states (identified, no_show, in_sequence, call_booked) involve
//    NO message from the lead, and earlier drafts hallucinated replies.
const STATE_FRAMING: Record<TLeadStatus, string> = {
  identified:
    'First-touch outreach. The coach has not yet spoken with this lead and the lead has not yet messaged the coach. Do not write as if responding to a message — there is none. Ground every detail in the coach notes (how this lead came in, what they expressed interest in). Lead with warmth and genuine curiosity. Invite a conversation, not a commitment. Keep it brief.',
  call_booked:
    'The lead has booked a call but it has not happened yet. The lead has not sent a message — do not write as if replying to one. Write a brief, welcoming, anticipatory message that makes them feel good about the booking. Reference any specifics from coach notes if present. Keep it short.',
  no_show:
    'The lead booked a call and then did not show up — the call never happened. THE LEAD HAS NOT SENT A MESSAGE about it — do not write as if replying to one. Your OPENING LINE must explicitly and warmly name that they were not on the call, and softly leave room that something came up — the equivalent, in the coach\'s own language and voice, of "I didn\'t catch you on the call — guessing something came up?" or "looks like we missed each other earlier." Do NOT open with a generic "hope you\'re doing well" check-in that omits the missed call — naming the no-show directly is the whole point of this message. After acknowledging it (no blame, no guilt-trip, no desperation), offer one clear, low-pressure path to rebook. If coach notes describe context (first-time vs repeat no-show), honor that.',
  call_completed:
    'The coach just had a sales call with this lead. The transcript is the primary source of truth for what was discussed; the coach notes capture the coach\'s own takeaways and any next-step commitments made. Write a message that bridges the interest shown on the call to the next step (usually a proposal, a follow-up resource, or a clear ask). Reference one specific moment from the transcript — not a recap of the whole call. Help them see the next step as the obvious move.',
  in_sequence:
    'This is touchpoint #{touchpointIndex} in an active follow-up sequence. The lead has not replied yet (if they had, the status would be "replied" — do not write as if responding to a reply). Use the coach notes to understand where this lead is in their decision-making and what tone fits this specific touchpoint. Earlier touchpoints should be warmer and more exploratory; later ones more direct and outcome-focused.',
  replied:
    'The lead has replied. THE LEAD\'S ACTUAL REPLY IS IN THE COACH NOTES — read the notes, find the quoted reply or the coach\'s description of what the lead said, and respond directly to that content. Address their specific words, concerns, or questions. Do NOT ask the coach to paste in the reply (you already have it). Do NOT write a generic response. If the notes describe the coach\'s intent for the response (e.g. "I want to hold the price but offer a bridge"), honor that intent.',
  converted:
    'The lead has become a client. Write a warm, personal, forward-looking welcome-aboard message. Celebrate their decision without being over-the-top. Set a positive tone for the journey ahead. Reference their goals if available from the transcript or coach notes.',
  closed:
    'This lead is dormant — there was prior interest that did not convert and the relationship has gone quiet. The coach notes describe the history and what changed (or why things stalled). Write a reactivation message: light touch, no guilt about the gap, reference the specific context in the notes (what was discussed, what changed, why now is a sensible moment to reopen). Do NOT write a welcome-aboard message — they are not a new client.',
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

  // Coach notes are the coach's own running record of what's happened with
  // this lead and what they want the next message to do. They are the most
  // recent and authoritative source of truth for any state where there's no
  // transcript (no-show, identified, in_sequence, replied, closed). The model
  // must read them and treat them as fact, not background flavor.
  const notesBlock = params.coachNotes
    ? `<coach_notes>\n${params.coachNotes}\n</coach_notes>`
    : '<coach_notes>\nNo coach notes on this lead.\n</coach_notes>';

  const historyBlock = params.conversationHistory
    ? `<conversation_history>\n${params.conversationHistory}\n</conversation_history>`
    : '<conversation_history>\nNo prior conversation on record.\n</conversation_history>';

  // The coach's real public booking URL. When present, the model uses it
  // verbatim. When absent, the model is told not to fabricate or stub a
  // placeholder link — fixes the "[CALENDLY LINK]" placeholder problem.
  const bookingBlock = params.bookingUrl
    ? `<booking_url>\n${params.bookingUrl}\n</booking_url>`
    : '<booking_url>\nNo booking URL configured. Do not include a booking link in this draft. Do not write "[CALENDLY LINK]", "[BOOKING LINK]", or any other placeholder. If the message would normally end with "book a time here", end it differently — e.g. "let me know what works" or whatever fits the voice.\n</booking_url>';

  return `<lead_context>
Name: ${params.leadName}
Status: ${params.leadStatus}
Touchpoint: ${params.touchpointIndex}
</lead_context>

${summaryBlock}

${notesBlock}

${transcriptBlock}

${historyBlock}

${bookingBlock}

<instruction>
${stateInstruction}

Write the subject line in <subject></subject> tags first, then the email body. No preamble. Just the message.
</instruction>`;
}
