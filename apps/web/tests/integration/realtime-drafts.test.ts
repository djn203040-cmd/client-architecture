import { describe, it, expect, beforeAll, afterAll } from "vitest";

const SUPABASE_URL =
  process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Only run live tests when we have valid Supabase credentials with service role access.
// Default mock values set in tests/setup.ts contain "test" — skip when those are active.
const skipIf =
  !SUPABASE_URL.startsWith("http") ||
  !SERVICE_ROLE ||
  !ANON ||
  SUPABASE_URL.includes("test.supabase.co") ||
  SERVICE_ROLE.startsWith("test-") ||
  ANON.startsWith("test-");

describe.skipIf(skipIf)(
  "DRAFT-012: Realtime publication delivers drafts INSERT events filtered by coach_id",
  () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let admin: any;
    let coachId: string;
    let leadId: string;

    beforeAll(async () => {
      const { createClient } = await import("@supabase/supabase-js");
      admin = createClient(SUPABASE_URL, SERVICE_ROLE);

      const { data } = await admin.auth.admin.createUser({
        email: `rt-${Date.now()}@test.local`,
        email_confirm: true,
      });
      coachId = data.user!.id;
      await admin
        .from("coaches")
        .insert({ id: coachId, email: data.user!.email!, name: "RT Test", role: "coach" });
      const { data: lead } = await admin
        .from("leads")
        .insert({ coach_id: coachId, name: "L", email: "l@test.local", source: "manual" })
        .select()
        .single();
      leadId = lead!.id;
    });

    afterAll(async () => {
      if (!coachId || !admin) return;
      await admin.from("drafts").delete().eq("coach_id", coachId);
      await admin.from("leads").delete().eq("coach_id", coachId);
      await admin.from("coaches").delete().eq("id", coachId);
      await admin.auth.admin.deleteUser(coachId);
    });

    it(
      "subscribes via service role and receives INSERT event within 5s",
      async () => {
        const received: unknown[] = [];

        const channel = admin
          .channel("test-coach-drafts")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "drafts",
              filter: `coach_id=eq.${coachId}`,
            },
            (payload: { new: unknown }) => {
              received.push(payload.new);
            }
          )
          .subscribe();

        // Wait for subscription to establish
        await new Promise((r) => setTimeout(r, 1000));

        await admin.from("drafts").insert({
          coach_id: coachId,
          lead_id: leadId,
          subject: "Test",
          body: "Hello",
          touchpoint_index: 1,
          total_touchpoints: 3,
          status: "pending",
          scheduled_send_at: new Date(Date.now() + 60_000).toISOString(),
        });

        // Poll for event delivery (up to 5s)
        const start = Date.now();
        while (received.length === 0 && Date.now() - start < 5000) {
          await new Promise((r) => setTimeout(r, 100));
        }

        expect(received.length).toBeGreaterThanOrEqual(1);
        expect((received[0] as { coach_id: string }).coach_id).toBe(coachId);
        await admin.removeChannel(channel);
      },
      15_000
    );
  }
);

describe("DRAFT-012: Draft Realtime hook structural contract", () => {
  it("draft-realtime hook exists with correct postgres_changes pattern", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const hookPath = path.resolve(
      __dirname,
      "../../components/drafts/draft-realtime.tsx"
    );
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("postgres_changes");
    expect(content).toContain("coach_id=eq.");
    expect(content).toContain("removeChannel");
    expect(content).toContain("coach-drafts");
  });
});
