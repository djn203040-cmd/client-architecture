/**
 * Public domains. The .com is the canonical app domain (login, dashboard,
 * email links); the .dk serves the Danish landing page and redirects
 * everything else to the .com. The legacy vercel.app host 308s page requests
 * to the .com but keeps serving API/webhook routes registered with providers.
 */
export const SITE_HOST_EN = "theclientarchitecture.com";
export const SITE_HOST_DA = "theclientarchitecture.dk";
export const LEGACY_PROD_HOST = "client-architecture-one.vercel.app";

export const SITE_URL_EN = `https://${SITE_HOST_EN}`;
export const SITE_URL_DA = `https://${SITE_HOST_DA}`;

/** hreflang map shared by both landing pages. */
export const LANDING_LANGUAGE_ALTERNATES = {
  en: SITE_URL_EN,
  da: SITE_URL_DA,
  "x-default": SITE_URL_EN,
} as const;
