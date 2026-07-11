import { z } from "zod";

// The 7 calendar providers. Mirrors apps/web/lib/calendar/providers.ts CalendarProviderId.
// Subset of the broader integration_provider DB enum (which also includes gmail/slack/twilio/instagram).
export const CalendarProviderEnum = z.enum([
  "calendly",
  "cal_com",
  "acuity",
  "setmore",
  "square",
  "ms_bookings",
  "tidycal",
]);
export type TCalendarProvider = z.infer<typeof CalendarProviderEnum>;

// API-key paste payload, used by /api/auth/calendar/[provider]/api-key.
// Max 512 chars protects against accidental file paste; real keys are well under this.
export const CalendarApiKeyPayloadSchema = z.object({
  apiKey: z.string().trim().min(1, "API key is required").max(512, "That's too long for an API key"),
  dryRun: z.boolean().optional(),
});
export type TCalendarApiKeyPayload = z.infer<typeof CalendarApiKeyPayloadSchema>;

// Disconnect payload, empty body, but kept for shape parity / future fields.
export const CalendarDisconnectPayloadSchema = z.object({}).strict();
export type TCalendarDisconnectPayload = z.infer<typeof CalendarDisconnectPayloadSchema>;

// Webhook-info query, used by GET /api/auth/calendar/webhook-info.
export const CalendarWebhookInfoQuerySchema = z.object({
  provider: CalendarProviderEnum,
});
export type TCalendarWebhookInfoQuery = z.infer<typeof CalendarWebhookInfoQuerySchema>;
