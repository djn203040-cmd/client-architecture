import { test, expect } from "@playwright/test";

test("GMAIL-001: anonymous /api/auth/gmail/authorize redirects to /login", async ({ request }) => {
  const r = await request.get("/api/auth/gmail/authorize", { maxRedirects: 0 });
  expect([302, 307]).toContain(r.status());
  const loc = r.headers()["location"] ?? "";
  expect(loc).toMatch(/\/login/);
});

test.fixme("GMAIL-001: authenticated /api/auth/gmail/authorize redirects to accounts.google.com with offline+consent params", async ({ page: _page, context: _context }) => {
  // Implemented when authenticated session fixture available
  // Steps:
  //  1. Sign in as coach
  //  2. Navigate to /api/auth/gmail/authorize (or click "Connect Gmail" in dashboard)
  //  3. Capture redirect URL
  //  4. Expect host=accounts.google.com AND query contains "access_type=offline" AND "prompt=consent" AND "scope=*gmail.send*"
});

test.fixme("GMAIL-001: callback with insufficient scopes redirects with error", async ({ request: _request }) => {
  // Cannot fully simulate without mocking Google — leave as fixme; Phase 5 Playwright suite implements with token mock
});
