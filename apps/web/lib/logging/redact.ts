/**
 * PII redactor for application logs, Sentry breadcrumbs, and Inngest events.
 *
 * Two layers:
 *   1. KEY-based: any property whose key matches the PII keyset is replaced
 *      with `[REDACTED]`.
 *   2. VALUE-based: string values are scanned for email and E.164 phone
 *      patterns and the matches are replaced inline.
 *
 * Symmetric output for symmetric input — circular references break the cycle
 * with `[Circular]`.
 */

const PII_KEY_REGEX =
  /^(email|email_address|emailAddress|phone|phone_number|phoneNumber|name|first_name|last_name|firstName|lastName|full_name|fullName|address|ip|ip_address|ipAddress|user_agent|userAgent|access_token|refresh_token|api_key|apiKey|secret|signing_secret|signingSecret|password|authorization|cookie|set_cookie)$/i;

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._\-+/=]{10,}\b/gi;

const REDACTED = "[REDACTED]";

export function redactString(input: string): string {
  return input
    .replace(JWT_RE, "[jwt]")
    .replace(BEARER_RE, "Bearer [redacted]")
    .replace(EMAIL_RE, "[email]")
    .replace(PHONE_RE, (match) => {
      // Avoid redacting short numbers that look like phones but aren't (HTTP
      // status, file size, etc.). Heuristic: at least 8 digits total.
      const digits = match.replace(/\D/g, "");
      return digits.length >= 8 ? "[phone]" : match;
    });
}

export function redact<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value) as unknown as T;
  if (typeof value !== "object") return value;
  if (seen.has(value as object)) return "[Circular]" as unknown as T;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, seen)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (PII_KEY_REGEX.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = redact(v, seen);
  }
  return out as unknown as T;
}

/**
 * Sentry-compatible beforeSend / beforeBreadcrumb scrubber. Returns a new
 * event with PII-bearing fields redacted in-place.
 */
export function scrubSentryEvent<E extends Record<string, unknown>>(event: E): E {
  return redact(event);
}

/**
 * Inngest-friendly log helper: scrub the payload before emitting to the
 * structured logger.
 */
export interface SafeLogger {
  info(label: string, data?: unknown): void;
  warn(label: string, data?: unknown): void;
  error(label: string, data?: unknown): void;
}

export const logger: SafeLogger = {
  info(label, data) {
    // eslint-disable-next-line no-console, no-restricted-syntax -- reason: this SafeLogger is the one audited console sink (COMPLY-009); every value is redacted first
    if (data !== undefined) console.info(label, redact(data));
    // eslint-disable-next-line no-console, no-restricted-syntax -- reason: audited SafeLogger sink (COMPLY-009)
    else console.info(label);
  },
  warn(label, data) {
    // console.warn is allowed by the no-console config; values still go through redact().
    if (data !== undefined) console.warn(label, redact(data));
    else console.warn(label);
  },
  error(label, data) {
    // console.error is allowed by the no-console config; values still go through redact().
    if (data !== undefined) console.error(label, redact(data));
    else console.error(label);
  },
};
