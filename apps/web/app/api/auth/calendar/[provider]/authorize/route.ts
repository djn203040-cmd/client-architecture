import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarProvider } from "@/lib/calendar/providers";
import { buildAuthorizeUrl } from "@/lib/oauth/shared";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params;
  const config = getCalendarProvider(providerId);
  if (!config) {
    return NextResponse.redirect(new URL("/settings?error=calendar_unknown_provider", APP_URL));
  }
  if (config.authType !== "oauth2") {
    // API-key providers don't go through authorize/callback — they use the api-key route.
    return NextResponse.redirect(new URL("/settings?error=calendar_wrong_auth_type", APP_URL));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", APP_URL));
  }

  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? undefined;

  try {
    const url = buildAuthorizeUrl({ provider: config, coachId: user.id, returnTo });
    return NextResponse.redirect(url);
  } catch (err) {
    const reason =
      err instanceof Error && err.message.includes("OAuth client_id missing")
        ? "calendar_oauth_not_configured"
        : "calendar_oauth_start_failed";
    return NextResponse.redirect(new URL(`/settings?error=${reason}&provider=${config.id}`, APP_URL));
  }
}
