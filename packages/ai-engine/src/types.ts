import type { Database } from '@client/database';
import type { TVoiceProfile } from '@client/shared/validators';

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
  // Real public booking URL (Calendly / Cal.com / Acuity / etc). When set,
  // the AI uses it verbatim; when null, the AI is instructed not to invent
  // or stub a placeholder link.
  bookingUrl: string | null;
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
