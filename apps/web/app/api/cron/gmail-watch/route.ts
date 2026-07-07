import "server-only";
import { inngest } from "@/inngest/client";
import { GMAIL_WATCH_RENEW } from "@client/shared/constants/events";
import { assertCronAuth } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuth(request);
  if (denied) return denied;
  await inngest.send({ name: GMAIL_WATCH_RENEW, data: {} });
  return new Response("OK");
}
