import { describe, it } from "vitest";
// Testing: SEQ-007, CAL-005, deterministic event IDs prevent duplicate sequence starts

describe("calendar webhook deduplication", () => {
  it.todo("generates deterministic inngest event ID as `${provider}-${externalEventId}`");
  it.todo("second webhook with same provider+externalEventId returns 200 without re-firing Inngest");
});
