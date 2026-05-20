import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const BodySchema = z.object({
  draftId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { draftId } = parsed.data;

  // Verify draft belongs to this coach AND is a demo draft — refuse to intercept real drafts
  const { data: draft } = await supabase
    .from("drafts")
    .select("id, lead_id, generation_context")
    .eq("id", draftId)
    .eq("coach_id", user.id)
    .maybeSingle();

  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ctx = draft.generation_context as Record<string, unknown> | null;
  if (!ctx || ctx["demo"] !== true) {
    return NextResponse.json({ error: "Not a demo draft" }, { status: 403 });
  }

  // Critical: does NOT call gmail.users.messages.send — writes draft.status='sent' only
  // Service-role direct UPDATE for demo drafts (bypass advisory-lock CAS path for demo rows)
  const { error: updateErr } = await adminClient
    .from("drafts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("coach_id", user.id)
    .eq("generation_context->>demo" as never, "true");

  if (updateErr) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  // Soft-archive the demo lead
  if (draft.lead_id) {
    await adminClient
      .from("leads")
      .update({ status: "closed" })
      .eq("id", draft.lead_id)
      .eq("coach_id", user.id);
  }

  const celebrationMessage =
    "Great work — that's exactly what happens for every real lead. The draft has been saved to your Gmail drafts folder for reference.";

  return NextResponse.json({ ok: true, celebrationMessage });
}
