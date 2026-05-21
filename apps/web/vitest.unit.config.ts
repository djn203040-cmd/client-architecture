import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Unit tests: pure functions, no I/O, no DB. Mocks for all external services.
// Target runtime: <30s on CI.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
    globals: true,
    testTimeout: 10000,
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
