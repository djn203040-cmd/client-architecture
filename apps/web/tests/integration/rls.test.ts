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
});
