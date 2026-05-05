// INFRA-008: Server-only package. Hard-fail if imported in browser context.
if (typeof window !== "undefined") {
  throw new Error(
    "@client/ai-engine must not be imported in client-side code. " +
    "This package wraps Anthropic API calls (server-side only)."
  );
}

// Phase 2 implementation lives here. Phase 1 ships only the guard.
export const AI_ENGINE_VERSION = "0.0.1-scaffold";
