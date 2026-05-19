import { createHmac, timingSafeEqual } from "crypto";
import type { TCalendarEvent } from "@client/shared/types";

// ---------------------------------------------------------------------------
// Signature verification helpers — all use timingSafeEqual to prevent timing oracle (T-03-01)
// ---------------------------------------------------------------------------

export function verifyCalendlySignature(
  rawBody: string,
  header: string | null,
  secret: string
): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyCalComSignature(
  rawBody: string,
  header: string | null,
  secret: string
): boolean {
  if (!header) return false;
  const parsed = JSON.parse(rawBody) as unknown;
  const expected = createHmac("sha256", secret)
    .update(JSON.stringify(parsed))
    .digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyAcuitySignature(
  rawBody: string,
  header: string | null,
  apiKey: string
): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", apiKey).update(rawBody).digest("base64");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifySquareSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  notificationUrl: string
): boolean {
  if (!header) return false;
  // Square HMAC input is notificationUrl + rawBody with NO separator (per Square docs)
  const expected = createHmac("sha256", secret)
    .update(notificationUrl + rawBody)
    .digest("base64");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// TODO: No documented signature verification for this provider — accept all
export function verifySetmoreSignature(): boolean {
  return true;
}

// TODO: No documented signature verification for this provider — accept all
export function verifyMsBookingsSignature(): boolean {
  return true;
}

// TODO: No documented signature verification for this provider — accept all
export function verifyTidyCalSignature(): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// Payload normalizers — return TCalendarEvent | null (null = unknown event type, ignore)
// ---------------------------------------------------------------------------

interface CalendlyPayload {
  event: string;
  payload: {
    event: string;
    invitee?: { email?: string };
    start_time?: string;
    end_time?: string;
  };
}

export function normalizeCalendlyPayload(
  body: unknown,
  coachId: string
): TCalendarEvent | null {
  const p = body as CalendlyPayload;
  const eventType = p.event;
  let type: TCalendarEvent["eventType"] | null = null;

  if (eventType === "invitee_no_show.created") type = "no_show";
  else if (eventType === "invitee.created") type = "booking_created";
  else return null;

  return {
    provider: "calendly",
    externalEventId: p.payload.event,
    coachId,
    leadEmail: p.payload.invitee?.email,
    eventType: type,
    eventStartAt: p.payload.start_time ?? new Date().toISOString(),
    eventEndAt: p.payload.end_time ?? new Date().toISOString(),
    rawPayload: body,
  };
}

interface CalComPayload {
  triggerEvent: string;
  payload: {
    uid: string;
    attendees?: Array<{ email?: string }>;
    startTime?: string;
    endTime?: string;
  };
}

export function normalizeCalComPayload(
  body: unknown,
  coachId: string
): TCalendarEvent | null {
  const p = body as CalComPayload;
  let type: TCalendarEvent["eventType"] | null = null;

  if (p.triggerEvent === "BOOKING_NO_SHOW_UPDATED") type = "no_show";
  else if (p.triggerEvent === "BOOKING_CREATED") type = "booking_created";
  else return null;

  const leadEmail = p.payload.attendees?.[0]?.email;

  return {
    provider: "cal_com",
    externalEventId: p.payload.uid,
    coachId,
    leadEmail,
    eventType: type,
    eventStartAt: p.payload.startTime ?? new Date().toISOString(),
    eventEndAt: p.payload.endTime ?? new Date().toISOString(),
    rawPayload: body,
  };
}

interface AcuityPayload {
  id: number;
  action: string;
  email?: string;
  datetime?: string;
  endTime?: string;
}

export function normalizeAcuityPayload(
  body: unknown,
  coachId: string
): TCalendarEvent | null {
  const p = body as AcuityPayload;
  if (p.action !== "scheduled") return null;

  return {
    provider: "acuity",
    externalEventId: String(p.id),
    coachId,
    leadEmail: p.email,
    eventType: "booking_created",
    eventStartAt: p.datetime ?? new Date().toISOString(),
    eventEndAt: p.endTime ?? new Date().toISOString(),
    rawPayload: body,
  };
}

interface SetmorePayload {
  BookingKey?: string;
  CustomerEmail?: string;
  StartTime?: string;
  EndTime?: string;
}

export function normalizeSetmorePayload(
  body: unknown,
  coachId: string
): TCalendarEvent | null {
  const p = body as SetmorePayload;
  if (!p.BookingKey) return null;

  return {
    provider: "setmore",
    externalEventId: p.BookingKey,
    coachId,
    leadEmail: p.CustomerEmail,
    eventType: "booking_created",
    eventStartAt: p.StartTime ?? new Date().toISOString(),
    eventEndAt: p.EndTime ?? new Date().toISOString(),
    rawPayload: body,
  };
}

interface SquarePayload {
  type: string;
  data?: {
    object?: {
      booking?: {
        id?: string;
        start_at?: string;
        customer_id?: string;
      };
    };
  };
}

export function normalizeSquarePayload(
  body: unknown,
  coachId: string
): TCalendarEvent | null {
  const p = body as SquarePayload;
  let type: TCalendarEvent["eventType"] | null = null;

  if (p.type === "booking.created") type = "booking_created";
  else if (p.type === "booking.updated") type = "rescheduled";
  else return null;

  const booking = p.data?.object?.booking;
  if (!booking?.id) return null;

  return {
    provider: "square",
    externalEventId: booking.id,
    coachId,
    eventType: type,
    eventStartAt: booking.start_at ?? new Date().toISOString(),
    eventEndAt: new Date().toISOString(),
    rawPayload: body,
  };
}

interface MsBookingsPayload {
  id?: string;
  customerEmailAddress?: string;
  startDateTime?: { dateTime?: string };
  endDateTime?: { dateTime?: string };
}

export function normalizeMsBookingsPayload(
  body: unknown,
  coachId: string
): TCalendarEvent | null {
  const p = body as MsBookingsPayload;
  if (!p.id) return null;

  return {
    provider: "ms_bookings",
    externalEventId: p.id,
    coachId,
    leadEmail: p.customerEmailAddress,
    eventType: "booking_created",
    eventStartAt: p.startDateTime?.dateTime ?? new Date().toISOString(),
    eventEndAt: p.endDateTime?.dateTime ?? new Date().toISOString(),
    rawPayload: body,
  };
}

interface TidyCalPayload {
  booking?: {
    id?: number;
    contact?: { email?: string };
    starts_at?: string;
    ends_at?: string;
  };
}

export function normalizeTidyCalPayload(
  body: unknown,
  coachId: string
): TCalendarEvent | null {
  const p = body as TidyCalPayload;
  if (!p.booking?.id) return null;

  return {
    provider: "tidycal",
    externalEventId: String(p.booking.id),
    coachId,
    leadEmail: p.booking.contact?.email,
    eventType: "booking_created",
    eventStartAt: p.booking.starts_at ?? new Date().toISOString(),
    eventEndAt: p.booking.ends_at ?? new Date().toISOString(),
    rawPayload: body,
  };
}
