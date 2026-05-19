import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ManualTranscriptSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = ManualTranscriptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { leadId, content } = parsed.data;

  // Verify lead belongs to this coach
  const { data: lead } = await supabase.from("leads").select("id").eq("id", leadId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { data: transcript, error } = await supabase.from("transcripts").insert({
    coach_id: user.id,
    lead_id: leadId,
    provider: "manual",
    content,
    matched_by: "manual",
    token_count: content.split(/\s+/).length,
  }).select().single();

  if (error || !transcript) {
    return NextResponse.json({ error: "Failed to save transcript" }, { status: 500 });
  }

  // Fire-and-forget draft generation
  void fetch(new URL("/api/drafts/generate", request.url).toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadId }),
  });

  return NextResponse.json(transcript, { status: 201 });
}
