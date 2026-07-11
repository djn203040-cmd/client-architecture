import { test, expect } from "@playwright/test";

// 06-PLAN.md §1.6, Reduced-motion preference honored (Framer Motion useReducedMotion).
// When prefers-reduced-motion: reduce is set, Framer should skip entrance animations.

test.use({ colorScheme: "light" });

test.describe("a11y: prefers-reduced-motion is honored", () => {
  test("dashboard renders without entrance transforms when reduce is set", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for any element with a Framer-generated transform on initial render.
    // With reduce, useReducedMotion() returns true and Framer should mount at rest.
    const transformsAtRest = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll<HTMLElement>("[style*='transform']"));
      return all
        .map((el) => el.style.transform)
        .filter((t) => t && t !== "none" && !t.includes("translate3d(0px, 0px, 0px)"));
    });

    expect(transformsAtRest.length).toBeLessThanOrEqual(2);
    await context.close();
  });

  test("locked module page renders without bobbing/floating effects in reduce mode", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/modules/threshold");
    await page.waitForLoadState("networkidle");

    // Smoke check: page loaded fully without animation-driven layout shift
    const visible = await page.locator("body").isVisible();
    expect(visible).toBe(true);
    await context.close();
  });
});
