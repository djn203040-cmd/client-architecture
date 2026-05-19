import { describe, it } from "vitest";
// Will import from: apps/web/lib/gmail/monitor.ts
// Testing: GMAIL-008 — In-Reply-To header matching against outbound gmail_message_id

describe("reply detection", () => {
  it.todo("detects reply when In-Reply-To header matches a known gmail_message_id");
  it.todo("strips angle brackets from In-Reply-To before matching (<msg-id> → msg-id)");
  it.todo("ignores message with no In-Reply-To header");
  it.todo("ignores reply to a message not sent by our system");
});
