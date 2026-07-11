import { test, expect, request as pwRequest } from "@playwright/test";

test.fixme(
  "ADMIN-004: Daniel posts to /api/admin/coaches → coach exists in DB",
  async () => {
    // Requires SUPABASE_TEST_URL + ADMIN_JWT in env; implemented when test infra provisioned.
    // Intent:
    //  1. POST /api/admin/coaches with admin JWT + { email, name }
    //  2. Expect 200 + { user_id, email }
    //  3. Query coaches table via service role; expect new row
  },
);

test("ADMIN-004: POST without admin JWT returns 401 or redirect", async ({ baseURL }) => {
  const ctx = await pwRequest.newContext({ baseURL });
  const r = await ctx.post("/api/admin/coaches", {
    data: { email: "test@test.local", name: "X" },
  });
  // Without auth cookie, middleware redirects to /login (302/307) OR handler returns 401
  expect([302, 307, 401]).toContain(r.status());
});

test("ADMIN-004: invalid body returns 400 (when authenticated as admin)", () => {
  // Marked fixme, needs admin auth fixture
  test.fixme();
});
