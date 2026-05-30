"use client";

import { useEffect } from "react";

/**
 * Fire-and-forget capture of the coach's real IANA timezone on their first
 * onboarding load. Send times render in the coach's zone, but without this a
 * coach who never opens Settings would sit on the launch-default fallback. The
 * parent only mounts this when `coaches.timezone` is still null, so it can fire
 * unconditionally. Renders nothing.
 */
export function TimezoneCapture() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    }).catch(() => {});
  }, []);

  return null;
}
