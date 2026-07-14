import "server-only";

/**
 * Per-request nonce generator + CSP builder.
 *
 * The nonce must be cryptographically random (16 bytes b64). It is set on
 * every request inside middleware.ts and exposed via the `x-csp-nonce` request
 * header so that server components can read it via `headers()` and apply it to
 * inline `<Script nonce>` tags.
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

interface CspOptions {
  nonce: string;
  /** Loosen connect-src in dev (Next.js HMR, Vite, Inngest dev server). */
  isDev?: boolean;
}

/**
 * Build the CSP header. Keep allowlists tight; document every entry below.
 *
 * - script-src: nonces only (no `unsafe-inline`). Cal.com embed loads from
 *   cal.com / app.cal.com.
 * - style-src: 'unsafe-inline' is required by Tailwind/shadcn for inline
 *   style attributes on hover/transition primitives. (Documented compromise.)
 * - frame-src: only Cal.com, Module 2/3 sell-page embeds.
 * - frame-ancestors: 'none', defense against clickjacking.
 */
export function buildCsp({ nonce, isDev = false }: CspOptions): string {
  const supabaseHost = "https://*.supabase.co";
  const supabaseWs = "wss://*.supabase.co";
  const inngest = "https://*.inngest.com";
  const anthropic = "https://api.anthropic.com";
  const resend = "https://api.resend.com";
  const twilio = "https://api.twilio.com";

  const connectSrc = [
    "'self'",
    supabaseHost,
    supabaseWs,
    anthropic,
    resend,
    twilio,
    inngest,
    // Sentry (if configured at runtime; ingest host is project-specific)
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://*.ingest.de.sentry.io",
  ];
  // CSP host matching is literal: `localhost` does NOT cover `127.0.0.1`. The
  // local Supabase stack serves REST + Realtime on http://127.0.0.1:54321, so
  // both spellings are needed or the browser silently drops every client-side
  // Supabase call (Realtime WS included) in dev/E2E.
  if (isDev)
    connectSrc.push(
      "ws://localhost:*",
      "http://localhost:*",
      "ws://127.0.0.1:*",
      "http://127.0.0.1:*",
    );

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Cal.com embed loader
      "https://cal.com",
      "https://app.cal.com",
      // Allow eval in dev only (Next.js dev refresh)
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": connectSrc,
    "frame-src": ["https://app.cal.com", "https://cal.com"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    // Production only. The dev/test server is plain HTTP on localhost, and this
    // directive rewrites every subresource to https://localhost:3000 — where
    // nothing is listening. WebKit honors it there (Chromium/Firefox exempt
    // localhost), so react-dom fails to load and the page never hydrates: it
    // renders but is dead to clicks. See HSTS_HEADER below, same class of bug.
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };

  return Object.entries(directives)
    .map(([k, vals]) => (vals.length ? `${k} ${vals.join(" ")}` : k))
    .join("; ");
}

/**
 * HSTS is a PRODUCTION-ONLY header — callers must skip it when serving over
 * plain HTTP. RFC 6797 §7.2: a host MUST NOT send Strict-Transport-Security in
 * responses conveyed over non-secure transport. Beyond the spec, emitting it on
 * http://localhost breaks WebKit, which (unlike Chromium/Firefox) honors HSTS
 * on localhost and force-upgrades every /_next chunk to https://localhost:3000
 * — where there's no TLS listener. React never loads, the page never hydrates,
 * and it renders correctly but ignores every click.
 */
export const HSTS_HEADER = "Strict-Transport-Security";

/**
 * Static header bundle (everything except CSP, which needs a per-request nonce).
 * This is the PRODUCTION set; see HSTS_HEADER for the one entry that must be
 * dropped over plain HTTP.
 */
export const STATIC_SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "X-DNS-Prefetch-Control": "off",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;
