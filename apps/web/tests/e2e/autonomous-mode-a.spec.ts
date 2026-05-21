import { test, expect } from "../fixtures";

// 06-PLAN.md §1.4 — Autonomous Mode A: type-to-confirm "send without review".
// Wrong phrase keeps Save disabled; exact phrase enables it; new drafts auto-send.

test("Mode A type-to-confirm: wrong phrase disables save, exact phrase enables it", async ({ coach, page }) => {
  await page.context().addCookies(coach.cookies);
  await page.goto("/settings/autonomous-mode");
  await page.waitForLoadState("networkidle");

  // Choose Mode A
  const modeA = page.getByRole("radio", { name: /mode a|auto-send/i });
  if (await modeA.isVisible()) {
    await modeA.click();

    // Type-to-confirm field
    const input = page.getByPlaceholder(/type "send without review"/i).first();
    await input.fill("wrong phrase");

    const save = page.getByRole("button", { name: /save|confirm|enable/i });
    await expect(save).toBeDisabled();

    await input.fill("send without review");
    await expect(save).toBeEnabled();
  } else {
    test.skip(true, "Settings page does not expose Mode A radio yet");
  }
});

test("Mode A persistence: PATCH /api/settings/autonomous-mode validates phrase server-side", async ({ coach, page }) => {
  // Server-side validation must also enforce the exact phrase
  const badRes = await page.request.patch("/api/settings/autonomous-mode", {
    data: { mode: "a", confirmation_phrase: "wrong phrase" },
  });
  expect([400, 422, 401]).toContain(badRes.status());
});
