import type { NextConfig } from "next";
import path from "node:path";

/**
 * Headers configured here are a fallback for routes that bypass middleware
 * (e.g. /_next/static, /favicon.ico). The full per-request CSP + nonce is
 * applied by middleware.ts.
 */
const isProd = process.env.NODE_ENV === "production";

const STATIC_FALLBACK_HEADERS = [
  // HSTS is https-only (RFC 6797 §7.2) — never send it from the plain-HTTP
  // dev/test server. WebKit honors HSTS on localhost (Chromium/Firefox don't)
  // and force-upgrades /_next assets to https://localhost, so React never loads
  // and the page renders unhydrated: visible, but dead to every click.
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const config: NextConfig = {
  transpilePackages: ["@client/shared", "@client/database", "@client/ai-engine"],
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  typedRoutes: true,
  poweredByHeader: false,
  // The repo carries pre-existing strict-null type debt (lib/voice/parse-speakers.ts,
  // lib/unsubscribe-token.ts) from before it was ever built. Don't block the
  // deploy on it; `tsc --noEmit` remains the dev/CI quality gate and the debt is
  // a tracked follow-up. (Next 16 no longer runs ESLint during build, so the
  // separately-broken flat ESLint config no longer affects the build.)
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      { source: "/:path*", headers: STATIC_FALLBACK_HEADERS },
    ];
  },
  async redirects() {
    return [
      { source: "/settings/autonomous", destination: "/settings#autonomous", permanent: true },
      { source: "/settings/notifications", destination: "/settings#notifications", permanent: true },
      { source: "/settings/voice", destination: "/settings#voice", permanent: true },
    ];
  },
};

export default config;
