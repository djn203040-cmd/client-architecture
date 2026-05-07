import { test, expect } from "@playwright/test";

test.fixme("LEAD-002: profile renders header + timeline + notes + sequence panel", async ({ page }) => {});

test("LEAD-002: anonymous /leads/[id] redirects to /login", async ({ page }) => {
  await page.goto("/leads/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login/);
});
