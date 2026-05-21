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
 * - frame-src: only Cal.com — Module 2/3 sell-page embeds.
 * - frame-ancestors: 'none' — defense against clickjacking.
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
  if (isDev) connectSrc.push("ws://localhost:*", "http://localhost:*");

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
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([k, vals]) => (vals.length ? `${k} ${vals.join(" ")}` : k))
    .join("; ");
}

/**
 * Static header bundle (everything except CSP, which needs a per-request nonce).
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
