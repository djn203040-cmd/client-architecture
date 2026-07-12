import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { processHistoryUpdate } from "@/lib/gmail/monitor";
import { isInvalidGrantError, handleInvalidGrant } from "@/lib/gmail/error-handler";

// Polling fallback: fires on "gmail/poll" cron event (Plan 03-02 wired the cron route)
export const gmailMonitor = inngest.createFunction(
  { id: "gmail-monitor", triggers: [{ event: "gmail/poll" }] },
  async ({ step }) => {
    const coaches = await step.run("fetch-active-coaches", async () => {
      const { data } = await adminClient
        .from("integrations")
        .select("coach_id, metadata")
        .eq("provider", "gmail")
        .eq("status", "connected");
      return data ?? [];
    });

    for (const { coach_id, metadata } of coaches) {
      const meta = metadata as { last_history_id?: string } | null;
      if (!meta?.last_history_id) continue; // No baseline, skip until watch establishes one

      // SEQ-004: processHistoryUpdate returns eventsToFire, fire via step.sendEvent(), never inngest.send()
      const { eventsToFire } = await step.run(`poll-coach-${coach_id}`, async () => {
        try {
          return await processHistoryUpdate(coach_id, meta.last_history_id!);
        } catch (e) {
          if (isInvalidGrantError(e)) {
            await handleInvalidGrant(coach_id);
            return { eventsToFire: [] };
          }
          throw e;
        }
      });

      if (eventsToFire.length > 0) {
        await step.sendEvent(`send-events-${coach_id}`, eventsToFire);
      }
    }

    return { polled: coaches.length };
  }
);

// Real-time path: fires when Pub/Sub push receiver routes a notification
export const gmailNotificationReceived = inngest.createFunction(
  { id: "gmail-notification-received", triggers: [{ event: "gmail/notification_received" }] },
  async ({ event, step }) => {
    const { coachId, historyId } = event.data as { coachId: string; historyId: string };

    const { eventsToFire } = await step.run("process-history", async () => {
      try {
        return await processHistoryUpdate(coachId, historyId);
      } catch (e) {
        if (isInvalidGrantError(e)) {
          await handleInvalidGrant(coachId);
          return { eventsToFire: [] };
        }
        throw e;
      }
    });

    if (eventsToFire.length > 0) {
      await step.sendEvent("send-gmail-events", eventsToFire);
    }
  }
);
