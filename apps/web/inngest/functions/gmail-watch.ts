import { inngest } from "@/inngest/client";
import { adminClient } from "@/lib/supabase/admin";
import { setupGmailWatch } from "@/lib/gmail/monitor";
import { GMAIL_WATCH_RENEW } from "@client/shared/constants/events";
import { isInvalidGrantError, handleInvalidGrant } from "@/lib/gmail/error-handler";

export const gmailWatch = inngest.createFunction(
  { id: "gmail-watch", triggers: [{ event: GMAIL_WATCH_RENEW }] },
  async ({ step }) => {
    const coaches = await step.run("fetch-coaches-with-gmail", async () => {
      const { data } = await adminClient
        .from("integrations")
        .select("coach_id, watch_expiry_at")
        .eq("provider", "gmail")
        .eq("status", "connected");
      return data ?? [];
    });

    for (const { coach_id, watch_expiry_at } of coaches) {
      const expiresAt = watch_expiry_at ? new Date(watch_expiry_at) : null;
      // Renew if expiry is within 48 hours (7-day watch window, Pitfall 1)
      const renewalThreshold = new Date(Date.now() + 48 * 60 * 60 * 1000);
      if (expiresAt && expiresAt > renewalThreshold) continue;

      await step.run(`renew-watch-${coach_id}`, async () => {
        try {
          await setupGmailWatch(coach_id);
        } catch (e) {
          if (isInvalidGrantError(e)) {
            await handleInvalidGrant(coach_id);
            return; // Don't rethrow — continue to next coach
          }
          throw e;
        }
      });
    }

    return { renewed: coaches.length };
  }
);
