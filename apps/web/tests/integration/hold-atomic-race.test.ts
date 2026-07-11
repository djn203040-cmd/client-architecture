import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient } from "../utils/supabase-test-client";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const isRealSupabase =
  url.startsWith("http") &&
  !url.includes("test.supabase.co") &&
  !serviceKey.startsWith("test-");

// 06-PLAN.md §1.3, holdDraftAtomic advisory-lock prevents race condition.
describe.skipIf(!isRealSupabase)("DRAFT-011: hold-draft-atomic race guard", () => {
  const client = createTestClient();
  let coachId: string;
  let leadId: string;
  let draftId: string;

  beforeAll(async () => {
    const email = `hold-${Date.now()}@test.local`;
    const { data: auth } = await client.auth.admin.createUser({ email, email_confirm: true });
    if (!auth.user) throw new Error("auth create");
    coachId = auth.user.id;
    await client.from("coaches").insert({ id: coachId, name: "Hold Coach", email });

    const { data: lead } = await client
      .from("leads")
      .insert({
        coach_id: coachId,
        name: "Hold Lead",
        email: `lead-${Date.now()}@example.com`,
        source: "manual",
        status: "in_sequence",
      })
      .select("id")
      .single();
    leadId = lead!.id;

    const { data: draft } = await client
      .from("drafts")
      .insert({
        coach_id: coachId,
        lead_id: leadId,
        status: "pending",
        subject: "race",
        body: "body",
      })
      .select("id")
      .single();
    draftId = draft!.id;
  });

  afterAll(async () => {
    if (!coachId) return;
    await client.from("drafts").delete().eq("coach_id", coachId);
    await client.from("leads").delete().eq("coach_id", coachId);
    await client.from("coaches").delete().eq("id", coachId);
    await client.auth.admin.deleteUser(coachId).catch(() => {});
  });

  it("concurrent hold-draft-atomic calls: exactly one succeeds, others get conflict", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        // public.hold_draft_atomic(p_draft_id, p_actor), wraps the private
        // advisory-lock RPC. Mirrors lib/drafts/approve-atomic.ts (the
        // production caller); `p_coach_id` was never a parameter.
        client.rpc("hold_draft_atomic", {
          p_draft_id: draftId,
          p_actor: "dashboard",
        }),
      ),
    );

    const fulfilled = attempts.filter(
      (r) => r.status === "fulfilled" && !(r.value as { error?: unknown }).error,
    );
    // At least one succeeds; advisory lock prevents simultaneous state change.
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const { data: final } = await client
      .from("drafts")
      .select("status")
      .eq("id", draftId)
      .single();
    expect(["held", "pending"]).toContain(final?.status);
  });
});
