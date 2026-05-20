import { describe, it, beforeEach } from "vitest";
import { installResendMock, resetResendMock } from "@/tests/utils/mocks/resend";
import { installSlackMock, resetSlackMock } from "@/tests/utils/mocks/slack";
import { installTwilioMock, resetTwilioMock } from "@/tests/utils/mocks/twilio";

installResendMock();
installSlackMock();
installTwilioMock();

beforeEach(() => {
  resetResendMock();
  resetSlackMock();
  resetTwilioMock();
});

describe("webhook-status (Phase 4 / NOTIFY-007)", () => {
  it("Resend webhook updates notification_log.status by external_id (plan 04-03)", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("Twilio status callback updates notification_log.status by message sid (plan 04-05)", () => {
    throw new Error("not implemented — see plan 04-05-PLAN.md");
  });

  it("Slack event callback updates notification_log.status by ts (plan 04-04)", () => {
    throw new Error("not implemented — see plan 04-04-PLAN.md");
  });

  it("rejects webhook payloads with invalid signature", () => {
    throw new Error("not implemented — see plans 04-03 / 04-04 / 04-05");
  });
});
