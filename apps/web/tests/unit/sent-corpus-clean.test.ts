import { describe, it, expect } from "vitest";
import { cleanSentBody, looksAutomated } from "@/lib/gmail/sent-corpus-clean";

describe("cleanSentBody", () => {
  it("cuts everything from a Gmail English reply header onward", () => {
    const raw =
      "Hey Sofia,\n\nGreat talking today. Let me know what you think.\n\nOn Tue, Jul 14, 2026 at 3:12 PM Sofia Berg <sofia@example.com> wrote:\n> Thanks for the call!\n> Talk soon.";
    const cleaned = cleanSentBody(raw);
    expect(cleaned).toContain("Great talking today");
    expect(cleaned).not.toContain("wrote:");
    expect(cleaned).not.toContain("Thanks for the call!");
  });

  it("cuts everything from a Gmail Danish reply header onward", () => {
    const raw =
      "Hej Mads,\n\nTak for i dag — jeg vender tilbage i morgen.\n\nDen tir. 14. jul. 2026 kl. 15.12 skrev Mads Holm <mads@example.com>:\n> Lyder godt!";
    const cleaned = cleanSentBody(raw);
    expect(cleaned).toContain("Tak for i dag");
    expect(cleaned).not.toContain("Lyder godt!");
  });

  it("drops quoted '>' lines even without a reply header", () => {
    const raw = "My answer below.\n> their original question\nHope that helps!";
    const cleaned = cleanSentBody(raw);
    expect(cleaned).not.toContain("their original question");
    expect(cleaned).toContain("Hope that helps!");
  });

  it("cuts at forwarded-message dividers and From: header blocks", () => {
    const raw =
      "Passing this along.\n\n---------- Forwarded message ----------\nFrom: Someone <s@example.com>\nSubject: hi\nbody body";
    const cleaned = cleanSentBody(raw);
    expect(cleaned).toBe("Passing this along.");
  });

  it("normalizes CRLF and collapses excess blank lines", () => {
    const raw = "Line one.\r\n\r\n\r\n\r\nLine two.";
    expect(cleanSentBody(raw)).toBe("Line one.\n\nLine two.");
  });
});

describe("looksAutomated", () => {
  it("flags calendar invite subjects", () => {
    expect(looksAutomated("Invitation: Intro call @ Tue Jul 14", "come along")).toBe(true);
    expect(looksAutomated("Accepted: Intro call", "see you")).toBe(true);
  });

  it("flags out-of-office and auto-replies", () => {
    expect(looksAutomated("Automatic reply: away this week", "back Monday")).toBe(true);
    expect(looksAutomated("Autosvar: ferie", "tilbage mandag")).toBe(true);
  });

  it("flags newsletter-ish bodies", () => {
    expect(looksAutomated("July update", "Click here to unsubscribe from this list")).toBe(true);
  });

  it("keeps a normal coaching email", () => {
    expect(
      looksAutomated("Following up from our call", "Hey! Loved our conversation today."),
    ).toBe(false);
  });
});
