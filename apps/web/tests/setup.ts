import { vi } from "vitest";

// Mock next/headers for unit tests (not available outside route handlers)
vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

// Default test env vars (override per-test as needed)
process.env["NEXT_PUBLIC_SUPABASE_URL"] ??= "https://test.supabase.co";
process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ??= "test-anon-key";
process.env["SUPABASE_SERVICE_ROLE_KEY"] ??= "test-service-role-key";
process.env["INSTAGRAM_WEBHOOK_VERIFY_TOKEN"] ??= "test-verify-token";
