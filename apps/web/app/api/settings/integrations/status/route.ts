import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Poll target for the onboarding Gmail step and the settings integrations
// panel. Returns a { provider: status } map for the current coach. RLS scopes
// the query to the coach's own rows.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("integrations")
    .select("provider, status")
    .eq("coach_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  const statuses: Record<string, string> = {};
  for (const row of data ?? []) {
    statuses[row.provider] = row.status;
  }

  return NextResponse.json(statuses);
}
