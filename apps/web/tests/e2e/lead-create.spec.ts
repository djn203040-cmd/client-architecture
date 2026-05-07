import { test, expect } from "@playwright/test";

test.fixme("LEAD-001: coach adds a lead via AddLead sheet", async ({ page }) => {
  // Implemented when authenticated session fixture is available (Wave 5).
  // Steps: log in → /leads → click Add Lead → fill name+email+source → submit → row appears
});

test.fixme("LEAD-001: invalid email shows inline error", async ({ page }) => {
  // Steps: open sheet → enter "not-an-email" in email → submit → error message shows; sheet stays open
});
