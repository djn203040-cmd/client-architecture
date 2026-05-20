import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sequenceNoShow } from "@/inngest/functions/sequence-no-show";
import { sequenceCallCompleted } from "@/inngest/functions/sequence-call-completed";
// gmailWatch,    // add in Plan 03-03
// gmailMonitor,  // add in Plan 03-03
// replyHandler,  // add in Plan 03-04

// REQUIRED: Vercel default 10s timeout breaks Inngest long-polling (RESEARCH.md Pitfall 4)
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sequenceNoShow,
    sequenceCallCompleted,
  ],
});
