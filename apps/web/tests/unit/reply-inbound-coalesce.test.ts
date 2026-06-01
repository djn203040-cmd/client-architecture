// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  extractUnansweredInbound,
  formatThreadAsConversation,
  formatInboundMessages,
} from "@/lib/drafts/thread-context";
import type { TThreadEmail } from "@/lib/gmail/thread";

const LEAD = "lead@example.com";
const COACH = "coach@example.com";

function msg(from: string, body: string, date: string): TThreadEmail {
  return { id: date, from, subject: "Re: chat", date, snippet: body.slice(0, 20), body };
}

describe("extractUnansweredInbound", () => {
  it("returns all of the lead's messages since our last outbound (the 3-reply case)", () => {
    const thread: TThreadEmail[] = [
      msg(COACH, "Our first touch", "2026-06-01T09:00:00Z"),
      msg(LEAD, "First thought", "2026-06-01T10:00:00Z"),
      msg(LEAD, "Actually also this", "2026-06-01T10:05:00Z"),
      msg(LEAD, "And one more thing", "2026-06-01T10:10:00Z"),
    ];
    const out = extractUnansweredInbound(thread, LEAD);
    expect(out).toContain("First thought");
    expect(out).toContain("Actually also this");
    expect(out).toContain("And one more thing");
    expect(out).toContain("Message 1 of 3");
    expect(out).toContain("Message 3 of 3");
  });

  it("ignores already-answered messages (only counts replies after our last send)", () => {
    const thread: TThreadEmail[] = [
      msg(LEAD, "old answered question", "2026-06-01T08:00:00Z"),
      msg(COACH, "our reply to that", "2026-06-01T09:00:00Z"),
      msg(LEAD, "new unanswered question", "2026-06-01T10:00:00Z"),
    ];
    const out = extractUnansweredInbound(thread, LEAD);
    expect(out).toBe("new unanswered question");
    expect(out).not.toContain("old answered");
  });

  it("returns a single string (no numbering) when there is exactly one reply", () => {
    const thread: TThreadEmail[] = [
      msg(COACH, "our touch", "2026-06-01T09:00:00Z"),
      msg(LEAD, "just one", "2026-06-01T10:00:00Z"),
    ];
    expect(extractUnansweredInbound(thread, LEAD)).toBe("just one");
  });

  it("returns null when nothing from the lead is outstanding", () => {
    const thread: TThreadEmail[] = [msg(COACH, "our touch", "2026-06-01T09:00:00Z")];
    expect(extractUnansweredInbound(thread, LEAD)).toBeNull();
  });

  it("works regardless of incoming sort order (newest-first source)", () => {
    const thread: TThreadEmail[] = [
      msg(LEAD, "second", "2026-06-01T10:05:00Z"),
      msg(LEAD, "first", "2026-06-01T10:00:00Z"),
      msg(COACH, "our touch", "2026-06-01T09:00:00Z"),
    ];
    const out = extractUnansweredInbound(thread, LEAD);
    // Oldest-first ordering in the output regardless of input order.
    expect(out!.indexOf("first")).toBeLessThan(out!.indexOf("second"));
  });

  it("returns null when the lead email is unknown", () => {
    const thread: TThreadEmail[] = [msg(LEAD, "hi", "2026-06-01T10:00:00Z")];
    expect(extractUnansweredInbound(thread, null)).toBeNull();
  });
});

describe("formatThreadAsConversation", () => {
  it("labels both sides chronologically for re-engagement context", () => {
    const thread: TThreadEmail[] = [
      msg(LEAD, "what about pricing?", "2026-06-01T10:05:00Z"),
      msg(COACH, "great talking today", "2026-06-01T09:00:00Z"),
    ];
    const out = formatThreadAsConversation(thread, LEAD, "Jordan", "Sam");
    expect(out).toBe("Sam: great talking today\n\nJordan: what about pricing?");
  });

  it("returns null for an empty thread", () => {
    expect(formatThreadAsConversation([], LEAD, "Jordan", "Sam")).toBeNull();
  });
});

describe("formatInboundMessages (stored-received path)", () => {
  it("passes a single message through verbatim", () => {
    expect(formatInboundMessages(["kan ikke finde en tid der passer"])).toBe(
      "kan ikke finde en tid der passer",
    );
  });

  it("numbers a burst oldest-first", () => {
    const out = formatInboundMessages(["first", "second"]);
    expect(out).toContain("Message 1 of 2:\nfirst");
    expect(out).toContain("Message 2 of 2:\nsecond");
  });

  it("drops blank entries and returns null when nothing usable remains", () => {
    expect(formatInboundMessages(["  ", ""])).toBeNull();
    expect(formatInboundMessages([])).toBeNull();
    // A blank among real ones is dropped, collapsing to the single-message form.
    expect(formatInboundMessages(["", "real one"])).toBe("real one");
  });
});
