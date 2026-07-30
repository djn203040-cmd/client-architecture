import "server-only";
import { randomBytes } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import { buildWebhookReceiverUrl } from "@/lib/calendar/providers";
import type { RegisterWebhookArgs, RegisteredWebhook } from "./index";

// Cal.com v2 webhooks API: POST /v2/webhooks with Bearer auth.
// https://cal.com/docs/api-reference/v2/webhooks/create-a-webhook
//
// Cal.com expects a `secret` field that it uses as the HMAC signing key for
// X-Cal-Signature-256. We register a per-coach random secret and store it in
// Vault; the receiver verifies with the coach's stored secret, so a valid
// signature also binds the payload to the coachId in the URL (env secret is
// only a fallback for pre-existing registrations).
//
// Vault store happens BEFORE the subscription is created: a registered webhook
// whose key we failed to persist would fail verification forever.
export async function registerCalComWebhook(args: RegisterWebhookArgs): Promise<RegisteredWebhook | null> {
  const { coachId, provider } = args;
  const apiKey = await getCalComApiKey(coachId);
  if (!apiKey) return null;

  const localSecret = randomBytes(32).toString("hex");
  const { error: vaultErr } = await adminClient
    .schema("private")
    .rpc("store_calendar_webhook_secret", {
      p_coach_id: coachId,
      p_provider: provider.id,
      p_secret: localSecret,
    });
  if (vaultErr) {
    throw new Error(`cal_com_webhook_secret_store_failed:${vaultErr.message}`);
  }

  const webhookUrl = buildWebhookReceiverUrl(provider.id, coachId);

  const res = await fetch(`https://api.cal.com/v2/webhooks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      subscriberUrl: webhookUrl,
      triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED", "BOOKING_NO_SHOW_UPDATED"],
      active: true,
      secret: localSecret,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`cal_com_webhook_create_failed:${res.status}:${errText.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: { id?: string } };
  // Cal.com's create response shape has shifted across API versions; don't rely
  // on it. Fall back to listing webhooks and matching our subscriberUrl so the
  // subscription id is always captured (needed for clean disconnect).
  let subscriptionId = json.data?.id ?? null;
  if (!subscriptionId) {
    subscriptionId = await findCalComWebhookId(apiKey, webhookUrl);
  }

  await adminClient
    .from("integrations")
    .update({
      metadata: { webhook_subscription_id: subscriptionId },
    })
    .eq("coach_id", coachId)
    .eq("provider", provider.id);

  return { subscriptionId, webhookUrl };
}

// Best-effort delete of the coach's Cal.com webhook on disconnect. Without this,
// the env-level signing secret means a "disconnected" coach's webhook would keep
// passing signature verification and inserting calendar_events. Called BEFORE the
// vault tokens are wiped (needs the API key). Never throws.
export async function unregisterCalComWebhook(coachId: string): Promise<void> {
  try {
    const apiKey = await getCalComApiKey(coachId);
    if (!apiKey) return;

    // Prefer the stored subscription id; fall back to matching by subscriberUrl.
    const { data: integ } = await adminClient
      .from("integrations")
      .select("metadata")
      .eq("coach_id", coachId)
      .eq("provider", "cal_com")
      .maybeSingle();
    let subscriptionId =
      (integ?.metadata as { webhook_subscription_id?: string } | null)?.webhook_subscription_id ?? null;
    if (!subscriptionId) {
      const webhookUrl = buildWebhookReceiverUrl("cal_com", coachId);
      subscriptionId = await findCalComWebhookId(apiKey, webhookUrl);
    }
    if (!subscriptionId) return;

    await fetch(`https://api.cal.com/v2/webhooks/${subscriptionId}`, {
      method: "DELETE",
      headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
    });
  } catch (err) {
    // eslint-disable-next-line no-console -- reason: server-side error log; best-effort webhook unregister failure
    console.error("[cal-com] unregister webhook best-effort failed:", err);
  }
}

// Lists the coach's Cal.com webhooks and returns the id whose subscriberUrl
// matches ours. Returns null on any error or no match.
async function findCalComWebhookId(apiKey: string, webhookUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.cal.com/v2/webhooks`, {
      method: "GET",
      headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ id?: string; subscriberUrl?: string }> };
    const match = (json.data ?? []).find((w) => w.subscriberUrl === webhookUrl);
    return match?.id ?? null;
  } catch {
    return null;
  }
}

async function getCalComApiKey(coachId: string): Promise<string | null> {
  const { data } = await adminClient.schema("private").rpc("get_calendar_tokens", {
    p_coach_id: coachId,
    p_provider: "cal_com",
  });
  return (data as { api_key?: string } | null)?.api_key ?? null;
}
