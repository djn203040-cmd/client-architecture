// 06-PLAN.md §1.10 — Sentry client-side init scaffold.
//
// The actual @sentry/nextjs init is wired by 06-02 (security hardening) once the
// PII-redacting `beforeSend` body lands. This scaffold defines the contract:
//   - init() only runs when NEXT_PUBLIC_SENTRY_DSN is set
//   - beforeSend stub is replaced by the redactor in 06-02 Task 6

export interface SentryEventStub {
  request?: { headers?: Record<string, string> };
  user?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

// 06-02 Task 6 replaces this stub body with the redactor that strips
// email/phone/name/lead body content before egress.
export function beforeSend(event: SentryEventStub): SentryEventStub {
  return event;
}

export const sentryClientConfig = {
  dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"] ?? "",
  enabled:
    !!process.env["NEXT_PUBLIC_SENTRY_DSN"] && process.env.NODE_ENV !== "test",
  tracesSampleRate: 0.1,
  beforeSend,
} as const;
