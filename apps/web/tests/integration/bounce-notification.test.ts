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

describe("bounce-notification (Phase 4 / COMPLY-006)", () => {
  it("hard bounce fans out to dispatcher and includes SMS unconditionally", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });

  it("hard bounce includes lead name and reason in every channel body", () => {
    throw new Error("not implemented — see plan 04-07-PLAN.md");
  });
});
