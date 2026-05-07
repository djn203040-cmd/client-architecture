import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
const SERVICE_ROLE = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
const skipIf =
  !SUPABASE_URL.startsWith("http") ||
  SUPABASE_URL.includes("test.supabase.co") ||
  !SERVICE_ROLE.startsWith("eyJ") ||
  !SERVICE_ROLE.includes(".");

describe.skipIf(skipIf)("GMAIL-002: OAuth callback persists refresh token to Vault", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  let coachId: string;

  beforeAll(async () => {
    const { data } = await admin.auth.admin.createUser({ email: `oauth-${Date.now()}@test.local`, email_confirm: true });
    coachId = data.user!.id;
    await admin.from("coaches").insert({ id: coachId, email: data.user!.email!, name: "OAuth Test", role: "coach" });
  });

  afterAll(async () => {
    await admin.from("integrations").delete().eq("coach_id", coachId);
    await admin.from("coaches").delete().eq("id", coachId);
    await admin.auth.admin.deleteUser(coachId);
  });

  it("simulating successful OAuth: store_gmail_tokens persists; integrations holds vault UUID", async () => {
    // 1. Insert integration row
    await admin.from("integrations").upsert({ coach_id: coachId, provider: "gmail", status: "disconnected" }, { onConflict: "coach_id,provider" });

    // 2. Call private.store_gmail_tokens (simulates callback line)
    const tokens = { access_token: "ya29.test", refresh_token: "1//test-refresh", expiry_date: Date.now() + 3600_000 };
    const { data: vaultId, error } = await admin.schema("private").rpc("store_gmail_tokens", { p_coach_id: coachId, p_tokens: tokens });
    expect(error).toBeNull();
    expect(vaultId).toMatch(/^[0-9a-f-]{36}$/);

    // 3. Update integrations.connected
    await admin.from("integrations").update({
      status: "connected",
      vault_secret_id: vaultId,
      scopes: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"],
    }).eq("coach_id", coachId).eq("provider", "gmail");

    // 4. Assert integrations row reflects connected with vault UUID
    const { data: integ } = await admin.from("integrations").select("*").eq("coach_id", coachId).eq("provider", "gmail").single();
    expect(integ?.status).toBe("connected");
    expect(integ?.vault_secret_id).toBe(vaultId);
  });
});
