import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchLeadThread } from "@/lib/gmail/thread";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lead } = await supabase
    .from("leads")
    .select("id, coach_id")
    .eq("id", id)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lead.coach_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: emailEvent } = await supabase
    .from("email_events")
    .select("gmail_thread_id")
    .eq("lead_id", id)
    .not("gmail_thread_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!emailEvent?.gmail_thread_id) {
    return NextResponse.json({ messages: [] });
  }

  try {
    const messages = await fetchLeadThread(user.id, emailEvent.gmail_thread_id);
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't load emails. Check your Gmail connection in Settings.",
      },
      { status: 502 }
    );
  }
}
