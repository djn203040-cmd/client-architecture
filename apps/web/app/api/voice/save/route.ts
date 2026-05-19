import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VoiceProfileSchema } from "@client/shared/validators";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = VoiceProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid voice profile", details: parsed.error.issues }, { status: 400 });
  }

  const { error } = await supabase
    .from("coaches")
    .update({ voice_model: parsed.data })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save voice profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
