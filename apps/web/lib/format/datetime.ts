// Timezone-aware date/time formatting for coach-facing send times.
//
// Send instants are stored in UTC. Coaches must see them in their own local
// wall clock, never the Vercel server zone (UTC), a Danish coach should read
// "sends tomorrow at 14:40", not "12:40". Every send/scheduled time shown to a
// coach goes through these helpers with the coach's `timezone` (an IANA string
// like "Europe/Copenhagen", stored on the coaches row).

/**
 * Fallback used when a coach has no timezone set yet. The launch cohort is
 * Danish, and onboarding will capture this per coach later; until then this
 * keeps send times in a real local zone instead of UTC. Override per coach via
 * Settings → Profile → Timezone.
 */
export const DEFAULT_TIMEZONE = "Europe/Copenhagen";

function tzOrDefault(tz?: string | null): string {
  return tz && tz.length > 0 ? tz : DEFAULT_TIMEZONE;
}

/**
 * BCP-47 locale for date formatting. Defaults to en-US so every existing caller
 * is unchanged; pass "da-DK" to render "31. maj" / "14.40" for a Danish coach.
 */
export type DateLocale = "en-US" | "da-DK";

/**
 * Maps a coach's UI language (`en`/`da`, the app `Locale`) to the BCP-47 locale
 * these formatters take. Keeps the `da → da-DK` mapping in one place instead of
 * an inline ternary at every call site.
 */
export function toDateLocale(language: "en" | "da"): DateLocale {
  return language === "da" ? "da-DK" : "en-US";
}

/** "May 31" (en) / "31. maj" (da) in the coach's timezone. */
export function formatDateInTZ(
  d: Date,
  tz?: string | null,
  locale: DateLocale = "en-US",
): string {
  return d.toLocaleDateString(locale, {
    timeZone: tzOrDefault(tz),
    month: "short",
    day: "numeric",
  });
}

/** "14:40" (en) / "14.40" (da), 24h, in the coach's timezone. */
export function formatTimeInTZ(
  d: Date,
  tz?: string | null,
  locale: DateLocale = "en-US",
): string {
  return d.toLocaleTimeString(locale, {
    timeZone: tzOrDefault(tz),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Calendar-day difference (b − a) measured in `tz`, ignoring time-of-day. Done
 * via civil dates projected onto a UTC midnight so DST transitions can't skew
 * the count, what matters is whether the coach's calendar flipped, not the
 * elapsed hours.
 */
function civilDayDiff(a: Date, b: Date, tz: string): number {
  const civilMidnight = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(d);
    const part = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    return Date.UTC(part("year"), part("month") - 1, part("day"));
  };
  return Math.round((civilMidnight(b) - civilMidnight(a)) / 86_400_000);
}

/**
 * Friendly send time relative to `now`, rendered in the coach's timezone:
 * "today at 14:40", "tomorrow at 14:40", or "May 31 at 14:40". Used so the
 * coach sees exactly when an approved draft goes out (send is decoupled from
 * approval, fired at its fixed cadence instant).
 */
export function formatSendWhenInTZ(
  d: Date,
  now: Date,
  tz?: string | null,
  locale: DateLocale = "en-US",
): string {
  const zone = tzOrDefault(tz);
  const time = formatTimeInTZ(d, zone, locale);
  const dayDiff = civilDayDiff(now, d, zone);
  const da = locale === "da-DK";
  if (dayDiff === 0) return da ? `i dag kl. ${time}` : `today at ${time}`;
  if (dayDiff === 1) return da ? `i morgen kl. ${time}` : `tomorrow at ${time}`;
  const date = formatDateInTZ(d, zone, locale);
  return da ? `${date} kl. ${time}` : `${date} at ${time}`;
}

/** Full date + time for a draft card header, in the coach's timezone. */
export function formatDateTimeInTZ(
  d: Date,
  tz?: string | null,
  locale: DateLocale = "en-US",
): string {
  return d.toLocaleString(locale, {
    timeZone: tzOrDefault(tz),
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
