import { test, expect } from "@playwright/test";
import { createTestClient, seedCoach } from "../utils/supabase-test-client";

// E2E target: NOTIFY-001 / Realtime dashboard notification appearance.
// Requires a live dev server + Supabase staging env vars.

test("dashboard notification appears via Realtime when a draft is ready", async ({ page }) => {
  // Live postgres_changes delivery is unreliable on ephemeral CI Realtime;
  // skip here (runs locally against a warm stack). The hook's subscription
  // contract is covered by tests/integration/realtime-drafts.test.ts.
  test.skip(process.env.CI === "true", "Realtime live-delivery is flaky in ephemeral CI");
  const client = createTestClient();

  const uniqueEmail = `playwright-notify-${Date.now()}@test.sonorous.dev`;
  const coach = await seedCoach(client, { email: uniqueEmail });

  // Seed a lead so we can create a draft
  const { data: lead, error: leadErr } = await client
    .from("leads")
    .insert({ coach_id: coach.id, name: "Playwright Lead", email: `lead-${Date.now()}@test.com`, source: "test" })
    .select("id")
    .single();
  if (leadErr || !lead) throw new Error(`seedLead: ${leadErr?.message ?? "no data"}`);

  // Navigate to dashboard (assumes dev server running and test auth bypass or cookie injection)
  await page.goto("/");

  // Seed a pending draft after the page loads (simulates Realtime push)
  const { data: draft, error: draftErr } = await client
    .from("drafts")
    .insert({
      coach_id: coach.id,
      lead_id: lead.id,
      status: "pending",
      body: "Playwright test draft body",
      subject: "Playwright test subject",
    })
    .select("id")
    .single();
  if (draftErr || !draft) throw new Error(`seedDraft: ${draftErr?.message ?? "no data"}`);

  // The draft should appear in the dashboard queue via Realtime within 10s
  await expect(page.getByText("Playwright Lead")).toBeVisible({ timeout: 10_000 });

  // Cleanup
  await client.from("drafts").delete().eq("id", draft.id);
  await client.from("leads").delete().eq("id", lead.id);
  await client.from("coaches").delete().eq("id", coach.id);
});
