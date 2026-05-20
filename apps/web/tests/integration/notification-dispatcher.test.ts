import { describe, it, beforeEach } from "vitest";
import { installResendMock, resetResendMock } from "@/tests/utils/mocks/resend";
import { installSlackMock, resetSlackMock } from "@/tests/utils/mocks/slack";
import { installTwilioMock, resetTwilioMock } from "@/tests/utils/mocks/twilio";
import { resetInngestQueue } from "@/tests/utils/inngest-runner";

installResendMock();
installSlackMock();
installTwilioMock();

beforeEach(() => {
  resetInngestQueue();
  resetResendMock();
  resetSlackMock();
  resetTwilioMock();
});

describe("notification-dispatcher (Phase 4 / DRAFT-001 + DRAFT-002 + NOTIFY-006)", () => {
  it("fires draft_ready event 24h before scheduled send", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("fans out to all enabled notification channels for the coach", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("dispatches all channels in parallel (Promise.allSettled, not serial)", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("filters channels per coach preferences before dispatch", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("isolates a single channel failure from the others", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });
});
