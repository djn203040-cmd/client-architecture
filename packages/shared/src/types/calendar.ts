import type { TIntegrationProvider } from "./index";

export interface TCalendarEvent {
  provider: TIntegrationProvider;
  externalEventId: string;
  coachId: string;
  leadEmail?: string;
  eventType: "booking_created" | "no_show" | "rescheduled" | "cancelled";
  eventStartAt: string;
  eventEndAt: string;
  rawPayload: unknown;
}

export type TCalendarEventType = TCalendarEvent["eventType"];
