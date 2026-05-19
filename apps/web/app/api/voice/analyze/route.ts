import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzeVoiceCorpus } from "@client/ai-engine";

const VoiceAnalyzeSchema = z.object({
  corpus: z.object({
    gmail: z.string().optional(),
    linkedin: z.string().optional(),
    instagram: z.string().optional(),
    whatsapp: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = VoiceAnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { corpus } = parsed.data;
  const hasContent = Object.values(corpus).some((v) => v && v.trim().length > 0);
  if (!hasContent) {
    return NextResponse.json({ error: "At least one channel must have content" }, { status: 400 });
  }

  try {
    const profile = await analyzeVoiceCorpus({ coachId: user.id, corpus });
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong analyzing your writing. Try again or add more content." },
      { status: 500 }
    );
  }
}
