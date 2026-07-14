import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { feedbackLimiter } from "@/lib/security/ratelimit";
import { getResendClient } from "@/lib/resend/client";
import { CreateFeedbackSchema } from "@client/shared/validators";

export const dynamic = "force-dynamic";

const FROM_ADDRESS =
  process.env.RESEND_FROM ?? "Sonorous Drafts <drafts@sonorousdigital.com>";
const OPERATOR_EMAIL = "djn203040@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (feedbackLimiter) {
    const { success } = await feedbackLimiter.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: entry, error } = await supabase
    .from("feedback")
    .insert({ ...parsed.data, coach_id: user.id })
    .select("id")
    .single();

  if (error || !entry) {
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 },
    );
  }

  // Alert Daniel per submission during the taste phase. Best-effort: the
  // feedback row is already saved, a mail hiccup (or missing RESEND_API_KEY
  // in local dev) must not fail the request.
  try {
    const { data: coach } = await supabase
      .from("coaches")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle();

    const { title, sentiment, note, page_path } = parsed.data;
    const who = coach?.name ?? coach?.email ?? user.id;
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: OPERATOR_EMAIL,
      subject: `[Feedback · ${sentiment === "good" ? "👍 good" : "👎 bad"}] ${title} — ${who}`,
      html: [
        `<p><strong>${escapeHtml(who)}</strong> (${escapeHtml(coach?.email ?? "no email")}) sent ${sentiment === "good" ? "positive" : "negative"} feedback${page_path ? ` from <code>${escapeHtml(page_path)}</code>` : ""}.</p>`,
        `<p><strong>${escapeHtml(title)}</strong></p>`,
        note
          ? `<pre style="white-space:pre-wrap;font-family:inherit;background:#f5f5f4;padding:12px;border-radius:8px;">${escapeHtml(note)}</pre>`
          : "<p><em>No note.</em></p>",
      ].join(""),
      text: `${who} (${coach?.email ?? "no email"}) — ${sentiment}${page_path ? ` — ${page_path}` : ""}\n\n${title}\n\n${note || "No note."}`,
    });
  } catch {
    // swallow — notification is best-effort
  }

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
