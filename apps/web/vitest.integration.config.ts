import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration tests: vitest + local Supabase (supabase start). Real RLS,
// real Vault, real Inngest test client. Mocked Gmail/Twilio/Slack/Resend HTTP.
// Target runtime: ~3 min on CI.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@client/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@client/database": path.resolve(__dirname, "../../packages/database/src"),
      "@client/ai-engine": path.resolve(__dirname, "../../packages/ai-engine/src"),
      "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
    },
  },
});
