import "server-only";
import { inngest } from "@/inngest/client";

// NOTE: the live 15-min cadence now runs on Inngest's native cron trigger
// (call-outcome-poller.ts) because Vercel Hobby rejects sub-daily crons. This
// route remains a manual fast-path (CRON_SECRET Bearer) for testing/recovery.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await inngest.send({ name: "cron/call_outcome_poll", data: {} });
  return new Response("OK");
}
