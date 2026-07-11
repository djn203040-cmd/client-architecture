import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { seedDemoLeadForCoach } from "@/lib/onboarding/demo-seed";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Tour mode ("rich") seeds a fuller, always-fresh demo. Onboarding calls with
  // no body and gets the original lightweight seed.
  const body = await request.json().catch(() => ({}));
  const rich = (body as { rich?: boolean }).rich === true;

  try {
    const { leadId, draftId } = await seedDemoLeadForCoach(user.id, adminClient, { rich });
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
