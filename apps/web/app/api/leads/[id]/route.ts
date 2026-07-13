import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit/log";
import { UpdateLeadSchema } from "@client/shared/validators";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = UpdateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { data: existing } = await supabase.from("leads").select("status").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // STATE-007: setting status='do_not_contact' must also flip do_not_contact flag
  const update = { ...parsed.data };
  if (parsed.data.status === "do_not_contact") {
    update.do_not_contact = true;
  }

  const { data: updated, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }

  // STATE-009: log state change event
  if (parsed.data.status && parsed.data.status !== existing.status) {
    await supabase.from("lead_events").insert({
      lead_id: id,
      coach_id: user.id,
      event_type: "state_changed",
      payload: { from: existing.status, to: parsed.data.status },
      triggered_by: "coach",
    });
  }

  if (parsed.data.coach_notes !== undefined) {
    await supabase.from("lead_events").insert({
      lead_id: id,
      coach_id: user.id,
      event_type: "note_added",
      triggered_by: "coach",
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS already scopes the delete to the coach's own rows; the explicit
  // coach_id filter is defense-in-depth so a future RLS regression can't widen
  // this into a cross-tenant delete.
  const { data: deleted, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("coach_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Article 30 accountability: a lead delete cascades to that lead's
  // transcripts, drafts and event history, so record who erased what.
  await writeAuditLog(
    {
      coachId: user.id,
      action: "lead_deleted",
      metadata: { lead_id: id },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: req.headers.get("user-agent"),
    },
    adminClient,
  ).catch(() => {});

  return new NextResponse(null, { status: 204 });
}
