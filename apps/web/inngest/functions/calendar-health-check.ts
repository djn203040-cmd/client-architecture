import "server-only";
import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import {
  checkCalendarIntegration,
  REFRESHABLE_CALENDAR_PROVIDERS,
  type TCalendarHealthResult,
} from "@/lib/calendar/health";
import type { CalendarProviderId } from "@/lib/calendar/providers";

type HealthCheckEvent = { name: string; data: Record<string, never> };

type StepTools = {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
};

/**
 * Extracted handler — exported for tests (same convention as
 * callOutcomePollerHandler).
 *
 * #64 — Calendar integrations are webhook-inbound, so a dead OAuth grant was
 * invisible: no runtime call ever failed, bookings just silently stopped
 * arriving. This daily probe refreshes tokens nearing expiry against each
 * provider's token endpoint — the only authenticated, unambiguous health
 * signal calendar integrations have. On invalid_grant/401 the lib marks the
 * integration disconnected and emits notification/integration_broken exactly
 * once (connected → disconnected transition), mirroring Gmail's invalid_grant
 * model. Webhook-signature 401s are deliberately NOT a signal — the receiver
 * URL is public.
 */
export async function calendarHealthCheckHandler({
  step,
}: {
  event: HealthCheckEvent;
  step: StepTools;
}) {
  const integrations = await step.run("fetch-connected-calendar-integrations", async () => {
    const { data } = await adminClient
      .from("integrations")
      .select("coach_id, provider")
      .eq("status", "connected")
      .in("provider", [...REFRESHABLE_CALENDAR_PROVIDERS]);
    return data ?? [];
  });

  const tally: Record<TCalendarHealthResult, number> = {
    fresh: 0,
    refreshed: 0,
    skipped: 0,
    broken: 0,
    error: 0,
  };

  for (const row of integrations) {
    const result = await step.run(`check-${row.provider}-${row.coach_id}`, () =>
      checkCalendarIntegration(row.coach_id, row.provider as CalendarProviderId),
    );
    tally[result] += 1;
  }

  return { checked: integrations.length, ...tally };
}

export const calendarHealthCheck = inngest.createFunction(
  {
    id: "calendar-health-check",
    name: "Calendar health check — refresh OAuth tokens, detect dead grants (#64)",
    // Inngest-native cron is the live cadence: Vercel Hobby caps vercel.json at
    // two daily crons and both slots are taken (gmail-watch, gmail-poll) — same
    // constraint that put call-outcome-poller on a native cron. The event
    // trigger remains a manual fast-path via /api/cron/calendar-health.
    // NOTE (#75): no cancelOn here — if one is ever added, keep it ≤ 5 events
    // or the whole registry sync silently freezes.
    triggers: [{ cron: "30 6 * * *" }, { event: "cron/calendar_health_check" }],
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: Inngest handler signature widened for event payload
  calendarHealthCheckHandler as any,
);
