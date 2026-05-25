// Central calendar-provider registry.
// One source of truth for the connect flow: auth type, OAuth endpoints, scopes,
// API-key validation endpoint, webhook setup mode, display copy.
//
// The 7 receivers in apps/web/app/api/webhooks/calendar/*/route.ts are the inbound
// side — already live. This registry powers the connect side built in 06-04.

export type CalendarProviderId =
  | "calendly"
  | "cal_com"
  | "acuity"
  | "setmore"
  | "square"
  | "ms_bookings"
  | "tidycal";

export type CalendarAuthType = "oauth2" | "api_key";
export type WebhookSetupMode = "auto" | "manual";

export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  // Extra query-string params for the auth request (e.g. Microsoft's response_mode).
  extraAuthParams?: Record<string, string>;
  // Env var names — we check presence to know whether the OAuth app has been registered.
  clientIdEnv: string;
  clientSecretEnv: string;
  // Token-revoke endpoint (POST with access_token); some providers don't support this.
  revokeUrl?: string;
}

export interface ApiKeyConfig {
  // Where the coach finds the key.
  helpUrl: string;
  // Friendly field label in the form.
  fieldLabel: string;
  // Probe endpoint we hit with the key to validate it (returns 200 if valid).
  validationEndpoint: string;
  // How we send the key: 'bearer' → "Authorization: Bearer <key>",
  // 'api-key-header' → "X-API-Key: <key>", 'basic-base64' → "Authorization: Basic <base64>".
  validationAuth: "bearer" | "api-key-header" | "basic-base64";
}

export interface WebhookConfig {
  mode: WebhookSetupMode;
  // For "manual" providers — markdown rendered in WebhookSetupPanel telling the
  // coach exactly where to paste our URL + secret.
  instructions?: string;
  // For "auto" providers — name of the registerFn in apps/web/lib/calendar/webhooks/.
  registerFnName?: string;
}

export interface CalendarProviderConfig {
  id: CalendarProviderId;
  label: string;            // "Calendly"
  shortDescription: string; // "1-on-1 scheduling for solo creators."
  logo: string;             // "/providers/calendly.svg"
  brandColor: string;       // tailwind-safe hex for the card accent
  authType: CalendarAuthType;
  oauth?: OAuthConfig;
  apiKey?: ApiKeyConfig;
  webhook: WebhookConfig;
  // Where the coach can read about / sign up for the provider.
  marketingUrl: string;
}

// ---------------------------------------------------------------------------
// Webhook receiver URL builder — matches apps/web/app/api/webhooks/calendar/*
// ---------------------------------------------------------------------------

export function buildWebhookReceiverUrl(provider: CalendarProviderId, coachId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const slug = provider === "cal_com" ? "cal-com" : provider === "ms_bookings" ? "ms-bookings" : provider;
  return `${baseUrl}/api/webhooks/calendar/${slug}?coachId=${coachId}`;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const CALENDAR_PROVIDERS: Record<CalendarProviderId, CalendarProviderConfig> = {
  calendly: {
    id: "calendly",
    label: "Calendly",
    shortDescription: "1-on-1 scheduling for solo coaches.",
    logo: "/providers/calendly.svg",
    brandColor: "#006BFF",
    authType: "oauth2",
    marketingUrl: "https://calendly.com",
    oauth: {
      authUrl: "https://auth.calendly.com/oauth/authorize",
      tokenUrl: "https://auth.calendly.com/oauth/token",
      scopes: [],
      clientIdEnv: "CALENDLY_CLIENT_ID",
      clientSecretEnv: "CALENDLY_CLIENT_SECRET",
      revokeUrl: "https://auth.calendly.com/oauth/revoke",
    },
    webhook: {
      mode: "auto",
      registerFnName: "registerCalendlyWebhook",
    },
  },

  cal_com: {
    id: "cal_com",
    label: "Cal.com",
    shortDescription: "Open-source scheduling.",
    logo: "/providers/cal-com.svg",
    brandColor: "#111111",
    authType: "api_key",
    marketingUrl: "https://cal.com",
    apiKey: {
      helpUrl: "https://cal.com/docs/api-reference/v1/authentication",
      fieldLabel: "Cal.com API key",
      validationEndpoint: "https://api.cal.com/v1/me",
      validationAuth: "bearer",
    },
    webhook: {
      mode: "auto",
      registerFnName: "registerCalComWebhook",
    },
  },

  acuity: {
    id: "acuity",
    label: "Acuity Scheduling",
    shortDescription: "Squarespace's scheduling product.",
    logo: "/providers/acuity.svg",
    brandColor: "#1A2129",
    authType: "oauth2",
    marketingUrl: "https://acuityscheduling.com",
    oauth: {
      authUrl: "https://acuityscheduling.com/oauth2/authorize",
      tokenUrl: "https://acuityscheduling.com/oauth2/token",
      scopes: ["api-v1"],
      clientIdEnv: "ACUITY_CLIENT_ID",
      clientSecretEnv: "ACUITY_CLIENT_SECRET",
    },
    webhook: {
      mode: "auto",
      registerFnName: "registerAcuityWebhook",
    },
  },

  setmore: {
    id: "setmore",
    label: "Setmore",
    shortDescription: "Free booking software.",
    logo: "/providers/setmore.svg",
    brandColor: "#43BFB8",
    authType: "api_key",
    marketingUrl: "https://setmore.com",
    apiKey: {
      helpUrl: "https://developer.setmore.com/",
      fieldLabel: "Setmore refresh token",
      validationEndpoint: "https://developer.setmore.com/api/v1/o/oauth2/token",
      validationAuth: "bearer",
    },
    webhook: {
      mode: "manual",
      instructions: [
        "1. Sign in to your Setmore account and open **Apps & Integrations → Webhooks**.",
        "2. Click **Add webhook** and paste the URL above.",
        "3. Subscribe to: `BOOKING_CREATED`, `BOOKING_UPDATED`, `BOOKING_DELETED`.",
        "4. Save. Test by creating a fake booking — it should appear on your dashboard within seconds.",
      ].join("\n"),
    },
  },

  square: {
    id: "square",
    label: "Square Appointments",
    shortDescription: "Booking for service businesses.",
    logo: "/providers/square.svg",
    brandColor: "#000000",
    authType: "oauth2",
    marketingUrl: "https://squareup.com/us/en/appointments",
    oauth: {
      authUrl: "https://connect.squareup.com/oauth2/authorize",
      tokenUrl: "https://connect.squareup.com/oauth2/token",
      scopes: ["APPOINTMENTS_READ", "APPOINTMENTS_WRITE", "MERCHANT_PROFILE_READ"],
      clientIdEnv: "SQUARE_CLIENT_ID",
      clientSecretEnv: "SQUARE_CLIENT_SECRET",
      revokeUrl: "https://connect.squareup.com/oauth2/revoke",
    },
    webhook: {
      mode: "manual",
      instructions: [
        "1. Sign in to the [Square Developer Dashboard](https://developer.squareup.com/).",
        "2. Open your application → **Webhooks → Subscriptions → Add Endpoint**.",
        "3. Paste the URL above.",
        "4. Subscribe to events: `booking.created`, `booking.updated`.",
        "5. Copy the **signature key** Square shows you, then paste it back here as the webhook secret.",
      ].join("\n"),
    },
  },

  ms_bookings: {
    id: "ms_bookings",
    label: "Microsoft Bookings",
    shortDescription: "Microsoft 365 scheduling.",
    logo: "/providers/ms-bookings.svg",
    brandColor: "#0078D4",
    authType: "oauth2",
    marketingUrl: "https://www.microsoft.com/en-us/microsoft-365/business/scheduling-and-booking-app",
    oauth: {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      scopes: ["Bookings.Read.All", "Bookings.ReadWrite.All", "offline_access"],
      extraAuthParams: { response_mode: "query" },
      clientIdEnv: "MS_BOOKINGS_CLIENT_ID",
      clientSecretEnv: "MS_BOOKINGS_CLIENT_SECRET",
    },
    webhook: {
      mode: "manual",
      instructions: [
        "Microsoft Bookings does not yet support direct webhooks. We poll the Graph API every 5 minutes.",
        "After connecting, bookings will appear with up to 5 min delay. No further setup needed.",
      ].join("\n"),
    },
  },

  tidycal: {
    id: "tidycal",
    label: "TidyCal",
    shortDescription: "AppSumo's lightweight scheduler.",
    logo: "/providers/tidycal.svg",
    brandColor: "#0066FF",
    authType: "api_key",
    marketingUrl: "https://tidycal.com",
    apiKey: {
      helpUrl: "https://tidycal.com/api-documentation",
      fieldLabel: "TidyCal API token",
      validationEndpoint: "https://tidycal.com/api/me",
      validationAuth: "bearer",
    },
    webhook: {
      mode: "manual",
      instructions: [
        "1. Sign in to TidyCal and open **Account → API → Webhooks**.",
        "2. Click **Add webhook** and paste the URL above.",
        "3. Subscribe to: `booking.created`, `booking.cancelled`.",
        "4. Save.",
      ].join("\n"),
    },
  },
};

export const CALENDAR_PROVIDER_IDS = Object.keys(CALENDAR_PROVIDERS) as CalendarProviderId[];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getCalendarProvider(id: string): CalendarProviderConfig | null {
  return CALENDAR_PROVIDERS[id as CalendarProviderId] ?? null;
}

// Returns true if the OAuth env vars for a provider are present.
// UI uses this to disable Connect buttons that would 500 immediately.
export function isOAuthConfigured(provider: CalendarProviderConfig): boolean {
  if (provider.authType !== "oauth2" || !provider.oauth) return false;
  return Boolean(
    process.env[provider.oauth.clientIdEnv] && process.env[provider.oauth.clientSecretEnv],
  );
}

// Build the OAuth redirect URI the callback route lives at.
// Provider's OAuth app config must whitelist exactly this URL.
export function buildOAuthRedirectUri(provider: CalendarProviderId): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/auth/calendar/${provider}/callback`;
}
