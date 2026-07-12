// 06-02 Task 6, Sentry client config with PII-redacting beforeSend.
//
// The actual @sentry/nextjs init is gated by the SDK + DSN. This module
// exports both a stable `beforeSend` (now backed by the redactor in
// lib/logging/redact.ts) and a `sentryClientConfig` object that the
// runtime initializer reads when NEXT_PUBLIC_SENTRY_DSN is set.

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

export const sentryClientConfig = {
  dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"] ?? "",
  enabled:
    !!process.env["NEXT_PUBLIC_SENTRY_DSN"] && process.env.NODE_ENV !== "test",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend,
} as const;
