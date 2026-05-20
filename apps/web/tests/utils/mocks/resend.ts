/**
 * Resend SDK mock for Phase 4 channel tests.
 * No network — tests assert against `mockResend.emails.send.mock.calls`.
 */

import { vi } from "vitest";

export const mockResend = {
  emails: {
    send: vi.fn(
      async (_payload: Record<string, unknown>): Promise<{
        data: { id: string } | null;
        error: { message: string } | null;
      }> => ({
        data: { id: "test-email-id" },
        error: null,
      }),
    ),
  },
};

export function installResendMock(): void {
  vi.mock("resend", () => ({
    Resend: vi.fn(() => mockResend),
  }));
}

export function resetResendMock(): void {
  mockResend.emails.send.mockClear();
  mockResend.emails.send.mockImplementation(async () => ({
    data: { id: "test-email-id" },
    error: null,
  }));
}
