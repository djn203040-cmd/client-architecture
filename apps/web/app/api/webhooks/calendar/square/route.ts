import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { verifySquareSignature, normalizeSquarePayload } from "@/lib/calendar";
import { processCalendarEvent } from "@/lib/calendar/process-event";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const coachId = new URL(request.url).searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  // Square HMAC includes full notification URL in hash input (CAL-004, T-07-01)
  const notificationUrl = new URL(request.url).toString();
  const valid = verifySquareSignature(
    rawBody,
    request.headers.get("x-square-hmacsha256-signature"),
    process.env.SQUARE_WEBHOOK_SECRET!,
    notificationUrl
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // Verify coach exists (T-07-01)
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const event = normalizeSquarePayload(JSON.parse(rawBody), coachId);
  if (!event) return new Response("OK", { status: 200 });

  await processCalendarEvent(event);
  return new Response("OK", { status: 200 });
}
