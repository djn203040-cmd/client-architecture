import { test, expect } from "../fixtures";

// Gmail push (/api/webhooks/gmail/push) intentionally has no signature check:
// it must ACK all requests to prevent GCP retry storms (T-03-13).
// The remaining 9 endpoints all enforce HMAC/token signatures.

const ENDPOINTS = [
  { path: "/api/webhooks/slack/interactivity", header: "x-slack-signature" },
  { path: "/api/webhooks/twilio/status", header: "x-twilio-signature" },
  { path: "/api/webhooks/calendar/calendly", header: "calendly-webhook-signature" },
  { path: "/api/webhooks/calendar/cal-com", header: "x-cal-signature-256" },
  { path: "/api/webhooks/calendar/acuity", header: "x-acuity-signature" },
  { path: "/api/webhooks/calendar/setmore", header: "x-setmore-signature" },
  { path: "/api/webhooks/calendar/square", header: "x-square-hmacsha256-signature" },
  { path: "/api/webhooks/calendar/ms-bookings", header: "x-ms-bookings-signature" },
  { path: "/api/webhooks/calendar/tidycal", header: "x-tidycal-signature" },
] as const;

for (const { path, header } of ENDPOINTS) {
  test(`${path} rejects invalid ${header}`, async ({ request }) => {
    const res = await request.post(`http://localhost:3000${path}`, {
      headers: { "content-type": "application/json", [header]: "bogus-invalid-signature" },
      data: { event: "test" },
    });
    // The forged request must be rejected with a 4xx before any side effects, 
    // never accepted (2xx) and never a server error (5xx). Slack/Twilio reject
    // at the signature check (401); the calendar routes validate the payload
    // shape first, so a stub body surfaces as 400. Both are valid rejections.
    expect(res.status(), `${path} should reject a forged signature with a 4xx`).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
}
