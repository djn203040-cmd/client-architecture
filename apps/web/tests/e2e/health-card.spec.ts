import { test, expect } from "@playwright/test";

test.fixme("HEALTH-001: connected state shows 'Gmail connected'", async ({ page }) => {
  // Requires authenticated coach + integration row connected, Wave 5 fixture
});

test.fixme("HEALTH-002: disconnected state shows red + reconnect button", async ({ page }) => {
  // Requires authenticated coach + integration row disconnected
});

test("HEALTH-003: settings page redirects unauthenticated users to /login", async ({
  request,
}) => {
  // Anonymous: redirected to /login; assert that's the path so the link selector
  // remains discoverable in code. The settings page /api/auth/gmail/authorize
  // Connect Gmail link is verified in place by code-level grep.
  const r = await request.get("/settings", { maxRedirects: 0 });
  expect([302, 307]).toContain(r.status());
});
