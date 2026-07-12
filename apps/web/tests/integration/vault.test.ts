import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Skip if URL is a stub/placeholder or service role key is not a real JWT
const isRealUrl = !!SUPABASE_URL && SUPABASE_URL.startsWith("http") && !SUPABASE_URL.includes("test.supabase.co");
const isRealKey = !!SERVICE_ROLE && SERVICE_ROLE.startsWith("eyJ") && SERVICE_ROLE.includes(".");
const skipIf = !isRealUrl || !isRealKey;

describe.skipIf(skipIf)("INFRA-003: Vault SECURITY DEFINER functions are private + service-role only", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const anon = createClient(SUPABASE_URL, ANON);

  let coachId: string;
  beforeAll(async () => {
    const { data } = await admin.auth.admin.createUser({ email: `vault-${Date.now()}@test.local`, email_confirm: true });
    coachId = data.user!.id;
    await admin.from("coaches").insert({ id: coachId, name: "Vault Test", email: data.user!.email!, role: "coach" });
    await admin.from("integrations").insert({ coach_id: coachId, provider: "gmail" });
  });

  afterAll(async () => {
    await admin.from("integrations").delete().eq("coach_id", coachId);
    await admin.from("coaches").delete().eq("id", coachId);
    await admin.auth.admin.deleteUser(coachId);
  });

  it("service role can store + retrieve via private RPC", async () => {
    const tokens = { access_token: "test-at", refresh_token: "test-rt", expiry_date: Date.now() + 3600_000 };
    // private schema RPC not in generated types, using untyped client (INFRA-003)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vaultId, error: storeErr } = await (admin.schema("private") as any).rpc("store_gmail_tokens", { p_coach_id: coachId, p_tokens: tokens });
    expect(storeErr).toBeNull();
    expect(vaultId).toBeTruthy();

    // The RPC returns the Vault UUID; the caller writes it to integrations
    // (see app/api/auth/gmail/callback/route.ts). Mirror that so the GMAIL-003
    // assertion below reflects the real stored state.
    await admin.from("integrations").update({ vault_secret_id: vaultId }).eq("coach_id", coachId).eq("provider", "gmail");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: retrieved, error: getErr } = await (admin.schema("private") as any).rpc("get_gmail_tokens", { p_coach_id: coachId });
    expect(getErr).toBeNull();
    expect(retrieved).toMatchObject({ access_token: "test-at", refresh_token: "test-rt" });
  });

  it("anon role cannot call private RPC (REVOKE ALL FROM PUBLIC)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (anon.schema("private") as any).rpc("get_gmail_tokens", { p_coach_id: coachId });
    expect(error).toBeTruthy();
    expect(error?.message.toLowerCase()).toMatch(/permission|not exist|denied/);
  });

  it("integrations table never stores raw token strings (GMAIL-003)", async () => {
    const { data } = await admin.from("integrations").select("*").eq("coach_id", coachId).single();
    // The table has vault_secret_id (UUID), not raw tokens
    expect(data?.vault_secret_id).toBeTruthy();
    expect(JSON.stringify(data)).not.toMatch(/test-at|test-rt/);
  });
});
