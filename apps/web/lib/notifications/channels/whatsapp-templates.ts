import "server-only";

/**
 * WhatsApp utility templates submitted to Meta via Twilio Content API.
 * Daniel submits the template body (matching the strings below verbatim) through the
 * Twilio console; on approval, the resulting Content SID is set into the env var listed.
 *
 * Template variable map:
 *   {{1}} = lead first/full name (truncated to 30 chars to match SMS budget)
 *   {{2}} = formatted send time, e.g., "Tuesday 3:00 PM"
 *   {{3}} = full review link (https://app.sonorous.com/review/{token})
 *
 * draft_followup_v1 has only 2 variables:
 *   {{1}} = lead name
 *   {{2}} = review link
 */
export const WHATSAPP_TEMPLATES = {
  draft_ready: {
    name: "draft_ready_v1",
    category: "UTILITY" as const,
    contentSidEnvVar: "TWILIO_WHATSAPP_DRAFT_READY_CONTENT_SID",
    bodyForReview:
      "Draft ready for {{1}}, scheduled to send at {{2}}. Review: {{3}}",
  },
  draft_followup: {
    name: "draft_followup_v1",
    category: "UTILITY" as const,
    contentSidEnvVar: "TWILIO_WHATSAPP_DRAFT_FOLLOWUP_CONTENT_SID",
    bodyForReview: "Reminder: draft for {{1}} is still waiting. Review: {{2}}",
  },
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;
