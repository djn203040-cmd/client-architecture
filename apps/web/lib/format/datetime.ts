// Timezone-aware date/time formatting for coach-facing send times.
//
// Send instants are stored in UTC. Coaches must see them in their own local
// wall clock, never the Vercel server zone (UTC) — a Danish coach should read
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

/** "May 31" in the coach's timezone. */
export function formatDateInTZ(d: Date, tz?: string | null): string {
  return d.toLocaleDateString("en-US", {
    timeZone: tzOrDefault(tz),
    month: "short",
    day: "numeric",
  });
}

/** "14:40" (24h) in the coach's timezone. */
export function formatTimeInTZ(d: Date, tz?: string | null): string {
  return d.toLocaleTimeString("en-US", {
    timeZone: tzOrDefault(tz),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Calendar-day difference (b − a) measured in `tz`, ignoring time-of-day. Done
 * via civil dates projected onto a UTC midnight so DST transitions can't skew
 * the count — what matters is whether the coach's calendar flipped, not the
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
export function formatSendWhenInTZ(d: Date, now: Date, tz?: string | null): string {
  const zone = tzOrDefault(tz);
  const time = formatTimeInTZ(d, zone);
  const dayDiff = civilDayDiff(now, d, zone);
  if (dayDiff === 0) return `today at ${time}`;
  if (dayDiff === 1) return `tomorrow at ${time}`;
  return `${formatDateInTZ(d, zone)} at ${time}`;
}

/** Full date + time for a draft card header, in the coach's timezone. */
export function formatDateTimeInTZ(d: Date, tz?: string | null): string {
  return d.toLocaleString("en-US", {
    timeZone: tzOrDefault(tz),
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
