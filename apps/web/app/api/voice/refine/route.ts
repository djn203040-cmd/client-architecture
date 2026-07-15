import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refineVoiceRules } from "@client/ai-engine";
import { VoiceProfileSchema, VoiceRefineRequestSchema } from "@client/shared/validators";
import { voiceRefineLimiter, enforce } from "@/lib/security/ratelimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cost-guard rate limit: refine is a paid Anthropic call.
  const rl = await enforce(voiceRefineLimiter, `coach:${user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded, try again in an hour." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = VoiceRefineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("voice_model")
    .eq("id", user.id)
    .single();

  const voiceParsed = VoiceProfileSchema.safeParse(coach?.voice_model);
  if (!voiceParsed.success) {
    return NextResponse.json(
      { error: "Build your voice model first, then you can refine it." },
      { status: 409 },
    );
  }

  try {
    const rules = await refineVoiceRules({
      coachId: user.id,
      voiceModel: voiceParsed.data,
      draftBody: parsed.data.draft_body,
      critique: parsed.data.critique,
    });
    return NextResponse.json({ rules });
  } catch (err) {
    console.error("[voice/refine] refineVoiceRules failed:", err);
    return NextResponse.json(
      { error: "Something went wrong reading that draft. Try again." },
      { status: 500 },
    );
  }
}
