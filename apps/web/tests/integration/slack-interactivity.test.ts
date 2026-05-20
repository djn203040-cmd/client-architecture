import { describe, it, beforeEach } from "vitest";
import { installSlackMock, resetSlackMock, mockWebClient } from "@/tests/utils/mocks/slack";

installSlackMock();

beforeEach(() => {
  resetSlackMock();
});

describe("slack-interactivity (Phase 4 / NOTIFY-008)", () => {
  it("approve flow: button click triggers CAS approve and updates the Slack message via response_url", () => {
    void mockWebClient;
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });

  it("rejects payloads with missing or stale Slack signature", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });

  it("idempotent: replaying the same payload does not re-approve", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });
});
