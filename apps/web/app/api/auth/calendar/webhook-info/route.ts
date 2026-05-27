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

  // Auto-mode providers (calendly, cal_com, acuity) verify with env-level secrets
  // and register their webhook automatically on connect. No per-coach secret needed.
  if (config.webhook.mode === "auto") {
    return NextResponse.json({
      ok: true,
      provider: config.id,
      webhookMode: "auto" as const,
      webhookUrl,
      secret: null,
      instructions: null,
    });
  }

  // Manual-mode providers: generate or retrieve the per-coach webhook secret in Vault.
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
        // Non-destructive: update if the row exists (don't clobber `status`), insert if not.
        const { data: existingRow } = await adminClient
          .from("integrations")
          .select("coach_id")
          .eq("coach_id", user.id)
          .eq("provider", config.id)
          .maybeSingle();
        if (existingRow) {
          await adminClient
            .from("integrations")
            .update({ webhook_secret_vault_id: vaultId as string })
            .eq("coach_id", user.id)
            .eq("provider", config.id);
        } else {
          await adminClient.from("integrations").insert({
            coach_id: user.id,
            provider: config.id,
            webhook_secret_vault_id: vaultId as string,
            status: "disconnected",
          });
        }
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
