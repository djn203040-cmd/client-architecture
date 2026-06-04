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

    // Ignore noise from the intentionally-aborted cal.com iframe. WebKit reports
    // the aborted load as "Failed to load resource: ... TLS handshake" with no
    // "cal.com" in the text, so match on the resource-failure shape too.
    const IGNORED_ERROR_FRAGMENTS = [
      "cal.com",
      "Failed to load resource",
      "TLS handshake",
      "ERR_",
      "net::",
    ];
    const criticalErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        !IGNORED_ERROR_FRAGMENTS.some((frag) => msg.text().includes(frag))
      ) {
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
  // Click the link element (not the inner text node) so navigation fires
  // reliably in WebKit; then wait for the async client-side route.
  await page.getByRole("link", { name: /The Threshold Experience/ }).click();
  await page.waitForURL("**/modules/threshold");
  expect(page.url()).toContain("/modules/threshold");
});

test("sidebar locked tile deep-links to /modules/continuation", async ({ coach, page }) => {
  await withOnboardingComplete(coach.id);
  await page.context().addCookies(coach.cookies);

  await page.goto("/dashboard");
  // Click the link element (not the inner text node) so navigation fires
  // reliably in WebKit; then wait for the async client-side route.
  await page.getByRole("link", { name: /The Continuation/ }).click();
  await page.waitForURL("**/modules/continuation");
  expect(page.url()).toContain("/modules/continuation");
});
