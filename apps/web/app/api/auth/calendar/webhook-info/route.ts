import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getCalendarProvider, buildWebhookReceiverUrl } from "@/lib/calendar/providers";

export const dynamic = "force-dynamic";

// GET /api/auth/calendar/webhook-info?provider=setmore
// Returns the webhook URL + per-coach signing secret + manual-setup instructions
// for the given provider. Generates and persists the secret in Vault on first call.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const providerId = new URL(request.url).searchParams.get("provider");
  const config = providerId ? getCalendarProvider(providerId) : null;
  if (!config) {
    return NextResponse.json({ ok: false, error: "unknown_provider" }, { status: 400 });
  }

  const webhookUrl = buildWebhookReceiverUrl(config.id, user.id);

  // Generate or retrieve the per-coach webhook secret in Vault
  let secret: string | null = null;
  try {
    const { data: existing } = await adminClient.schema("private").rpc("get_calendar_webhook_secret", {
      p_coach_id: user.id,
      p_provider: config.id,
    });
    if (typeof existing === "string" && existing.length > 0) {
      secret = existing;
    } else {
      const generated = randomBytes(32).toString("hex");
      const { data: vaultId, error } = await adminClient.schema("private").rpc("store_calendar_webhook_secret", {
        p_coach_id: user.id,
        p_provider: config.id,
        p_secret: generated,
      });
      if (error || !vaultId) {
        // eslint-disable-next-line no-console
        console.error("[webhook-info] vault store failed:", error);
      } else {
        await adminClient
          .from("integrations")
          .upsert(
            {
              coach_id: user.id,
              provider: config.id,
              webhook_secret_vault_id: vaultId as string,
              status: "disconnected",
            },
            { onConflict: "coach_id,provider" },
          );
        secret = generated;
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[webhook-info] secret retrieval failed:", err);
  }

  return NextResponse.json({
    ok: true,
    provider: config.id,
    webhookMode: config.webhook.mode,
    webhookUrl,
    secret,
    instructions: config.webhook.instructions ?? null,
  });
}
