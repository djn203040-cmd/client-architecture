import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient } from "../utils/supabase-test-client";
import { seedNotificationPreferences } from "@/lib/notifications/seed-preferences";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const isRealSupabase =
  url.startsWith("https://") &&
  url.includes(".supabase.co") &&
  !serviceKey.startsWith("test-");

describe.skipIf(!isRealSupabase)("notification-preferences-seed (Phase 4 / Pitfall-7)", () => {
  const client = createTestClient();
  let coachId: string;

  beforeAll(async () => {
    const email = `test-seed-${Date.now()}@example.com`;
    const { data: authData, error: authError } =
      await client.auth.admin.createUser({ email, email_confirm: true });
    if (authError) throw new Error(`createUser: ${authError.message}`);
    coachId = authData.user.id;

    const { error: coachErr } = await client
      .from("coaches")
      .insert({ id: coachId, name: "Seed Test Coach", email });
    if (coachErr) throw new Error(`coaches insert: ${coachErr.message}`);
  });

  afterAll(async () => {
    if (coachId) await client.auth.admin.deleteUser(coachId);
  });

  it("seeds channel-enabled row when a channel is first connected", async () => {
    const result = await seedNotificationPreferences(coachId, "email");
    expect(result.inserted).toBeGreaterThan(0);

    const { data } = await client
      .from("notification_preferences")
      .select("event_type, enabled")
      .eq("coach_id", coachId)
      .eq("channel", "email");

    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("idempotent: re-connecting the same channel does not duplicate rows", async () => {
    const first = await seedNotificationPreferences(coachId, "slack");
    expect(first.inserted).toBeGreaterThan(0);

    const second = await seedNotificationPreferences(coachId, "slack");
    expect(second.inserted).toBe(0);
  });

  it("preserves coach overrides on subsequent re-connects", async () => {
    await seedNotificationPreferences(coachId, "whatsapp");

    // Coach disables whatsapp for draft_ready
    await client
      .from("notification_preferences")
      .update({ enabled: false })
      .eq("coach_id", coachId)
      .eq("channel", "whatsapp")
      .eq("event_type", "draft_ready");

    // Re-seed same channel
    await seedNotificationPreferences(coachId, "whatsapp");

    const { data } = await client
      .from("notification_preferences")
      .select("enabled")
      .eq("coach_id", coachId)
      .eq("channel", "whatsapp")
      .eq("event_type", "draft_ready")
      .single();

    // ignoreDuplicates: true preserves existing row (override is intact)
    expect(data?.enabled).toBe(false);
  });
});
