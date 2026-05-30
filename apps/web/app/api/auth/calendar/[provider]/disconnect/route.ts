import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getCalendarProvider } from "@/lib/calendar/providers";
import { unregisterCalendarWebhook } from "@/lib/calendar/webhooks";
import { revokeAccessToken } from "@/lib/oauth/shared";

export const dynamic = "force-dynamic";

// POST /api/auth/calendar/[provider]/disconnect
// Best-effort: revokes OAuth token where supported, drops vault entries,
// clears integration row, and (if this was the active calendar) nulls
// coaches.active_calendar_provider.
export async function POST(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params;
  const config = getCalendarProvider(providerId);
  if (!config) {
    return NextResponse.json({ ok: false, error: "unknown_provider" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 1. Best-effort token revoke (OAuth providers only)
  if (config.authType === "oauth2" && config.oauth?.revokeUrl) {
    try {
      const { data: tokens } = await adminClient.schema("private").rpc("get_calendar_tokens", {
        p_coach_id: user.id,
        p_provider: config.id,
      });
      const accessToken = (tokens as { access_token?: string } | null)?.access_token;
      if (accessToken) {
        await revokeAccessToken({ provider: config, accessToken });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[calendar-disconnect] revoke best-effort failed:", err);
    }
  }

  // 1.5 Tear down any auto-registered webhook at the provider. Must run BEFORE
  // the vault tokens are deleted (needs the API key). Otherwise the env-level
  // signing secret means the webhook keeps passing signature verification and
  // inserting calendar_events even after "disconnect".
  await unregisterCalendarWebhook(config, user.id);

  // 2. Delete vault entries (tokens + webhook secret)
  try {
    await adminClient.schema("private").rpc("delete_calendar_tokens", {
      p_coach_id: user.id,
      p_provider: config.id,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[calendar-disconnect] vault delete failed:", err);
  }

  // 3. Update integrations row
  await adminClient
    .from("integrations")
    .update({
      status: "disconnected",
      vault_secret_id: null,
      webhook_secret_vault_id: null,
      error_message: null,
      last_checked_at: new Date().toISOString(),
      metadata: {},
    })
    .eq("coach_id", user.id)
    .eq("provider", config.id);

  // 4. If this was the active calendar, clear it
  const { data: coach } = await adminClient
    .from("coaches")
    .select("active_calendar_provider")
    .eq("id", user.id)
    .maybeSingle();
  if (coach?.active_calendar_provider === config.id) {
    await adminClient
      .from("coaches")
      .update({ active_calendar_provider: null })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
