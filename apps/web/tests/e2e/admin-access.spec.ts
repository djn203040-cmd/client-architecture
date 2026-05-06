import { test, expect } from "@playwright/test";

test("ADMIN-001: anonymous visit to /admin redirects to /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test.fixme(
  "ADMIN-001: coach (non-admin) visit to /admin redirects to /login",
  async ({ page: _page }) => {
    // Requires authenticated coach session — implement in CI when test DB is provisioned
    // Intent: log in as coach via UI, navigate to /admin, expect redirect to /login
  },
);
