import { describe, it } from "vitest";
// Will import from: apps/web/lib/unsubscribe-token.ts (to be created)
// Testing: COMPLY-001, COMPLY-002

describe("unsubscribe token", () => {
  it.todo("generates HMAC-signed token containing leadId and coachId");
  it.todo("verifies valid token returns { leadId, coachId }");
  it.todo("rejects token with tampered payload");
  it.todo("rejects token signed with wrong secret");
});
