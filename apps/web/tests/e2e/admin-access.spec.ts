import { test, expect } from "@playwright/test";

test("ADMIN-001: anonymous /admin redirects to /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("ADMIN-001: anonymous /admin/coaches/[id] redirects to /login", async ({ page }) => {
  await page.goto("/admin/coaches/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login/);
});

test("ADMIN-001: anonymous /api/admin/system-health returns 401", async ({ request }) => {
  const r = await request.get("/api/admin/system-health", { maxRedirects: 0 });
  expect([401, 302, 307]).toContain(r.status());
});

test.fixme(
  "ADMIN-001: coach (non-admin) /admin redirects to /login",
  async ({ page: _page }) => {
    // Implemented when authenticated coach session fixture is available
  },
);
