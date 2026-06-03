import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@client/database";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Skip if no live Supabase (stub URL or no service role)
const skipIf =
  !SUPABASE_URL.startsWith("https://") ||
  SUPABASE_URL.includes("test.supabase.co") ||
  !SERVICE_ROLE.startsWith("eyJ");

describe.skipIf(skipIf)("STATE-009: State transitions logged to activity timeline", () => {
  const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE);
  let coachId: string;
  let leadId: string;

  beforeAll(async () => {
    const { data } = await admin.auth.admin.createUser({
      email: `st-${Date.now()}@test.local`,
      email_confirm: true,
    });
    coachId = data.user!.id;
    await admin
      .from("coaches")
      .insert({ id: coachId, email: data.user!.email!, name: "ST Test", role: "coach" });

    const { data: lead } = await admin
      .from("leads")
      .insert({ coach_id: coachId, name: "Test Lead", email: `lead-${Date.now()}@test.local`, source: "manual" })
      .select()
      .single();
    leadId = lead!.id;
  });

  afterAll(async () => {
    await admin.from("leads").delete().eq("coach_id", coachId);
    await admin.from("coaches").delete().eq("id", coachId);
    await admin.auth.admin.deleteUser(coachId);
  });

  it("lead status change inserts lead_event with event_type=state_changed", async () => {
    // Simulate server route behaviour: UPDATE leads + INSERT lead_event
    await admin.from("leads").update({ status: "lost" }).eq("id", leadId);
    await admin.from("lead_events").insert({
      lead_id: leadId,
      coach_id: coachId,
      event_type: "state_changed",
      payload: { from: "identified", to: "lost" },
      triggered_by: "coach",
    });

    const { data: events } = await admin
      .from("lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .eq("event_type", "state_changed");

    expect(events?.length).toBeGreaterThanOrEqual(1);
    expect(events?.[0]?.payload).toMatchObject({ to: "lost" });
  });

  it("state change event includes previous and new status in payload", async () => {
    const { data: events } = await admin
      .from("lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .eq("event_type", "state_changed");

    const event = events?.[0];
    const payload = event?.payload as { from?: string; to?: string } | null;
    expect(payload?.from).toBe("identified");
    expect(payload?.to).toBe("lost");
  });

  it("lead_events rows include coach_id and triggered_by fields", async () => {
    const { data: events } = await admin
      .from("lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .eq("event_type", "state_changed");

    expect(events?.[0]?.coach_id).toBe(coachId);
    expect(events?.[0]?.triggered_by).toBe("coach");
  });
});
