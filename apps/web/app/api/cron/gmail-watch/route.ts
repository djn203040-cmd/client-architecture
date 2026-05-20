import "server-only";
import { inngest } from "@/inngest/client";
import { GMAIL_WATCH_RENEW } from "@client/shared/constants/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await inngest.send({ name: GMAIL_WATCH_RENEW, data: {} });
  return new Response("OK");
}
