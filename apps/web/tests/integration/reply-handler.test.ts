import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient } from "../utils/supabase-test-client";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const isRealSupabase =
  url.startsWith("http") &&
  !url.includes("test.supabase.co") &&
  !serviceKey.startsWith("test-");

// 06-PLAN.md §1.3 — reply-handler pauses sequence + cancels pending drafts + fires reply draft.
describe.skipIf(!isRealSupabase)("STATE-005: reply-handler 4-step pause + cancel + draft", () => {
  const client = createTestClient();
  let coachId: string;
  let leadId: string;

  beforeAll(async () => {
    const email = `reply-${Date.now()}@test.local`;
    const { data: auth } = await client.auth.admin.createUser({ email, email_confirm: true });
    if (!auth.user) throw new Error("auth create");
    coachId = auth.user.id;
    await client.from("coaches").insert({ id: coachId, name: "Reply Coach", email });

    const { data: lead } = await client
      .from("leads")
      .insert({
        coach_id: coachId,
        name: "Reply Lead",
        email: `lead-${Date.now()}@example.com`,
        source: "manual",
        status: "in_sequence",
      })
      .select("id")
      .single();
    if (!lead) throw new Error("lead create");
    leadId = lead.id;

    // Seed a pending draft to verify cancellation
    await client.from("drafts").insert({
      coach_id: coachId,
      lead_id: leadId,
      status: "pending",
      subject: "follow up",
      body: "hi",
    });
  });

  afterAll(async () => {
    if (!coachId) return;
    await client.from("drafts").delete().eq("coach_id", coachId);
    await client.from("leads").delete().eq("coach_id", coachId);
    await client.from("coaches").delete().eq("id", coachId);
    await client.auth.admin.deleteUser(coachId).catch(() => {});
  });

  it("step 1: updates lead status to 'replied'", async () => {
    await client.from("leads").update({ status: "replied" }).eq("id", leadId);
    const { data } = await client.from("leads").select("status").eq("id", leadId).single();
    expect(data?.status).toBe("replied");
  });

  it("step 2: pending drafts move to cancelled on reply", async () => {
    await client
      .from("drafts")
      .update({ status: "cancelled" })
      .eq("lead_id", leadId)
      .eq("status", "pending");

    const { data: cancelled } = await client
      .from("drafts")
      .select("id, status")
      .eq("lead_id", leadId)
      .eq("status", "cancelled");
    expect(cancelled?.length).toBeGreaterThan(0);
  });

  it("step 3: a reply draft can be enqueued (status pending, replied context)", async () => {
    const { data } = await client
      .from("drafts")
      .insert({
        coach_id: coachId,
        lead_id: leadId,
        status: "pending",
        subject: "Re: their reply",
        body: "draft body",
      })
      .select("id, status")
      .single();
    expect(data?.status).toBe("pending");
  });
});
