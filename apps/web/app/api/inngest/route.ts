import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sequenceNoShow } from "@/inngest/functions/sequence-no-show";
import { sequenceCallCompleted } from "@/inngest/functions/sequence-call-completed";
import { gmailWatch } from "@/inngest/functions/gmail-watch";
import { gmailMonitor, gmailNotificationReceived } from "@/inngest/functions/gmail-monitor";
import { replyHandler } from "@/inngest/functions/reply-handler";
import { bounceHandler } from "@/inngest/functions/bounce-handler";
import { autonomousModeBTimer } from "@/inngest/functions/autonomous-mode-b-timer";
import { notificationDispatcher } from "@/inngest/functions/notification-dispatcher";
import { draftFollowupCta } from "@/inngest/functions/draft-followup-cta";
import { sendViaGmail } from "@/inngest/functions/send-via-gmail";

// REQUIRED: Vercel default 10s timeout breaks Inngest long-polling (RESEARCH.md Pitfall 4)
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sequenceNoShow,
    sequenceCallCompleted,
    gmailWatch,
    gmailMonitor,
    gmailNotificationReceived,
    replyHandler,
    bounceHandler,
    autonomousModeBTimer,
    notificationDispatcher,
    draftFollowupCta,
    sendViaGmail,
  ],
});
