/**
 * Twilio SDK mock for Phase 4 SMS + WhatsApp tests.
 * No network, assert against `mockTwilioClient.messages.create.mock.calls`.
 */

import { vi } from "vitest";

export const mockTwilioClient = {
  messages: {
    create: vi.fn(
      async (
        _payload: Record<string, unknown>,
      ): Promise<{ sid: string; status: string }> => ({
        sid: "test-message-sid",
        status: "queued",
      }),
    ),
  },
};

export const mockValidateRequest = vi.fn(
  (_authToken: string, _signature: string, _url: string, _params: Record<string, string>): boolean => true,
);

export function installTwilioMock(): void {
  vi.mock("twilio", () => {
    const TwilioCtor = vi.fn(() => mockTwilioClient);
    return {
      default: TwilioCtor,
      Twilio: TwilioCtor,
      validateRequest: mockValidateRequest,
    };
  });
}

export function resetTwilioMock(): void {
  mockTwilioClient.messages.create.mockClear();
  mockTwilioClient.messages.create.mockImplementation(async () => ({
    sid: "test-message-sid",
    status: "queued",
  }));
  mockValidateRequest.mockClear();
  mockValidateRequest.mockImplementation(() => true);
}
