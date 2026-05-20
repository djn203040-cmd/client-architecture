import { test } from "@playwright/test";

// E2E target: NOTIFY-001 / Realtime dashboard notification appearance.
// Implementation lands across plans 04-02 (dashboard UI) and 04-07 (dispatcher).

test.fixme("dashboard notification appears via Realtime when a draft is ready", async ({ page: _page }) => {
  // Pseudocode of the eventual test:
  //   1. Seed coach + lead + draft via supabase-test-client
  //   2. Sign in the coach in the browser
  //   3. Trigger `draft_ready` event via Inngest dev endpoint
  //   4. Expect a notification card to appear in the dashboard via Supabase Realtime
  //   5. Assert badge counter increments
});
