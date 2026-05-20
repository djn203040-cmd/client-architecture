/**
 * Slack `@slack/web-api` mock for Phase 4 Slack channel + interactivity tests.
 * Mock tokens are clearly fake ("xoxb-test") so they can never be confused
 * with real bot tokens.
 */

import { vi } from "vitest";

const postMessageFn = vi.fn();
postMessageFn.mockResolvedValue({ ok: true, ts: "test-ts", channel: "D-test" });

const updateFn = vi.fn();
updateFn.mockResolvedValue({ ok: true });

const viewsOpenFn = vi.fn();
viewsOpenFn.mockResolvedValue({ ok: true });

const oauthAccessFn = vi.fn();
oauthAccessFn.mockResolvedValue({
  ok: true,
  access_token: "xoxb-test",
  bot_user_id: "B1",
  team: { id: "T1" },
  authed_user: { id: "U1" },
});

export const mockWebClient = {
  chat: {
    postMessage: postMessageFn,
    update: updateFn,
  },
  views: {
    open: viewsOpenFn,
  },
  oauth: {
    v2: {
      access: oauthAccessFn,
    },
  },
};

export function installSlackMock(): void {
  vi.mock("@slack/web-api", () => ({
    WebClient: vi.fn(() => mockWebClient),
  }));
}

export function resetSlackMock(): void {
  mockWebClient.chat.postMessage.mockClear();
  mockWebClient.chat.update.mockClear();
  mockWebClient.views.open.mockClear();
  mockWebClient.oauth.v2.access.mockClear();
}
