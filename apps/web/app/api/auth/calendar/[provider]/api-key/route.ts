import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getCalendarProvider } from "@/lib/calendar/providers";
import { CalendarApiKeyPayloadSchema } from "@client/shared/validators";

export const dynamic = "force-dynamic";

// POST /api/auth/calendar/[provider]/api-key
// Body: { apiKey: string, dryRun?: boolean }
//   dryRun=true → validate against the provider's /me endpoint and return; no DB writes.
//   dryRun=false (default) → validate, then store in Vault, mark integration connected,
//   set coaches.active_calendar_provider, return webhook info if applicable.
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params;
  const config = getCalendarProvider(providerId);
  if (!config) {
    return NextResponse.json({ ok: false, error: "unknown_provider" }, { status: 400 });
  }
  if (config.authType !== "api_key" || !config.apiKey) {
    return NextResponse.json({ ok: false, error: "wrong_auth_type" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = CalendarApiKeyPayloadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  // 1. Validate the key against the provider's probe endpoint.
  const validation = await probeApiKey(config.apiKey.validationEndpoint, payload.apiKey, config.apiKey.validationAuth);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_api_key", detail: validation.detail },
      { status: 400 },
    );
  }

  // Dry-run: no DB writes.
  if (payload.dryRun) {
    return NextResponse.json({ ok: true, dryRun: true });
  }

  // 2. Upsert integrations row (intermediate)
  await adminClient.from("integrations").upsert(
    {
      coach_id: user.id,
      provider: config.id,
      status: "disconnected",
    },
    { onConflict: "coach_id,provider" },
  );

  // 3. Vault store
  let vaultId: string;
  try {
    const { data, error } = await adminClient.schema("private").rpc("store_calendar_tokens", {
      p_coach_id: user.id,
      p_provider: config.id,
      p_tokens: { api_key: payload.apiKey },
    });
    if (error || !data) throw new Error(error?.message ?? "vault store returned null");
    vaultId = data as string;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[calendar-api-key] vault store failed:", err);
    return NextResponse.json({ ok: false, error: "vault_failed" }, { status: 500 });
  }

  // 4. Mark connected + active
  await adminClient
    .from("integrations")
    .update({
      vault_secret_id: vaultId,
      status: "connected",
      error_message: null,
      last_checked_at: new Date().toISOString(),
    })
    .eq("coach_id", user.id)
    .eq("provider", config.id);

  await adminClient.from("coaches").update({ active_calendar_provider: config.id }).eq("id", user.id);

  return NextResponse.json({
    ok: true,
    webhookMode: config.webhook.mode,
  });
}

async function probeApiKey(
  endpoint: string,
  apiKey: string,
  mode: "bearer" | "api-key-header" | "basic-base64",
): Promise<{ ok: boolean; detail?: string }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (mode === "bearer") headers.authorization = `Bearer ${apiKey}`;
  else if (mode === "api-key-header") headers["x-api-key"] = apiKey;
  else if (mode === "basic-base64") {
    headers.authorization = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;
  }

  try {
    const res = await fetch(endpoint, { method: "GET", headers, signal: AbortSignal.timeout(10_000) });
    if (res.ok) return { ok: true };
    return { ok: false, detail: `http_${res.status}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "unknown" };
  }
}
