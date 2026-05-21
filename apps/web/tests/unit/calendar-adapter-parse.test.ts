// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  normalizeCalendlyPayload,
  normalizeCalComPayload,
  normalizeAcuityPayload,
  normalizeSetmorePayload,
  normalizeSquarePayload,
  normalizeMsBookingsPayload,
  normalizeTidyCalPayload,
} from "@/lib/calendar";

// 06-PLAN.md §1.2 — "Calendar adapters: all 7 providers parse webhook payloads into TCalendarEvent"
// Each adapter accepts (body, coachId) and returns TCalendarEvent | null.

const COACH = "coach-uuid-1";

describe("CAL-001..007: calendar adapter payload parsing", () => {
  it("Calendly: parses no-show event", () => {
    const event = normalizeCalendlyPayload(
      {
        event: "invitee_no_show.created",
        payload: {
          event: "https://api.calendly.com/scheduled_events/ABC",
          invitee: { email: "lead@example.com" },
          start_time: "2026-05-01T10:00:00Z",
          end_time: "2026-05-01T10:30:00Z",
        },
      },
      COACH,
    );
    expect(event).not.toBeNull();
    expect(event!.provider).toBe("calendly");
    expect(event!.eventType).toBe("no_show");
    expect(event!.leadEmail).toBe("lead@example.com");
  });

  it("Calendly: returns null for unrecognized event", () => {
    const event = normalizeCalendlyPayload(
      { event: "invitee.canceled", payload: { event: "X" } },
      COACH,
    );
    expect(event).toBeNull();
  });

  it("Cal.com: parses booking_created event", () => {
    const event = normalizeCalComPayload(
      {
        triggerEvent: "BOOKING_CREATED",
        payload: {
          uid: "cal-com-uid-1",
          attendees: [{ email: "lead@example.com" }],
          startTime: "2026-05-01T10:00:00Z",
        },
      },
      COACH,
    );
    expect(event).not.toBeNull();
    expect(event!.provider).toBe("cal_com");
    expect(event!.eventType).toBe("booking_created");
    expect(event!.leadEmail).toBe("lead@example.com");
  });

  it("Acuity: parses scheduled event", () => {
    const event = normalizeAcuityPayload(
      {
        action: "scheduled",
        id: 4711,
        email: "lead@example.com",
        datetime: "2026-05-01T10:00:00Z",
      },
      COACH,
    );
    expect(event).not.toBeNull();
    expect(event!.provider).toBe("acuity");
    expect(event!.externalEventId).toBe("4711");
  });

  it("Setmore: parses booking with BookingKey", () => {
    const event = normalizeSetmorePayload(
      {
        BookingKey: "setmore-key-1",
        CustomerEmail: "lead@example.com",
        StartTime: "2026-05-01T10:00:00Z",
      },
      COACH,
    );
    expect(event).not.toBeNull();
    expect(event!.provider).toBe("setmore");
    expect(event!.leadEmail).toBe("lead@example.com");
  });

  it("Square: parses booking.created event", () => {
    const event = normalizeSquarePayload(
      {
        type: "booking.created",
        data: {
          object: {
            booking: {
              id: "square-id-1",
              start_at: "2026-05-01T10:00:00Z",
              customer_id: "cust_xyz",
            },
          },
        },
      },
      COACH,
    );
    expect(event).not.toBeNull();
    expect(event!.provider).toBe("square");
    expect(event!.externalEventId).toBe("square-id-1");
  });

  it("MS Bookings: parses booking with customer email", () => {
    const event = normalizeMsBookingsPayload(
      {
        id: "msb-id-1",
        customerEmailAddress: "lead@example.com",
        startDateTime: { dateTime: "2026-05-01T10:00:00Z" },
      },
      COACH,
    );
    expect(event).not.toBeNull();
    expect(event!.provider).toBe("ms_bookings");
    expect(event!.leadEmail).toBe("lead@example.com");
  });

  it("TidyCal: parses booking event", () => {
    const event = normalizeTidyCalPayload(
      {
        booking: {
          id: 12345,
          contact: { email: "lead@example.com" },
          starts_at: "2026-05-01T10:00:00Z",
        },
      },
      COACH,
    );
    expect(event).not.toBeNull();
    expect(event!.provider).toBe("tidycal");
    expect(event!.externalEventId).toBe("12345");
    expect(event!.leadEmail).toBe("lead@example.com");
  });

  it("All adapters preserve coachId", () => {
    const e = normalizeCalendlyPayload(
      {
        event: "invitee.created",
        payload: { event: "X", invitee: { email: "a@b.com" } },
      },
      COACH,
    );
    expect(e?.coachId).toBe(COACH);
  });
});
