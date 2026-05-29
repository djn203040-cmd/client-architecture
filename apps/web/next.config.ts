import type { NextConfig } from "next";
import path from "node:path";

/**
 * Headers configured here are a fallback for routes that bypass middleware
 * (e.g. /_next/static, /favicon.ico). The full per-request CSP + nonce is
 * applied by middleware.ts.
 */
const STATIC_FALLBACK_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
  experimental: { typedRoutes: true },
  poweredByHeader: false,
  // The repo's flat ESLint config currently throws a circular-structure error
  // at the tooling level (eslint-config-next x eslint 9 flat-config compat),
  // which would fail `next build`. Quality is gated separately by `tsc
  // --noEmit` and the vitest suites, so skip lint during builds until the
  // ESLint config is repaired (tracked as a follow-up).
  eslint: { ignoreDuringBuilds: true },
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
