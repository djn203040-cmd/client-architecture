import type { DraftGenerationParams } from '../types';
import type { TLeadStatus } from '../types';
import { isSalesToolkitEmpty, type TSalesToolkit } from '@client/shared/validators';

// Render the coach's sales toolkit as a readable block for the model. Returns
// an empty string when there is nothing usable, so the block is omitted and the
// draft behaves exactly as it did before the toolkit feature existed.
function buildSalesToolkitBlock(toolkit: TSalesToolkit | null | undefined): string {
  if (isSalesToolkitEmpty(toolkit) || !toolkit) return '';

  const parts: string[] = [];
  if (toolkit.philosophy.trim()) {
    parts.push(`Philosophy: ${toolkit.philosophy.trim()}`);
  }

  // The coach's real programs / pricing ladder. Rendered first so the model
  // understands WHAT is on offer before it reaches for a bridge or downsell.
  const usablePackages = toolkit.packages.filter((p) => p.name.trim());
  if (usablePackages.length > 0) {
    const lines = usablePackages
      .map((p) => {
        const attrs: string[] = [];
        if (p.price.trim()) attrs.push(`price: ${p.price.trim()}`);
        if (p.format.trim()) attrs.push(`format: ${p.format.trim()}`);
        if (p.includes.trim()) attrs.push(`includes: ${p.includes.trim()}`);
        if (p.ideal_for.trim()) attrs.push(`ideal for: ${p.ideal_for.trim()}`);
        return attrs.length > 0
          ? `- ${p.name.trim()} (${attrs.join('; ')})`
          : `- ${p.name.trim()}`;
      })
      .join('\n');
    parts.push(`Programs & pricing (the coach's real offer ladder):\n${lines}`);
  }

  const renderOptions = (label: string, options: TSalesToolkit['bridges']): void => {
    const usable = options.filter((o) => o.name.trim());
    if (usable.length === 0) return;
    const lines = usable
      .map((o) =>
        o.when_to_offer.trim()
          ? `- ${o.name.trim()} — offer when: ${o.when_to_offer.trim()}`
          : `- ${o.name.trim()}`,
      )
      .join('\n');
    parts.push(`${label}:\n${lines}`);
  };
  renderOptions('Bridges (ways to close the gap on an objection)', toolkit.bridges);
  renderOptions('Downsells (lighter offers to fall back to)', toolkit.downsells);
  if (toolkit.leverage_points.trim()) {
    parts.push(
      `Leverage points (what the coach learns on discovery, so you know what you might have on this lead): ${toolkit.leverage_points.trim()}`,
    );
  }

  return `<sales_toolkit>\n${parts.join('\n\n')}\n</sales_toolkit>`;
}

// State-specific framing. Each entry must be explicit about:
// 1. Where the ground truth lives for THIS state (transcript vs coach_notes
//    vs neither), so the model doesn't invent context.
// 2. Whether the lead has actually sent a message in this state, many of
//    these states (identified, no_show, in_sequence, call_booked) involve
//    NO message from the lead, and earlier drafts hallucinated replies.
const STATE_FRAMING: Record<TLeadStatus, string> = {
  identified:
    'First-touch outreach. The coach has not yet spoken with this lead and the lead has not yet messaged the coach. Do not write as if responding to a message, there is none. Ground every detail in the coach notes (how this lead came in, what they expressed interest in). Lead with warmth and genuine curiosity. Invite a conversation, not a commitment. Keep it brief.',
  call_booked:
    'The lead has booked a call but it has not happened yet. The lead has not sent a message, do not write as if replying to one. Write a brief, welcoming, anticipatory message that makes them feel good about the booking. Reference any specifics from coach notes if present. Keep it short.',
  no_show:
    'The lead booked a call and then did not show up; the call never happened. THE LEAD HAS NOT SENT A MESSAGE about it, so do not write as if replying to one. Your OPENING LINE must directly and warmly acknowledge that they were not on the booked call, while gently leaving room that something may simply have come up on their end. Do not skip this with a generic "hope you are well" opener; kindly naming the missed call is the whole point of this first message. Express it naturally in the coach\'s own language and voice. Do NOT translate any wording from these instructions literally into the message, and do not leave any word in a different language than the rest of the message. After acknowledging the no-show, with no blame, guilt-trip, or desperation, offer one clear, low-pressure way to rebook. If coach notes describe context (first-time vs repeat no-show), honor that.',
  call_completed:
    'The coach just had a sales call with this lead. The transcript is the primary source of truth for what was discussed; the coach notes capture the coach\'s own takeaways and any next-step commitments made. Write a message that bridges the interest shown on the call to the next step (usually a proposal, a follow-up resource, or a clear ask). Reference one specific moment from the transcript, not a recap of the whole call. Help them see the next step as the obvious move. If a <sales_toolkit> block is present and the transcript surfaced hesitation about scope, timing, or price, you may shape the proposal around a bridge or downsell from the toolkit, framed as the sensible next step for THEM, never as a discount pitch.',
  in_sequence:
    'This is touchpoint #{touchpointIndex} in an active follow-up sequence. The lead has not replied yet (if they had, the status would be "replied", do not write as if responding to a reply). Use the coach notes to understand where this lead is in their decision-making and what tone fits this specific touchpoint. Earlier touchpoints should be warmer and more exploratory; later ones more direct and outcome-focused.',
  replied:
    'The lead has replied. THE LEAD\'S ACTUAL REPLY IS IN THE <lead_reply> BLOCK, read it and respond directly to what they said. Address their specific words, concerns, or questions. If there are several messages in that block, the lead sent them before you could answer; respond to all of them together in one coherent reply, not just the last one. Do NOT ask the coach to paste in the reply (you already have it). Do NOT write a generic response. The coach notes may describe the coach\'s intent for the response (e.g. "I want to hold the price but offer a bridge"), if so, honor that intent while still answering what the lead actually wrote. If the lead is raising an objection (price, timing, "let me think", "maybe in a few months"), do NOT simply accept the deferral. Make ONE gentle attempt to bridge the gap first: lead with THEIR stated goal (from the coach notes or transcript, e.g. the outcome they said they wanted), then, if the <sales_toolkit> block offers a bridge or downsell that fits their specific objection, propose it as the way to solve the obstacle, not as a discount. If nothing in the toolkit fits, still gently reaffirm the value and leave a warm, open door, then respect their pace. Never pushy, never desperate, one nudge and then let it breathe.',
  converted:
    'The lead has become a client. Write a warm, personal, forward-looking welcome-aboard message. Celebrate their decision without being over-the-top. Set a positive tone for the journey ahead. Reference their goals if available from the transcript or coach notes.',
  lost:
    'This lead is dormant, there was prior interest that did not convert and the relationship has gone quiet. The coach notes describe the history and what changed (or why things stalled). Write a reactivation message: light touch, no guilt about the gap, reference the specific context in the notes (what was discussed, what changed, why now is a sensible moment to reopen). Do NOT write a welcome-aboard message, they are not a new client.',
  // These states are hard-blocked, generateDraft returns null before reaching this map.
  // Entries are required for TypeScript exhaustiveness on the full TLeadStatus union.
  unsubscribed: '',
  do_not_contact: '',
  bounced: '',
};

export function buildDraftUserPrompt(params: DraftGenerationParams): string {
  // A framingOverride lets flows that reuse this engine (e.g. re-engagement)
  // supply bespoke intent without minting a new lead_status. Falls back to the
  // state-derived framing.
  let baseFraming = params.framingOverride ?? STATE_FRAMING[params.leadStatus];

  // Guard the "replied" contradiction: that framing promises the lead's words
  // live in a <lead_reply> block, but inboundMessages can come back empty when
  // the Gmail thread fetch degrades (no thread id, API hiccup). With no block,
  // the original instruction makes the model beg the coach to paste the reply
  // ("Jeg mangler Augusta's svar..."). When the block is genuinely absent, swap
  // in a framing that never references it and never asks for the message, write
  // a brief, honest continuation grounded in history and notes instead.
  if (params.leadStatus === 'replied' && !params.inboundMessages) {
    baseFraming =
      "The lead has replied to your last message, but their exact words are not available to you here. Do NOT ask the coach to paste or send the reply, do NOT mention a missing <lead_reply> block, and do NOT invent or quote anything specific they said. Write a brief, warm, natural message that simply acknowledges they got back to you and gently moves the conversation toward the next step, grounded only in the conversation history and coach notes. Keep it short and low-pressure.";
  }

  const stateInstruction = baseFraming.replace(
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
  // transcript (no-show, identified, in_sequence, replied, lost). The model
  // must read them and treat them as fact, not background flavor.
  const notesBlock = params.coachNotes
    ? `<coach_notes>\n${params.coachNotes}\n</coach_notes>`
    : '<coach_notes>\nNo coach notes on this lead.\n</coach_notes>';

  const historyBlock = params.conversationHistory
    ? `<conversation_history>\n${params.conversationHistory}\n</conversation_history>`
    : '<conversation_history>\nNo prior conversation on record.\n</conversation_history>';

  // The lead's actual inbound message(s), verbatim. This is the ground truth for
  // the "replied" state, the draft must answer what is here, not a paraphrase.
  // Omitted entirely when there is nothing to answer, so proactive states aren't
  // tempted to write as if replying to a message.
  const replyBlock = params.inboundMessages
    ? `<lead_reply>\n${params.inboundMessages}\n</lead_reply>\n\n`
    : '';

  // The coach's real public booking URL. When present, the model uses it
  // verbatim. When absent, the model is told not to fabricate or stub a
  // placeholder link, fixes the "[CALENDLY LINK]" placeholder problem.
  const bookingBlock = params.bookingUrl
    ? `<booking_url>\n${params.bookingUrl}\n</booking_url>`
    : '<booking_url>\nNo booking URL configured. Do not include a booking link in this draft. Do not write "[CALENDLY LINK]", "[BOOKING LINK]", or any other placeholder. If the message would normally end with "book a time here", end it differently, e.g. "let me know what works" or whatever fits the voice.\n</booking_url>';

  // The coach's sales toolkit. Present for EVERY draft (lead-state-agnostic);
  // the model decides when it's relevant. Omitted entirely when the coach has
  // no toolkit, so empty-toolkit coaches see no behavior change. Includes a
  // one-line usage rule so the model treats it as a tool, not a script.
  const toolkitBody = buildSalesToolkitBlock(params.salesToolkit);
  const toolkitBlock = toolkitBody
    ? `${toolkitBody}\n\nUse the sales toolkit only when it genuinely fits this lead's situation. It is a set of tools, not a script: never force a bridge or downsell where there is no objection to bridge, and never turn a warm reply into a sales pitch.\n\n`
    : '';

  return `<lead_context>
Name: ${params.leadName}
Status: ${params.leadStatus}
Touchpoint: ${params.touchpointIndex}
</lead_context>

${summaryBlock}

${replyBlock}${notesBlock}

${transcriptBlock}

${historyBlock}

${bookingBlock}

${toolkitBlock}<instruction>
${stateInstruction}

Write the subject line in <subject></subject> tags first, then the email body. No preamble. Just the message.
</instruction>`;
}
