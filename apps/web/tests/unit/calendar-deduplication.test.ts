import { describe, it } from "vitest";
// Testing: SEQ-007, CAL-005, deterministic event IDs prevent duplicate sequence starts

describe("calendar webhook deduplication", () => {
  it.todo("generates deterministic inngest event ID as `${coachId}-${provider}-${externalEventId}`");
  it.todo("second webhook with same coach+provider+externalEventId returns 200 without re-firing Inngest");
  it.todo("same provider+externalEventId for a DIFFERENT coach is processed, not deduped");
});
