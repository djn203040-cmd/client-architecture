import { test, expect } from "@playwright/test";

// The privacy policy must be publicly reachable — its URL is registered on
// the Google OAuth consent screen, and Google's crawler fetches it
// unauthenticated. A regression to a login redirect would break OAuth
// verification silently.
test.describe("public privacy policy", () => {
  test("renders without authentication", async ({ page }) => {
    const response = await page.goto("/privacy-policy");
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain("/privacy-policy");

    await expect(
      page.getByRole("heading", { name: "Privacy Policy", level: 1 }),
    ).toBeVisible();
  });

  test("includes the Google Limited Use disclosure", async ({ page }) => {
    await page.goto("/privacy-policy");

    await expect(
      page.getByRole("heading", { name: "Google API Services & Limited Use" }),
    ).toBeVisible();
    await expect(
      page.getByText("including the Limited Use requirements"),
    ).toBeVisible();
  });

  test("lists sub-processors and contact", async ({ page }) => {
    await page.goto("/privacy-policy");

    await expect(page.getByRole("cell", { name: "Anthropic" })).toBeVisible();
    await expect(
      page.getByText("privacy@theclientarchitecture.com").first(),
    ).toBeVisible();
  });
});
