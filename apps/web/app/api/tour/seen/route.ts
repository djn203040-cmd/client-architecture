import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Marks the product tour as "already offered" for the signed-in coach, so the
 * welcome popup auto-launches exactly once, on the first dashboard visit after
 * onboarding, on any browser or device.
 *
 * Idempotent: the first stamp wins, later calls are no-ops. `tour_seen_at` is
 * server-owned (deliberately absent from the coaches column GRANT), which is
 * why this route writes it with the admin client after its own auth check.
 * No request body, so nothing to validate.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await adminClient
    .from("coaches")
    .update({ tour_seen_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("tour_seen_at", null);

  if (error) {
    return NextResponse.json({ error: "Failed to record tour state" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
