import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzeVoiceCorpus } from "@client/ai-engine";
import { voiceAnalyzeLimiter, enforce } from "@/lib/security/ratelimit";

// Per-channel corpus cap (~120 KB). Enough for a rich few-hundred-message
// export, bounded so a single request can't ship megabytes into a paid
// Anthropic call.
const MAX_CORPUS_CHARS = 120_000;
const corpusField = z.string().max(MAX_CORPUS_CHARS).optional();

const VoiceAnalyzeSchema = z.object({
  corpus: z.object({
    gmail: corpusField,
    linkedin: corpusField,
    instagram: corpusField,
    whatsapp: corpusField,
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cost-guard rate limit: corpus analysis is a paid Anthropic call.
  const rl = await enforce(voiceAnalyzeLimiter, `coach:${user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded, try again in an hour." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

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
  } catch (err) {
    // eslint-disable-next-line no-console -- reason: server-side error log; voice analysis failure in a route handler
    console.error("[voice/analyze] analyzeVoiceCorpus failed:", err);
    return NextResponse.json(
      { error: "Something went wrong analyzing your writing. Try again or add more content." },
      { status: 500 }
    );
  }
}
