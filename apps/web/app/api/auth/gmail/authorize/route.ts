import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl } from "@/lib/gmail/auth";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!));

  const url = buildAuthorizeUrl(user.id);
  return NextResponse.redirect(url);
}
