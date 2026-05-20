import { describe, it, beforeEach } from "vitest";
import { installTwilioMock, resetTwilioMock, mockTwilioClient } from "@/tests/utils/mocks/twilio";

installTwilioMock();

beforeEach(() => {
  resetTwilioMock();
});

describe("whatsapp-channel (Phase 4 / NOTIFY-004)", () => {
  it("invokes Twilio messages.create with ContentSid + ContentVariables shape", () => {
    void mockTwilioClient;
    throw new Error("not implemented — see plan 04-05-PLAN.md");
  });

  it("uses the WhatsApp Business 'from' channel address", () => {
    throw new Error("not implemented — see plan 04-05-PLAN.md");
  });

  it("logs sid + status into notification_log", () => {
    throw new Error("not implemented — see plan 04-05-PLAN.md");
  });
});
