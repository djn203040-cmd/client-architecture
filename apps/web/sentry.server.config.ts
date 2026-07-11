// 06-02 Task 6, Sentry server config with PII-redacting beforeSend.
//
// Mirrors sentry.client.config.ts but for the server runtime. Both routes
// share the redactor in lib/logging/redact.ts so client + server events have
// identical scrubbing behavior.

import { scrubSentryEvent } from "./lib/logging/redact";

export interface SentryEventStub extends Record<string, unknown> {
  request?: { headers?: Record<string, string> };
  user?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  message?: string;
  breadcrumbs?: Array<Record<string, unknown>>;
  exception?: Record<string, unknown>;
}

export function beforeSend(event: SentryEventStub): SentryEventStub {
  return scrubSentryEvent(event);
}

export const sentryServerConfig = {
  dsn: process.env["SENTRY_DSN"] ?? "",
  enabled: !!process.env["SENTRY_DSN"] && process.env.NODE_ENV !== "test",
  tracesSampleRate: 0.05,
  sendDefaultPii: false,
  beforeSend,
} as const;
