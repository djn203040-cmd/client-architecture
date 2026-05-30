// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decideScheduledSend } from "@/inngest/functions/sequence-scheduled-send";

describe("decideScheduledSend", () => {
  it("sends an already-approved draft regardless of mode", () => {
    expect(decideScheduledSend("approved", "off")).toEqual({ action: "send" });
    expect(decideScheduledSend("edited", "off")).toEqual({ action: "send" });
    expect(decideScheduledSend("approved", "mode_b")).toEqual({ action: "send" });
  });

  it("auto-approves + sends a pending draft in autonomous modes", () => {
    expect(decideScheduledSend("pending", "mode_b")).toEqual({ action: "auto_approve_send" });
    expect(decideScheduledSend("pending", "mode_a")).toEqual({ action: "auto_approve_send" });
  });

  it("never auto-sends a pending draft in manual mode", () => {
    expect(decideScheduledSend("pending", "off")).toEqual({
      action: "skip",
      reason: "awaiting_manual_approval",
    });
    expect(decideScheduledSend("pending", null)).toEqual({
      action: "skip",
      reason: "awaiting_manual_approval",
    });
  });

  it("skips terminal / non-sendable states", () => {
    expect(decideScheduledSend("held", "mode_b")).toMatchObject({ action: "skip" });
    expect(decideScheduledSend("cancelled", "mode_b")).toMatchObject({ action: "skip" });
    expect(decideScheduledSend("sent", "mode_b")).toMatchObject({ action: "skip" });
    expect(decideScheduledSend(null, "mode_b")).toEqual({ action: "skip", reason: "draft_missing" });
  });
});
