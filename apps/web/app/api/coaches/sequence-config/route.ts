import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const SequenceConfigSchema = z.object({
  no_show_delays: z.array(z.number().int().positive()).min(1).max(10),
  call_completed_delays: z.array(z.number().int().positive()).min(1).max(5),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = SequenceConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { error } = await adminClient
    .from("coaches")
    .update({ sequence_config: parsed.data })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
