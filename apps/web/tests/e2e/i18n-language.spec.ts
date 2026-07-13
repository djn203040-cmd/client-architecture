import { test, expect } from "../fixtures";
import { admin } from "../fixtures/createCoach";
import { createLead } from "../fixtures/createLead";

// Stage 3 i18n: the coach's stored language drives BOTH the UI copy and the
// date formatting, and the Settings switcher flips the whole shell live.
//
// da-DK renders dates with dot separators ("31.05.2026"); en-US uses slashes
// ("5/31/2026"). We assert on the separator SHAPE rather than an exact day so
// the test is robust to whatever timezone the runner is in.
const DA_DATE = /\d{1,2}\.\d{2}\.\d{4}/; // dd.mm.yyyy
const EN_DATE = /\d{1,2}\/\d{1,2}\/\d{4}/; // m/d/yyyy

async function completeOnboarding(coachId: string) {
  await admin
    .from("coaches")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", coachId);
}

test("da coach: UI copy and lead-list dates render in Danish", async ({ danishCoach, page }) => {
  await completeOnboarding(danishCoach.id);

  // Seed a lead with a fixed last-activity instant so the list has a date cell.
  const lead = await createLead(danishCoach.id, { name: "Camilla Testesen" });
  await admin
    .from("leads")
    .update({ last_activity_at: "2026-05-31T12:00:00Z" })
    .eq("id", lead.id);

  await page.context().addCookies(danishCoach.cookies);
  await page.goto("/leads");

  // Shell nav is localized: "Udkast" (da) not "Drafts" (en).
  await expect(page.getByRole("link", { name: "Udkast" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Drafts" })).toHaveCount(0);

  // The last-activity cell uses Danish date formatting (dots, not slashes).
  const dateCell = page.locator("td").filter({ hasText: DA_DATE }).first();
  await expect(dateCell).toBeVisible();
  await expect(dateCell).not.toHaveText(EN_DATE);
});

test("en coach: UI copy and lead-list dates render in English", async ({ coach, page }) => {
  await completeOnboarding(coach.id);

  const lead = await createLead(coach.id, { name: "Sofia Example" });
  await admin
    .from("leads")
    .update({ last_activity_at: "2026-05-31T12:00:00Z" })
    .eq("id", lead.id);

  await page.context().addCookies(coach.cookies);
  await page.goto("/leads");

  await expect(page.getByRole("link", { name: "Drafts" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Udkast" })).toHaveCount(0);

  const dateCell = page.locator("td").filter({ hasText: EN_DATE }).first();
  await expect(dateCell).toBeVisible();
});

test("Settings language switcher flips the whole shell live (en → da)", async ({ coach, page }) => {
  await completeOnboarding(coach.id);
  await page.context().addCookies(coach.cookies);

  await page.goto("/settings");

  // Starts English.
  await expect(page.getByRole("link", { name: "Drafts" }).first()).toBeVisible();

  // The switcher cards are flagged 🇩🇰 / 🇬🇧; pick the Danish one.
  const danishCard = page.getByRole("button").filter({ hasText: "🇩🇰" }).first();
  await expect(danishCard).toBeVisible();
  await danishCard.click();

  // router.refresh() re-renders the server shell with the new locale — nav flips.
  await expect(page.getByRole("link", { name: "Udkast" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Drafts" })).toHaveCount(0);
});
