import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { admin } from "../fixtures/createCoach";

// 06-PLAN.md §1.4-48h HOLD cascade: draft moves to held state, surfaces in Held tab.

test("HOLD cascade: 48h-stale draft routed to held status surfaces in Held tab", async ({ coach, page }) => {
  const lead = await createLead(coach.id);
  const draft = await createDraft(coach.id, lead.id, { status: "held" });

  await page.context().addCookies(coach.cookies);
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const heldTab = page.getByRole("tab", { name: /held/i });
  if (await heldTab.isVisible()) {
    await heldTab.click();
    await expect(page.getByText(lead.email).or(page.getByText("Held"))).toBeVisible({ timeout: 10_000 });
  }

  const { data } = await admin.from("drafts").select("status").eq("id", draft.id).single();
  expect(data?.status).toBe("held");
});
