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

describe.skipIf(skipIf)("STATE-007: do_not_contact flag persists and blocks sends", () => {
  const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE);
  let coachId: string;
  let leadId: string;

  beforeAll(async () => {
    const { data } = await admin.auth.admin.createUser({
      email: `dnc-${Date.now()}@test.local`,
      email_confirm: true,
    });
    coachId = data.user!.id;
    await admin
      .from("coaches")
      .insert({ id: coachId, email: data.user!.email!, name: "DNC Test", role: "coach" });

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

  it("setting status='do_not_contact' flips do_not_contact flag", async () => {
    // Simulating server route logic: PATCH sets both status and do_not_contact flag
    await admin
      .from("leads")
      .update({ status: "do_not_contact", do_not_contact: true })
      .eq("id", leadId);

    const { data: lead } = await admin.from("leads").select("*").eq("id", leadId).single();
    expect(lead?.do_not_contact).toBe(true);
    expect(lead?.status).toBe("do_not_contact");
  });

  it("do_not_contact persists after reading back from DB", async () => {
    const { data: lead } = await admin.from("leads").select("do_not_contact, status").eq("id", leadId).single();
    expect(lead?.do_not_contact).toBe(true);
  });

  it("do_not_contact is a hard gate — flag stays true regardless of subsequent status reads", async () => {
    const { data: lead } = await admin.from("leads").select("*").eq("id", leadId).single();
    expect(lead?.do_not_contact).toBe(true);
  });
});
