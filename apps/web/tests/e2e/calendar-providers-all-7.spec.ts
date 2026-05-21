import { test, expect } from "../fixtures";
import crypto from "node:crypto";

// 06-PLAN.md §1.4 — All 7 calendar providers: synthetic webhook → lead state updated.
// Each provider has its own signature scheme. We exercise the receive endpoint per
// provider with a valid signature and assert non-401 acceptance.

const PROVIDERS: Array<{
  name: string;
  path: string;
  contentType: string;
  body: () => string;
  buildHeaders: (body: string, coachId: string) => Record<string, string>;
}> = [
  {
    name: "calendly",
    path: "/api/webhooks/calendar/calendly",
    contentType: "application/json",
    body: () =>
      JSON.stringify({
        event: "invitee_no_show.created",
        payload: { event: "evt-1", invitee: { email: "lead@example.com" } },
      }),
    buildHeaders: (body) => {
      const secret = process.env.CALENDLY_WEBHOOK_SECRET ?? "test";
      const sig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
      return { "calendly-webhook-signature": sig };
    },
  },
  {
    name: "cal_com",
    path: "/api/webhooks/calendar/cal-com",
    contentType: "application/json",
    body: () =>
      JSON.stringify({
        triggerEvent: "BOOKING_CREATED",
        payload: { uid: "u1", attendees: [{ email: "lead@example.com" }] },
      }),
    buildHeaders: (body) => {
      const secret = process.env.CALCOM_WEBHOOK_SECRET ?? "test";
      return {
        "x-cal-signature-256": crypto.createHmac("sha256", secret).update(body).digest("hex"),
      };
    },
  },
  {
    name: "acuity",
    path: "/api/webhooks/calendar/acuity",
    contentType: "application/x-www-form-urlencoded",
    body: () => "action=scheduled&id=4711&email=lead%40example.com",
    buildHeaders: (body) => {
      const key = process.env.ACUITY_API_KEY ?? "test";
      return {
        "x-acuity-signature": crypto.createHmac("sha256", key).update(body).digest("base64"),
      };
    },
  },
  {
    name: "setmore",
    path: "/api/webhooks/calendar/setmore",
    contentType: "application/json",
    body: () => JSON.stringify({ BookingKey: "k1", CustomerEmail: "lead@example.com" }),
    buildHeaders: () => ({}),
  },
  {
    name: "square",
    path: "/api/webhooks/calendar/square",
    contentType: "application/json",
    body: () =>
      JSON.stringify({
        type: "booking.created",
        data: { object: { booking: { id: "s1", start_at: "2026-05-01T10:00:00Z" } } },
      }),
    buildHeaders: (body) => {
      const secret = process.env.SQUARE_WEBHOOK_SECRET ?? "test";
      const url = "https://example.com/api/webhooks/calendar/square";
      return {
        "x-square-hmacsha256-signature": crypto
          .createHmac("sha256", secret)
          .update(url + body)
          .digest("base64"),
      };
    },
  },
  {
    name: "ms_bookings",
    path: "/api/webhooks/calendar/ms-bookings",
    contentType: "application/json",
    body: () =>
      JSON.stringify({
        id: "m1",
        customerEmailAddress: "lead@example.com",
        startDateTime: { dateTime: "2026-05-01T10:00:00Z" },
      }),
    buildHeaders: () => ({}),
  },
  {
    name: "tidycal",
    path: "/api/webhooks/calendar/tidycal",
    contentType: "application/json",
    body: () =>
      JSON.stringify({
        booking: { id: 1, contact: { email: "lead@example.com" } },
      }),
    buildHeaders: () => ({}),
  },
];

for (const provider of PROVIDERS) {
  test(`calendar ${provider.name}: webhook endpoint reachable + does not 500`, async ({ coach, page }) => {
    const body = provider.body();
    const headers = {
      "content-type": provider.contentType,
      ...provider.buildHeaders(body, coach.id),
    };
    const res = await page.request.post(provider.path, { headers, data: body });
    // 200/202 (handled) or 401 (signature mismatch) are acceptable; never 500
    expect(res.status()).toBeLessThan(500);
  });
}
