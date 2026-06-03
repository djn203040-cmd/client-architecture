import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// Load .env.test for local runs without dotenv dependency.
// CI APPENDS the live keys: supabase status -o env >> apps/web/.env.test — so
// each Supabase key appears twice (committed placeholder, then the real value).
// Real shell/CI process-env exports always win; within the file the LAST
// occurrence wins, so the appended real key overrides the placeholder.
const preExistingEnv = new Set(Object.keys(process.env));
const envTestPath = path.resolve(__dirname, ".env.test");
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    // `supabase status -o env` writes KEY="value"; strip surrounding quotes so
    // the value is a usable URL, not `"http://…"`.
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
    // A real shell/CI export (present before we read the file) always wins.
    if (preExistingEnv.has(key)) continue;
    process.env[key] = value;
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/global-setup.ts",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // 06-PLAN.md §1.7 — cross-browser matrix. webkit + firefox run when
    // CROSS_BROWSER=1 (keeps default PR cycle short).
    ...(process.env.CROSS_BROWSER === "1"
      ? [
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        ]
      : []),
    // Mobile + tablet viewports for the dashboard smoke spec only
    {
      name: "mobile-chromium",
      testMatch: /dashboard.*\.spec\.ts/,
      use: { ...devices["Pixel 5"], viewport: { width: 375, height: 667 } },
    },
    {
      name: "tablet-chromium",
      testMatch: /dashboard.*\.spec\.ts/,
      use: { ...devices["iPad (gen 7)"], viewport: { width: 768, height: 1024 } },
    },
    // 06-PLAN.md §1.6 — dual-mode axe scan: dark + light. Dark variant runs the
    // critical visual surfaces in colorScheme: 'dark' for contrast violations.
    {
      name: "chromium-dark",
      testMatch: /(reduced-motion|locked-module-pages|admin-dashboard|onboarding-completion)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
    },
  ],
  // Playwright manages the app server in every environment. In CI neither
  // workflow started Next, so every spec hit ERR_CONNECTION_REFUSED; let
  // Playwright boot it and wait for it to answer. The command inherits the env
  // (incl. the Supabase keys loaded from .env.test above).
  webServer: {
    command: "NODE_ENV=test pnpm dev",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
