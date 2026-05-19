import { describe, it } from "vitest";
// Integration test — requires Supabase test client or mocked adminClient
// Testing: SEQ-014, CAL-005 — DB UNIQUE(provider, external_event_id)

describe("calendar_events UNIQUE constraint", () => {
  it.todo("second insert with same provider+external_event_id throws unique violation");
  it.todo("insert with different provider same event_id succeeds (different provider = different row)");
});
