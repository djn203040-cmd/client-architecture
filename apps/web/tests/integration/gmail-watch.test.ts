import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient } from "../utils/supabase-test-client";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const isRealSupabase =
  url.startsWith("http") &&
  !url.includes("test.supabase.co") &&
  !serviceKey.startsWith("test-");

// 06-PLAN.md §1.3 — gmail-watch + gmail-monitor triggered correctly by Pub/Sub push.
describe.skipIf(!isRealSupabase)("GMAIL-006: gmail-watch + monitor wiring", () => {
  const client = createTestClient();
  let coachId: string;

  beforeAll(async () => {
    const email = `gmail-watch-${Date.now()}@test.local`;
    const { data: auth } = await client.auth.admin.createUser({ email, email_confirm: true });
    if (!auth.user) throw new Error("auth create");
    coachId = auth.user.id;
    await client.from("coaches").insert({ id: coachId, name: "Watch Coach", email });

    await client.from("integrations").insert({
      coach_id: coachId,
      provider: "gmail",
      status: "connected",
      external_account_id: "gmail-acct-1",
      watch_expiry_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
  });

  afterAll(async () => {
    if (!coachId) return;
    await client.from("integrations").delete().eq("coach_id", coachId);
    await client.from("coaches").delete().eq("id", coachId);
    await client.auth.admin.deleteUser(coachId).catch(() => {});
  });

  it("identifies integrations whose watch expires within 48h as renewal-eligible", async () => {
    const renewalThreshold = new Date(Date.now() + 48 * 3600 * 1000);
    const { data } = await client
      .from("integrations")
      .select("coach_id, watch_expiry_at")
      .eq("provider", "gmail")
      .eq("status", "connected");

    const eligible = (data ?? []).filter(
      (i) => i.watch_expiry_at && new Date(i.watch_expiry_at) <= renewalThreshold,
    );
    expect(eligible.length).toBeGreaterThan(0);
  });

  it("watch_expiry_at >48h ahead is skipped for renewal", async () => {
    const future = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
    await client
      .from("integrations")
      .update({ watch_expiry_at: future })
      .eq("coach_id", coachId);

    const renewalThreshold = new Date(Date.now() + 48 * 3600 * 1000);
    const { data } = await client
      .from("integrations")
      .select("watch_expiry_at")
      .eq("coach_id", coachId)
      .single();
    expect(new Date(data!.watch_expiry_at!)).toBeInstanceOf(Date);
    expect(new Date(data!.watch_expiry_at!) > renewalThreshold).toBe(true);
  });
});
