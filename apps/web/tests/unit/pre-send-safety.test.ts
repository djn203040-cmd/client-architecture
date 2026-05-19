import { describe, it } from "vitest";
// Will import from: apps/web/inngest/functions/sequence-no-show.ts (shared safety check)
// Testing: SEQ-013, STATE-010

describe("pre-send safety check", () => {
  it.todo("blocks send when lead.status is 'unsubscribed'");
  it.todo("blocks send when lead.status is 'do_not_contact'");
  it.todo("blocks send when lead.status is 'bounced'");
  it.todo("blocks send when lead.status is 'converted'");
  it.todo("blocks send when lead.status is 'closed'");
  it.todo("blocks send when lead.do_not_contact is true regardless of status");
  it.todo("blocks send when sequence.status is not 'active'");
  it.todo("returns null (unblocked) when lead is in_sequence and sequence is active");
});
