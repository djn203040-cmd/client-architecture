import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SalesToolkitPatchSchema } from "@client/shared/validators";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SalesToolkitPatchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("coaches")
    .update({ sales_toolkit: parsed.data })
    .eq("id", user.id)
    .select("sales_toolkit")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sales_toolkit: data.sales_toolkit });
}
