import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { normalizeTidyCalPayload } from "@/lib/calendar";
import { verifyCalendarWebhookToken } from "@/lib/calendar/verify-webhook-token";
import { processCalendarEvent } from "@/lib/calendar/process-event";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const coachId = url.searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // TidyCal offers no HMAC signature, verify the per-coach URL token (#82).
  const token = url.searchParams.get("token");
  if (!(await verifyCalendarWebhookToken(coachId, "tidycal", token))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify coach exists (T-07-01)
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const event = normalizeTidyCalPayload(JSON.parse(rawBody), coachId);
  if (!event) return new Response("OK", { status: 200 });

  await processCalendarEvent(event);
  return new Response("OK", { status: 200 });
}
