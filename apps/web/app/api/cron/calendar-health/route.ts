import "server-only";
import { inngest } from "@/inngest/client";
import { assertCronAuth } from "@/lib/security/cron-auth";

// NOTE: the live daily cadence runs on Inngest's native cron trigger
// (calendar-health-check.ts) because both Vercel Hobby cron slots are taken.
// This route is a manual fast-path (CRON_SECRET Bearer) for testing/recovery,
// mirroring /api/cron/call-outcome-poll.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuth(request);
  if (denied) return denied;
  await inngest.send({ name: "cron/calendar_health_check", data: {} });
  return new Response("OK");
}
