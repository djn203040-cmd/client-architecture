import { test } from "@playwright/test";

// E2E target: Phase-gate / Approve+Next button on a seeded draft completes
// the Gmail send path. Implementation lands in plan 04-02.

test.fixme("Approve+Next on seeded draft completes Gmail send path", async ({ page: _page }) => {
  // Pseudocode of the eventual test:
  //   1. Seed coach + lead + draft (status='pending') via supabase-test-client
  //   2. Stub the Gmail send endpoint to return success
  //   3. Sign in the coach
  //   4. Click Approve+Next on the dashboard
  //   5. Expect draft.status to flip to 'sent' and next pending action to focus
});
