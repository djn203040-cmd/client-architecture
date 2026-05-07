import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateLeadSchema } from "@client/shared/validators";
import { leadCreateLimiter } from "@/lib/security/ratelimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (leadCreateLimiter) {
    const { success } = await leadCreateLimiter.limit(user.id);
    if (!success) return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ ...parsed.data, coach_id: user.id, status: "identified" })
    .select()
    .single();

  if (error || !lead) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Lead with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }

  await supabase.from("lead_events").insert({
    lead_id: lead.id,
    coach_id: user.id,
    event_type: "state_changed",
    payload: { to: "identified", source: parsed.data.source },
    triggered_by: "coach",
  });

  if (parsed.data.coach_notes) {
    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      coach_id: user.id,
      event_type: "note_added",
      triggered_by: "coach",
    });
  }

  return NextResponse.json(lead, { status: 201 });
}
