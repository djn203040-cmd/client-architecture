import "server-only";
import { randomBytes } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import { buildWebhookReceiverUrl } from "@/lib/calendar/providers";
import type { RegisterWebhookArgs, RegisteredWebhook } from "./index";

// Acuity Scheduling Webhooks API
// https://developers.acquityscheduling.com/reference/post_api-v1-webhooks
//
// Acuity signs payloads with HMAC-SHA256 of (rawBody) using the *API user's key*
// as the secret, not a per-webhook secret. We rely on the env-level ACUITY_API_KEY
// at the receiver (apps/web/lib/calendar/index.ts verifyAcuitySignature).
// OAuth-installed apps: signature uses the OAuth client secret instead, left as
// a follow-up in #ACUITY-FOLLOWUP if Daniel reports signature failures during §2.5.
export async function registerAcuityWebhook(args: RegisterWebhookArgs): Promise<RegisteredWebhook | null> {
  const { coachId, provider, accessToken } = args;
  if (!accessToken) return null;

  // Acuity's signature key is app-level, so it can't bind the coach. The
  // per-coach Vault secret rides in the registered target URL as `?token=` and
  // the receiver requires it (verifyUrlTokenIfProvisioned). Stored BEFORE
  // registration so a registered webhook is never missing its token.
  const localSecret = randomBytes(32).toString("hex");
  const { error: vaultErr } = await adminClient
    .schema("private")
    .rpc("store_calendar_webhook_secret", {
      p_coach_id: coachId,
      p_provider: provider.id,
      p_secret: localSecret,
    });
  if (vaultErr) {
    throw new Error(`acuity_webhook_secret_store_failed:${vaultErr.message}`);
  }

  const webhookUrl = buildWebhookReceiverUrl(provider.id, coachId, localSecret);
  const subscriptions: Array<{ id?: string }> = [];

  for (const event of ["scheduled", "rescheduled", "canceled"]) {
    const res = await fetch("https://acuityscheduling.com/api/v1/webhooks", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams({ event, target: webhookUrl }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`acuity_webhook_create_failed:${event}:${res.status}:${errText.slice(0, 200)}`);
    }
    const json = (await res.json()) as { id?: string };
    subscriptions.push({ id: json.id });
  }

  await adminClient
    .from("integrations")
    .update({
      metadata: { webhook_subscription_ids: subscriptions.map((s) => s.id) },
    })
    .eq("coach_id", coachId)
    .eq("provider", provider.id);

  return { subscriptionId: subscriptions[0]?.id ?? null, webhookUrl };
}
