import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Skip if URL is a stub/placeholder or service role key is not a real JWT
const isRealUrl = !!SUPABASE_URL && SUPABASE_URL.startsWith("http") && !SUPABASE_URL.includes("test.supabase.co");
const isRealKey = !!SERVICE_ROLE && SERVICE_ROLE.startsWith("eyJ") && SERVICE_ROLE.includes(".");
const skipIf = !isRealUrl || !isRealKey;

describe.skipIf(skipIf)("INFRA-001: RLS isolates coaches", () => {
  let coachA: { id: string; jwt: string };
  let coachB: { id: string; jwt: string };
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  beforeAll(async () => {
    // Create two coaches via admin
    const { data: a } = await admin.auth.admin.createUser({ email: `rls-a-${Date.now()}@test.local`, password: "test-password-1234", email_confirm: true });
    const { data: b } = await admin.auth.admin.createUser({ email: `rls-b-${Date.now()}@test.local`, password: "test-password-1234", email_confirm: true });
    if (!a.user || !b.user) throw new Error("test coach creation failed");

    await admin.from("coaches").insert([
      { id: a.user.id, name: "Coach A", email: a.user.email!, role: "coach" },
      { id: b.user.id, name: "Coach B", email: b.user.email!, role: "coach" },
    ]);

    // Sign in to obtain a JWT for each. On a cold CI auth server the user may
    // not be immediately signin-able right after admin.createUser, so retry a
    // few times and surface the real GoTrue error rather than null-derefing.
    const signIn = async (email: string): Promise<string> => {
      let lastErr = "no session";
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await createClient(SUPABASE_URL, ANON).auth.signInWithPassword({
          email,
          password: "test-password-1234",
        });
        if (data.session) return data.session.access_token;
        lastErr = error?.message ?? "no session returned";
        await new Promise((r) => setTimeout(r, 500));
      }
      throw new Error(`sign-in failed for ${email}: ${lastErr}`);
    };

    coachA = { id: a.user.id, jwt: await signIn(a.user.email!) };
    coachB = { id: b.user.id, jwt: await signIn(b.user.email!) };

    // Insert one lead per coach via admin (bypassing RLS)
    await admin.from("leads").insert([
      { coach_id: coachA.id, name: "A's lead", email: "a-lead@test.local", source: "manual" },
      { coach_id: coachB.id, name: "B's lead", email: "b-lead@test.local", source: "manual" },
    ]);
  });

  afterAll(async () => {
    if (!coachA || !coachB) return; // setup failed; nothing to clean up
    await admin.from("leads").delete().in("coach_id", [coachA.id, coachB.id]);
    await admin.from("coaches").delete().in("id", [coachA.id, coachB.id]);
    await admin.auth.admin.deleteUser(coachA.id);
    await admin.auth.admin.deleteUser(coachB.id);
  });

  it("Coach A cannot SELECT Coach B's leads", async () => {
    const aClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${coachA.jwt}` } } });
    const { data } = await aClient.from("leads").select("*").eq("coach_id", coachB.id);
    expect(data).toEqual([]);
  });

  it("Coach A SELECT * returns only Coach A's leads", async () => {
    const aClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${coachA.jwt}` } } });
    const { data } = await aClient.from("leads").select("*");
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every(l => l.coach_id === coachA.id)).toBe(true);
  });

  it("Coach A INSERT with foreign coach_id is rejected (WITH CHECK)", async () => {
    const aClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${coachA.jwt}` } } });
    const { error } = await aClient.from("leads").insert({ coach_id: coachB.id, name: "x", email: "x@test.local", source: "manual" });
    expect(error).toBeTruthy();
  });

  it("VOICE-006: draft_edits table is RLS-isolated", async () => {
    const aClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${coachA.jwt}` } } });
    const { data } = await aClient.from("draft_edits").select("*").eq("coach_id", coachB.id);
    expect(data).toEqual([]);
  });

  /**
   * #140. RLS keeps a coach inside their own row; the column-level GRANT keeps
   * them out of the columns the API routes own. Without the grant these writes
   * all succeed, which is the bug.
   */
  describe("coaches column-level UPDATE grant (#140)", () => {
    const asCoachA = () =>
      createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: `Bearer ${coachA.jwt}` } },
      });

    it("Coach A CAN update their own profile columns", async () => {
      const { error } = await asCoachA()
        .from("coaches")
        .update({ display_name: "Renamed", timezone: "Europe/Copenhagen" })
        .eq("id", coachA.id);
      expect(error).toBeNull();

      const { data } = await admin
        .from("coaches")
        .select("display_name, timezone")
        .eq("id", coachA.id)
        .single();
      expect(data?.display_name).toBe("Renamed");
      expect(data?.timezone).toBe("Europe/Copenhagen");
    });

    // Each of these bypasses a server-side gate if the browser can write it.
    it.each<[column: string, value: unknown, why: string]>([
      ["autonomous_mode", "mode_a", "skips the Mode-A confirm gate + audit log"],
      ["onboarding_completed_at", new Date(0).toISOString(), "skips the wizard step gates"],
      ["avatar_url", "https://evil.example/x.png", "arms the cross-tenant avatar delete"],
      ["voice_model", { junk: true }, "feeds unvalidated JSON into AI prompts"],
      ["sales_toolkit", { junk: true }, "feeds unvalidated JSON into AI prompts"],
      ["sequence_config", { junk: true }, "reschedules the send cadence"],
    ])("Coach A CANNOT update %s (%s)", async (column, value) => {
      const { data: before } = await admin
        .from("coaches")
        .select(column)
        .eq("id", coachA.id)
        .single();

      const { error } = await asCoachA()
        .from("coaches")
        .update({ [column]: value })
        .eq("id", coachA.id);
      expect(error, `${column} was writable from the browser`).toBeTruthy();

      const { data: after } = await admin
        .from("coaches")
        .select(column)
        .eq("id", coachA.id)
        .single();
      expect(after).toEqual(before);
    });

    it("Coach A cannot smuggle a server-owned column in alongside a granted one", async () => {
      const { error } = await asCoachA()
        .from("coaches")
        .update({ display_name: "Legit", autonomous_mode: "mode_a" })
        .eq("id", coachA.id);
      expect(error).toBeTruthy();

      const { data } = await admin
        .from("coaches")
        .select("autonomous_mode")
        .eq("id", coachA.id)
        .single();
      expect(data?.autonomous_mode).not.toBe("mode_a");
    });
  });
});
