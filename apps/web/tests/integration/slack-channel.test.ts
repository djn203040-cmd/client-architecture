import { describe, it, beforeEach } from "vitest";
import { installSlackMock, resetSlackMock, mockWebClient } from "@/tests/utils/mocks/slack";

installSlackMock();

beforeEach(() => {
  resetSlackMock();
});

describe("slack-channel (Phase 4 / NOTIFY-003)", () => {
  it("posts a Block Kit message with the expected block structure", () => {
    void mockWebClient;
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });

  it("includes Approve / Adjust / Hold action buttons with draft_id payload", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });

  it("logs the resulting ts + channel into notification_log", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });
});
