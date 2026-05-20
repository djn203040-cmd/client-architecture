import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { seedDemoLeadForCoach } from "@/lib/onboarding/demo-seed";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { leadId, draftId } = await seedDemoLeadForCoach(user.id, adminClient);
    const { data: draft } = await adminClient
      .from("drafts")
      .select("body")
      .eq("id", draftId)
      .single();
    return NextResponse.json({ leadId, draftId, draftBody: draft?.body ?? "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to seed demo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
