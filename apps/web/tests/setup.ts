import { vi } from "vitest";

// server-only throws outside Next.js bundler context, no-op in tests
vi.mock("server-only", () => ({}));

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
// Deterministic 32-byte base64 key for transcript-cipher tests.
process.env["TRANSCRIPT_ENCRYPTION_KEY"] ??= "4282eC5g2ZdY5Nxwhsm1AwFyCuc1S88FoGYzrHZ0dZ4=";
