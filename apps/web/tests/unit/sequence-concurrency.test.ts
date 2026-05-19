import { describe, it } from "vitest";
// Will import from: apps/web/inngest/functions/sequence-no-show.ts
// Testing: SEQ-006 — concurrency key prevents dual active sequence per coach+lead

describe("sequence function config", () => {
  it.todo("sequence-no-show has concurrency key 'event.data.coachId' with limit 3");
  it.todo("sequence-call-completed has identical concurrency config");
  it.todo("cancelOn includes LEAD_REPLIED, LEAD_CALL_BOOKED, LEAD_UNSUBSCRIBED");
});
