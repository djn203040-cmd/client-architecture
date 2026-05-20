import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { LEAD_NO_SHOW, LEAD_MANUALLY_ENROLLED, LEAD_CALL_COMPLETED } from "@client/shared/constants/events";

const EnrollSchema = z.object({
  leadId: z.string().uuid(),
  track: z.enum(["no_show", "call_completed"]),
  calendarEventId: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = EnrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { leadId, track, calendarEventId } = parsed.data;
  const coachId = user.id;

  const { data: lead } = await adminClient
    .from("leads")
    .select("id, status, email")
    .eq("id", leadId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (track === "call_completed" && calendarEventId) {
    // Resume the waiting call-completed sequence by sending the decision event
    await inngest.send({
      id: `call-followup-${leadId}-${Date.now()}`,
      name: LEAD_CALL_COMPLETED,
      data: { coachId, leadId, action: "start_follow_up", calendarEventId, triggeredBy: "manual" },
    });
  } else {
    const eventName = track === "no_show" ? LEAD_NO_SHOW : LEAD_MANUALLY_ENROLLED;
    await inngest.send({
      id: `manual-${leadId}-${Date.now()}`,
      name: eventName,
      data: { coachId, leadId, track, triggeredBy: "manual" },
    });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
