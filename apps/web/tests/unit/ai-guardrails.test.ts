// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { isHardBlocked, scanNeverSayList, assertCoachIdScope } from "@client/ai-engine";
import type { TLeadStatus } from "@client/shared/types";

describe("VOICE-004 / AI-003: isHardBlocked", () => {
  it("returns true for 'unsubscribed'", () => {
    expect(isHardBlocked("unsubscribed")).toBe(true);
  });

  it("returns true for 'do_not_contact'", () => {
    expect(isHardBlocked("do_not_contact")).toBe(true);
  });

  it("returns true for 'bounced'", () => {
    expect(isHardBlocked("bounced")).toBe(true);
  });

  it("returns false for 'identified'", () => {
    expect(isHardBlocked("identified")).toBe(false);
  });

  it("returns false for 'call_completed'", () => {
    expect(isHardBlocked("call_completed")).toBe(false);
  });

  it("returns false for 'replied'", () => {
    expect(isHardBlocked("replied")).toBe(false);
  });

  it("returns false for 'in_sequence'", () => {
    expect(isHardBlocked("in_sequence")).toBe(false);
  });

  it("returns false for 'converted'", () => {
    expect(isHardBlocked("converted")).toBe(false);
  });
});

describe("AI-003: scanNeverSayList", () => {
  it("returns matched phrases case-insensitively", () => {
    const matches = scanNeverSayList(
      "I just wanted to quickly touch base with you.",
      ["touch base", "quickly"]
    );
    expect(matches).toContain("touch base");
    expect(matches).toContain("quickly");
  });

  it("matches case-insensitively (uppercase phrase in draft)", () => {
    const matches = scanNeverSayList(
      "SYNERGY is our key differentiator",
      ["synergy"]
    );
    expect(matches).toContain("synergy");
  });

  it("returns [] when no match", () => {
    const matches = scanNeverSayList(
      "Hello, hope you are doing well.",
      ["touch base", "circle back"]
    );
    expect(matches).toEqual([]);
  });

  it("returns [] for empty never-say list", () => {
    const matches = scanNeverSayList("Any text at all", []);
    expect(matches).toEqual([]);
  });

  it("returns [] for empty draft text", () => {
    const matches = scanNeverSayList("", ["synergy", "leverage"]);
    expect(matches).toEqual([]);
  });
});

describe("AI-003: assertCoachIdScope", () => {
  it("does not throw when coach IDs are equal", () => {
    expect(() =>
      assertCoachIdScope("coach-abc-123", "coach-abc-123")
    ).not.toThrow();
  });

  it("throws when the two coach IDs differ", () => {
    expect(() =>
      assertCoachIdScope("coach-abc-123", "coach-xyz-999")
    ).toThrow();
  });

  it("throws with a descriptive error message", () => {
    expect(() =>
      assertCoachIdScope("aaa", "bbb")
    ).toThrowError(/scope violation/i);
  });
});
