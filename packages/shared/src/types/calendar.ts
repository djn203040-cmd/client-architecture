import type { TIntegrationProvider } from "./index";

export interface TCalendarEvent {
  provider: TIntegrationProvider;
  externalEventId: string;
  coachId: string;
  leadEmail?: string;
  // Optional invitee details, populated by normalizers when the provider
  // sends them; used by upsertLeadFromBooking for placeholder leads (D-04).
  leadName?: string;
  leadPhone?: string;
  eventType: "booking_created" | "no_show" | "rescheduled" | "cancelled";
  eventStartAt: string;
  eventEndAt: string;
  rawPayload: unknown;
}

export type TCalendarEventType = TCalendarEvent["eventType"];
