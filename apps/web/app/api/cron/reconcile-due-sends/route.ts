import "server-only";
import { inngest } from "@/inngest/client";
import { assertCronAuth } from "@/lib/security/cron-auth";
import { CRON_RECONCILE_DUE_SENDS } from "@client/shared/constants/events";

// The live 10-min cadence runs on Inngest's native cron trigger
// (due-draft-reconciler.ts) because Vercel Hobby rejects sub-daily crons. This
// route is a manual fast-path (CRON_SECRET Bearer) for testing/recovery (#83).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuth(request);
  if (denied) return denied;
  await inngest.send({ name: CRON_RECONCILE_DUE_SENDS, data: {} });
  return new Response("OK");
}
