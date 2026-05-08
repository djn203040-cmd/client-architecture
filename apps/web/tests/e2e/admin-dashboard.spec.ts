import { test, expect } from "@playwright/test";

test("ADMIN-002: anonymous /admin returns redirect (route exists)", async ({ request }) => {
  const r = await request.get("/admin", { maxRedirects: 0 });
  expect([302, 307]).toContain(r.status());
});

test.fixme("ADMIN-002: Daniel sees coach roster + system health", async ({ page: _page }) => {
  // Implemented when admin auth fixture available
});

test.fixme("ADMIN-004: Daniel creates coach via Create Coach sheet", async ({ page: _page }) => {
  // Steps: navigate /admin → click Create Coach → fill name+email → submit → toast "Invite sent" → row appears
});
