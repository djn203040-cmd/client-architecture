import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { LEAD_NO_SHOW, LEAD_MANUALLY_ENROLLED } from "@client/shared/constants/events";

const DismissSchema = z.object({
  action: z.enum(["closed", "start_follow_up", "rescheduled", "enroll", "dismiss"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = DismissSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { action } = parsed.data;

  const { data: pendingAction } = await adminClient
    .from("pending_actions")
    .select("id, lead_id, coach_id, type, payload, dismissed_at")
    .eq("id", id)
    .eq("coach_id", user.id)
    .maybeSingle();

  if (!pendingAction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Idempotency: already dismissed, return success without re-running side effects
  if (pendingAction.dismissed_at) {
    return NextResponse.json({ ok: true, already: "dismissed" });
  }

  const leadId = pendingAction.lead_id;

  if (action === "closed" && leadId) {
    await adminClient.from("leads").update({ status: "converted" }).eq("id", leadId);
    await adminClient.from("lead_events").insert({
      lead_id: leadId,
      coach_id: user.id,
      event_type: "state_changed",
      payload: { to: "converted", trigger: "call_follow_up_closed" },
      triggered_by: "coach",
    });
  }

  if (action === "start_follow_up" && leadId) {
    await inngest.send({
      id: `manual-enroll-${leadId}-${Date.now()}`,
      name: LEAD_MANUALLY_ENROLLED,
      data: { coachId: user.id, leadId, track: "call_completed", triggeredBy: "pending_action" },
    });
  }

  if (action === "enroll" && leadId) {
    await inngest.send({
      id: `no-show-enroll-${leadId}-${Date.now()}`,
      name: LEAD_NO_SHOW,
      data: { coachId: user.id, leadId, triggeredBy: "pending_action" },
    });
  }

  // "rescheduled" and "dismiss" have no lead state side effects

  await adminClient
    .from("pending_actions")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
