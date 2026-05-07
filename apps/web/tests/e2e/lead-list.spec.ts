import { test, expect } from "@playwright/test";

test.fixme("LEAD-005: search input filters table", async ({ page }) => {});
test.fixme("LEAD-005: status tabs filter table by category", async ({ page }) => {});

test("LEAD-005: anonymous /leads redirects to /login", async ({ page }) => {
  await page.goto("/leads");
  await expect(page).toHaveURL(/\/login/);
});
