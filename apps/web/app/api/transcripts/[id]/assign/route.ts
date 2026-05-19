import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AssignSchema = z.object({
  leadId: z.string().uuid(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = AssignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { leadId } = parsed.data;

  // Verify transcript belongs to this coach
  const { data: transcript } = await supabase
    .from("transcripts")
    .select("id")
    .eq("id", id)
    .eq("coach_id", user.id)
    .maybeSingle();
  if (!transcript) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify lead belongs to this coach
  const { data: lead } = await supabase.from("leads").select("id, name").eq("id", leadId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { error } = await supabase
    .from("transcripts")
    .update({ lead_id: leadId, matched_by: "manual" })
    .eq("id", id)
    .eq("coach_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to assign transcript" }, { status: 500 });

  // Fire-and-forget draft generation
  void fetch(new URL("/api/drafts/generate", request.url).toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadId }),
  });

  return NextResponse.json({ success: true, leadName: lead.name });
}
