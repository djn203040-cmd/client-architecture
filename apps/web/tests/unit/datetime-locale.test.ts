import { describe, it, expect } from "vitest";
import {
  toDateLocale,
  formatDateInTZ,
  formatTimeInTZ,
  formatSendWhenInTZ,
  formatDateTimeInTZ,
} from "@/lib/format/datetime";
import {
  AUTONOMOUS_MODE_A_PHRASE,
  DANGER_PHRASES,
  matchesConfirmPhrase,
} from "@/lib/i18n/confirm-phrases";

const TZ = "Europe/Copenhagen";
// 2026-05-31 12:40 UTC → 14:40 Copenhagen (CEST, UTC+2).
const D = new Date("2026-05-31T12:40:00Z");

describe("toDateLocale", () => {
  it("maps the app language to a BCP-47 date locale", () => {
    expect(toDateLocale("en")).toBe("en-US");
    expect(toDateLocale("da")).toBe("da-DK");
  });
});

describe("date/time formatting honors the Danish locale", () => {
  it("formatDateInTZ renders Danish month order", () => {
    expect(formatDateInTZ(D, TZ, "en-US")).toBe("May 31");
    expect(formatDateInTZ(D, TZ, "da-DK")).toBe("31. maj");
  });

  it("formatTimeInTZ uses a dot separator in Danish, 24h in the coach's zone", () => {
    expect(formatTimeInTZ(D, TZ, "en-US")).toBe("14:40");
    expect(formatTimeInTZ(D, TZ, "da-DK")).toBe("14.40");
  });

  it("formatSendWhenInTZ localizes the relative-day phrasing", () => {
    const sameDay = new Date("2026-05-31T06:00:00Z");
    expect(formatSendWhenInTZ(D, sameDay, TZ, "en-US")).toBe("today at 14:40");
    expect(formatSendWhenInTZ(D, sameDay, TZ, "da-DK")).toBe("i dag kl. 14.40");

    const dayBefore = new Date("2026-05-30T06:00:00Z");
    expect(formatSendWhenInTZ(D, dayBefore, TZ, "da-DK")).toBe("i morgen kl. 14.40");

    const weekBefore = new Date("2026-05-20T06:00:00Z");
    expect(formatSendWhenInTZ(D, weekBefore, TZ, "da-DK")).toBe("31. maj kl. 14.40");
  });

  it("formatDateTimeInTZ defaults to English but accepts Danish", () => {
    // Default (no locale arg) stays English so untouched callers are unchanged.
    expect(formatDateTimeInTZ(D, TZ)).toContain("May");
    const da = formatDateTimeInTZ(D, TZ, "da-DK");
    expect(da).toContain("maj");
    expect(da).toContain("14.40");
  });
});

describe("matchesConfirmPhrase", () => {
  it("accepts the phrase in either supported language", () => {
    expect(matchesConfirmPhrase("send without review", AUTONOMOUS_MODE_A_PHRASE)).toBe(true);
    expect(matchesConfirmPhrase("send uden gennemgang", AUTONOMOUS_MODE_A_PHRASE)).toBe(true);
  });

  it("is trim- and case-insensitive", () => {
    expect(matchesConfirmPhrase("  Send Without Review ", AUTONOMOUS_MODE_A_PHRASE)).toBe(true);
    expect(matchesConfirmPhrase("SEND UDEN GENNEMGANG", AUTONOMOUS_MODE_A_PHRASE)).toBe(true);
  });

  it("rejects unrelated or empty input", () => {
    expect(matchesConfirmPhrase("", AUTONOMOUS_MODE_A_PHRASE)).toBe(false);
    expect(matchesConfirmPhrase("enable it", AUTONOMOUS_MODE_A_PHRASE)).toBe(false);
  });

  it("gates the danger-zone disconnect phrases per language", () => {
    expect(matchesConfirmPhrase("disconnect gmail", DANGER_PHRASES["disconnect-gmail"])).toBe(true);
    expect(matchesConfirmPhrase("afbryd gmail", DANGER_PHRASES["disconnect-gmail"])).toBe(true);
    expect(matchesConfirmPhrase("afbryd slack", DANGER_PHRASES["disconnect-gmail"])).toBe(false);
  });
});
