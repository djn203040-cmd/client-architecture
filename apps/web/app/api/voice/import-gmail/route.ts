import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSentCorpus } from "@/lib/gmail/sent-corpus";
import { OAuthInvalidGrantError } from "@/lib/gmail/error-handler";
import { voiceImportGmailLimiter, enforce } from "@/lib/security/ratelimit";

// The voice gate needs 8 selected examples; with fewer real emails than that
// the analyzer can't get there, so we send the coach to the paste path instead.
const MIN_MESSAGES = 8;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gmail-API-only (no Anthropic call), but still a few hundred fetches per run.
  const rl = await enforce(voiceImportGmailLimiter, `coach:${user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded, try again in an hour." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const { data: integ } = await supabase
    .from("integrations")
    .select("status")
    .eq("coach_id", user.id)
    .eq("provider", "gmail")
    .maybeSingle();
  if (integ?.status !== "connected") {
    return NextResponse.json(
      { error: "Gmail not connected", code: "gmail_not_connected" },
      { status: 409 },
    );
  }

  try {
    const { text, messageCount } = await buildSentCorpus(user.id);
    if (messageCount < MIN_MESSAGES) {
      return NextResponse.json(
        { error: "Not enough sent emails", code: "too_few", messageCount },
        { status: 422 },
      );
    }
    return NextResponse.json({ text, messageCount });
  } catch (err) {
    if (err instanceof OAuthInvalidGrantError) {
      return NextResponse.json(
        { error: "Gmail not connected", code: "gmail_not_connected" },
        { status: 409 },
      );
    }
    // eslint-disable-next-line no-console -- reason: server-side error log; sent-corpus import failure in a route handler
    console.error("[voice/import-gmail] buildSentCorpus failed:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
