interface LeadDescriptionParams {
  transcript?: string;
  conversationHistory?: string;
  existingSummary?: string;
  coachNotes?: string;
  leadName: string;
}

export function buildLeadDescriptionPrompt(params: LeadDescriptionParams): {
  system: string;
  user: string;
} {
  const system = `You are a context analyst. Your job is to synthesize available information about a coaching lead into a single concise paragraph that helps the coach recall who this person is and what they're working on.

Rules:
- Write facts only. Never invent pain points, goals, or biographical details not evidenced in the provided context.
- Write in third person, plainly. No AI-cliché phrases.
- Target ~150–200 words. One paragraph.
- Cover: what they do or where they are in life, stated goals, implied challenges, emotional signals from the conversation, and anything unusual or notable.
- If information is sparse, write what you know and no more.`;

  const blocks: string[] = [];

  if (params.transcript?.trim()) {
    blocks.push(`<transcript>\n${params.transcript}\n</transcript>`);
  }
  if (params.conversationHistory?.trim()) {
    blocks.push(`<conversation_history>\n${params.conversationHistory}\n</conversation_history>`);
  }
  if (params.existingSummary?.trim()) {
    blocks.push(`<existing_description>\n${params.existingSummary}\n</existing_description>`);
  }
  if (params.coachNotes?.trim()) {
    blocks.push(`<coach_notes>\n${params.coachNotes}\n</coach_notes>`);
  }

  const user = `${blocks.join('\n\n')}

<instruction>
Synthesize the information above into a single plain-text paragraph describing ${params.leadName}. Cover their situation, goals, and emotional signals where evident. Facts only — do not fabricate.
</instruction>`;

  return { system, user };
}
