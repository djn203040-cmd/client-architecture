// 06-PLAN.md §1.10 — Sentry server-side init scaffold.
// The actual @sentry/nextjs init lands in 06-02 (security hardening).

export interface SentryEventStub {
  request?: { headers?: Record<string, string> };
  user?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

// 06-02 Task 6 replaces this stub body with the redactor.
export function beforeSend(event: SentryEventStub): SentryEventStub {
  return event;
}

export const sentryServerConfig = {
  dsn: process.env["SENTRY_DSN"] ?? "",
  enabled: !!process.env["SENTRY_DSN"] && process.env.NODE_ENV !== "test",
  tracesSampleRate: 0.1,
  beforeSend,
} as const;
