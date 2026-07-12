import "server-only";

/**
 * Strict CORS policy.
 *
 * Webhook routes are server-to-server only and MUST NOT be browser-callable.
 * Returning no `Access-Control-Allow-Origin` denies preflight from any origin.
 *
 * The dashboard is same-origin, so it does not need CORS allowances.
 * Public callbacks (Stripe-style redirects) come via top-level navigation, not XHR.
 */
const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "";

const PROVIDER_ORIGINS = new Set<string>(
  [
    "https://calendly.com",
    "https://cal.com",
    "https://api.cal.com",
    "https://acuityscheduling.com",
    "https://api.acuityscheduling.com",
    "https://my.setmore.com",
    "https://connect.squareup.com",
    "https://graph.microsoft.com",
    "https://tidycal.com",
    "https://hooks.slack.com",
    "https://slack.com",
    "https://api.resend.com",
    "https://api.twilio.com",
    "https://fireflies.ai",
    "https://api.fireflies.ai",
    "https://zoom.us",
    "https://api.zoom.us",
    "https://api.inngest.com",
  ].filter(Boolean),
);

export function isAllowedAppOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (APP_URL && origin === APP_URL) return true;
  return false;
}

export function isKnownProviderOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return PROVIDER_ORIGINS.has(origin);
}

/**
 * Webhooks: deny browser CORS entirely. Always return null headers, no
 * Access-Control-Allow-Origin, no Allow-Methods.
 */
export const WEBHOOK_CORS_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
};
