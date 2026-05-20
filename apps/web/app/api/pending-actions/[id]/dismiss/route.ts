import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const DismissSchema = z.object({
  action: z.enum(["closed", "start_follow_up", "rescheduled", "start_sequence", "dismiss"]),
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

  const { data: action_row } = await adminClient
    .from("pending_actions")
    .select("id, lead_id, coach_id, type")
    .eq("id", id)
    .eq("coach_id", user.id)
    .maybeSingle();

  if (!action_row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await adminClient
    .from("pending_actions")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id);

  if (parsed.data.action === "closed" && action_row.lead_id) {
    await adminClient.from("leads").update({ status: "converted" }).eq("id", action_row.lead_id);
    await adminClient.from("lead_events").insert({
      lead_id: action_row.lead_id,
      coach_id: user.id,
      event_type: "state_changed",
      payload: { to: "converted", reason: "coach_marked_closed" },
      triggered_by: "coach",
    });
  }

  return NextResponse.json({ ok: true });
}
