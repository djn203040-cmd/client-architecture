import { describe, it, beforeEach } from "vitest";
import { installResendMock, resetResendMock, mockResend } from "@/tests/utils/mocks/resend";

installResendMock();

beforeEach(() => {
  resetResendMock();
});

describe("email-channel (Phase 4 / NOTIFY-002)", () => {
  it("invokes Resend SDK with html + text + from + to payload", () => {
    void mockResend; // keep reference so tree-shaking doesn't elide the mock
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("embeds a tokenized review link that resolves to /review/[token]", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });

  it("logs notification_log entry with external_id from Resend response", () => {
    throw new Error("not implemented — see plan 04-03-PLAN.md");
  });
});
