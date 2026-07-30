import "server-only";
import { randomBytes } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import { buildWebhookReceiverUrl } from "@/lib/calendar/providers";
import type { RegisterWebhookArgs, RegisteredWebhook } from "./index";

// Calendly Webhook Subscriptions API
// https://developer.calendly.com/api-docs/webhook-subscriptions
//
// Required: organization + user URI from /me. We generate a per-coach
// signing_key, register it with the subscription, and store it in Vault via
// private.store_calendar_webhook_secret; the receiver verifies with it.
export async function registerCalendlyWebhook(args: RegisterWebhookArgs): Promise<RegisteredWebhook | null> {
  const { coachId, provider, accessToken } = args;
  if (!accessToken) return null;

  // 1. Discover org + user URIs
  const meRes = await fetch("https://api.calendly.com/users/me", {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
  });
  if (!meRes.ok) {
    throw new Error(`calendly_me_failed:${meRes.status}`);
  }
  const me = (await meRes.json()) as {
    resource: { uri: string; current_organization: string };
  };
  const userUri = me.resource.uri;
  const orgUri = me.resource.current_organization;

  // 2. Per-coach signing key. Stored in Vault BEFORE the subscription is
  //    created: the receiver verifies with this stored secret (which binds the
  //    signature to the coachId), so a registered webhook whose key we failed
  //    to persist would fail verification forever.
  const localSecret = randomBytes(32).toString("hex");
  const { data: webhookVaultId, error: vaultErr } = await adminClient
    .schema("private")
    .rpc("store_calendar_webhook_secret", {
      p_coach_id: coachId,
      p_provider: provider.id,
      p_secret: localSecret,
    });
  if (vaultErr) {
    throw new Error(`calendly_webhook_secret_store_failed:${vaultErr.message}`);
  }

  // 3. Create the subscription
  const webhookUrl = buildWebhookReceiverUrl(provider.id, coachId);
  const createRes = await fetch("https://api.calendly.com/webhook_subscriptions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      url: webhookUrl,
      events: ["invitee.created", "invitee.canceled", "invitee_no_show.created"],
      organization: orgUri,
      user: userUri,
      scope: "user",
      signing_key: localSecret,
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => "");
    throw new Error(`calendly_webhook_create_failed:${createRes.status}:${errText.slice(0, 200)}`);
  }
  const created = (await createRes.json()) as { resource: { uri: string } };
  const subscriptionId = created.resource.uri;

  // 4. Persist vault pointer + subscription id in integrations.metadata
  await adminClient
    .from("integrations")
    .update({
      webhook_secret_vault_id: webhookVaultId,
      metadata: { webhook_subscription_id: subscriptionId },
    })
    .eq("coach_id", coachId)
    .eq("provider", provider.id);

  return { subscriptionId, webhookUrl };
}
