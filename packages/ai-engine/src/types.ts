import type { Database } from '@client/database';
import type { TVoiceProfile, TSalesToolkit } from '@client/shared/validators';

export type TDraft = Database['public']['Tables']['drafts']['Row'];
export type TLeadStatus = Database['public']['Enums']['lead_status'];

export interface DraftGenerationParams {
  coachId: string;
  leadId: string;
  leadStatus: TLeadStatus;
  leadName: string;
  aiSummary: string | null;
  transcript: string | null;
  conversationHistory: string | null;
  coachNotes: string | null;
  // The lead's ACTUAL inbound message(s) we are replying to, verbatim. For the
  // "replied" state this is the ground truth the draft must respond to. When a
  // lead sends several messages before we reply, all unanswered ones are
  // included (most recent last). null when there is no inbound message to answer
  // (e.g. proactive touchpoints, or a re-engagement nudge after silence).
  inboundMessages?: string | null;
  // Overrides the state-derived framing instruction when set. Used for flows
  // that share the draft engine but need bespoke intent (e.g. silence-gated
  // re-engagement) without minting a new lead_status enum value.
  framingOverride?: string | null;
  // Real public booking URL (Calendly / Cal.com / Acuity / etc). When set,
  // the AI uses it verbatim; when null, the AI is instructed not to invent
  // or stub a placeholder link.
  bookingUrl: string | null;
  // The coach's once-captured "how you sell" toolkit (philosophy, bridges,
  // downsells, leverage points). Injected into every draft so the AI can handle
  // objections the way this coach would. null when the coach has none, in which
  // case the <sales_toolkit> block is omitted entirely (pre-toolkit behavior).
  salesToolkit?: TSalesToolkit | null;
  touchpointIndex: number;
  voiceModel: TVoiceProfile | null;
}

export interface VoiceAnalysisParams {
  coachId: string;
  corpus: {
    gmail?: string;
    linkedin?: string;
    instagram?: string;
    whatsapp?: string;
  };
}

export type VoiceAnalysisResult = TVoiceProfile;
