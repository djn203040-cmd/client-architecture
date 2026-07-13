import "server-only";
import { inngest } from "@/inngest/client";
import { assertCronAuth } from "@/lib/security/cron-auth";
import { CRON_DNC_PURGE } from "@client/shared/constants/events";

// Manual fast-path (CRON_SECRET Bearer) for the GDPR retention purge. The live
// daily cadence runs on Inngest's native cron (do-not-contact-purge.ts); this
// exists for testing/recovery, mirroring reconcile-due-sends.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuth(request);
  if (denied) return denied;
  await inngest.send({ name: CRON_DNC_PURGE, data: {} });
  return new Response("OK");
}
