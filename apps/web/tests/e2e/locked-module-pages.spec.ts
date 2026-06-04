import { test, expect } from "../fixtures";
import { admin } from "../fixtures/createCoach";

const PAGES = [
  {
    path: "/modules/threshold",
    titleSegment: "The Threshold Experience",
    taglineSegment: "your client's first 48 hours, built from your sales call",
    sidebarLabel: "The Threshold Experience",
  },
  {
    path: "/modules/continuation",
    titleSegment: "The Continuation",
    taglineSegment: "thirty days before they leave",
    sidebarLabel: "The Continuation",
  },
] as const;

async function withOnboardingComplete(coachId: string) {
  await admin
    .from("coaches")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", coachId);
}

for (const { path, titleSegment, taglineSegment } of PAGES) {
  test(`${path} renders hero copy verbatim`, async ({ coach, page }) => {
    await withOnboardingComplete(coach.id);
    await page.context().addCookies(coach.cookies);

    // Intercept cal.com to avoid network dependency — iframe still mounts
    await page.route("**/cal.com/**", (route) => route.abort());

    const criticalErrors: string[] = [];
    page.on("console", (msg) => {
      // Ignore cal.com network errors (expected in offline test env)
      if (msg.type() === "error" && !msg.text().includes("cal.com")) {
        criticalErrors.push(msg.text());
      }
    });

    await page.goto(path);
    // The title appears in the hero h1, the sidebar link, and prose — target
    // the hero heading specifically to avoid a strict-mode match on all four.
    await expect(page.getByRole("heading", { level: 1, name: titleSegment })).toBeVisible();
    // Scope to <main> — the tagline also appears in the sidebar locked tile.
    await expect(page.getByRole("main").getByText(taglineSegment)).toBeVisible();

    expect(criticalErrors).toHaveLength(0);
  });
}

test("sidebar locked tile deep-links to /modules/threshold", async ({ coach, page }) => {
  await withOnboardingComplete(coach.id);
  await page.context().addCookies(coach.cookies);

  await page.goto("/dashboard");
  await page.getByText("The Threshold Experience").click();
  // Client-side navigation is async — wait for the route before asserting.
  await page.waitForURL("**/modules/threshold");
  expect(page.url()).toContain("/modules/threshold");
});

test("sidebar locked tile deep-links to /modules/continuation", async ({ coach, page }) => {
  await withOnboardingComplete(coach.id);
  await page.context().addCookies(coach.cookies);

  await page.goto("/dashboard");
  await page.getByText("The Continuation").click();
  // Client-side navigation is async — wait for the route before asserting.
  await page.waitForURL("**/modules/continuation");
  expect(page.url()).toContain("/modules/continuation");
});
