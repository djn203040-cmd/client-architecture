import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient } from "../utils/supabase-test-client";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const isRealSupabase =
  url.startsWith("https://") &&
  url.includes(".supabase.co") &&
  !serviceKey.startsWith("test-");

describe.skipIf(!isRealSupabase)("approve-atomic (Phase 4 / DRAFT-011)", () => {
  const client = createTestClient();
  let coachId: string;
  let leadId: string;

  beforeAll(async () => {
    const email = `test-approve-${Date.now()}@example.com`;
    const { data: authData, error: authError } =
      await client.auth.admin.createUser({ email, email_confirm: true });
    if (authError) throw new Error(`createUser: ${authError.message}`);
    coachId = authData.user.id;

    const { error: coachErr } = await client
      .from("coaches")
      .insert({ id: coachId, name: "Test Coach", email });
    if (coachErr) throw new Error(`coaches insert: ${coachErr.message}`);

    const { data: lead, error: leadErr } = await client
      .from("leads")
      .insert({
        coach_id: coachId,
        name: "Test Lead",
        email: `lead-${Date.now()}@example.com`,
        source: "manual",
        status: "call_completed",
      })
      .select("id")
      .single();
    if (leadErr) throw new Error(`leads insert: ${leadErr.message}`);
    leadId = lead.id;
  });

  afterAll(async () => {
    if (coachId) await client.auth.admin.deleteUser(coachId);
  });

  async function pendingDraft() {
    const { data, error } = await client
      .from("drafts")
      .insert({
        coach_id: coachId,
        lead_id: leadId,
        status: "pending",
        body: "test body",
        subject: "test subject",
      })
      .select("id")
      .single();
    if (error) throw new Error(`drafts insert: ${error.message}`);
    return data.id;
  }

  it("calls the approve_draft_atomic RPC on the happy path", async () => {
    const draftId = await pendingDraft();

    const { data, error } = await client
      .rpc("approve_draft_atomic", { p_draft_id: draftId, p_actor: "dashboard" });

    expect(error).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    expect(row).toBeTruthy();
    expect(row.ok).toBe(true);
    expect(row.reason).toContain("approved_by:");
    expect(row.new_status).toBe("approved");
  });

  it("concurrent attempts result in exactly one success and one failure", async () => {
    const draftId = await pendingDraft();

    const [r1, r2] = await Promise.all([
      client
        .rpc("approve_draft_atomic", { p_draft_id: draftId, p_actor: "dashboard" }),
      client
        .rpc("approve_draft_atomic", { p_draft_id: draftId, p_actor: "dashboard" }),
    ]);

    const rows = [r1.data, r2.data].map((d) => (Array.isArray(d) ? d[0] : d));
    const successes = rows.filter((r) => r?.ok === true);
    const failures = rows.filter((r) => r?.ok === false);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(
      failures[0]?.reason === "concurrent_attempt" ||
        failures[0]?.reason?.startsWith("not_pending:"),
    ).toBe(true);
  });

  it("returns not_pending when the draft is already approved/sent/held", async () => {
    const draftId = await pendingDraft();

    await client
      .rpc("approve_draft_atomic", { p_draft_id: draftId, p_actor: "dashboard" });

    const { data } = await client
      .rpc("approve_draft_atomic", { p_draft_id: draftId, p_actor: "dashboard" });

    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.ok).toBe(false);
    expect(row?.reason).toMatch(/not_pending:/);
  });
});
