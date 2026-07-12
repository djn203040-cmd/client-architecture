"use client";

import { Compass } from "@phosphor-icons/react";
import { useTour } from "./TourProvider";
import { useDictionary } from "@/lib/i18n/provider";

/**
 * "Take the tour" affordance for the sidebar footer. Replays the guided
 * walkthrough on demand, the same one that auto-launches once after onboarding.
 */
export function TourLauncher() {
  const { start, active } = useTour();
  const t = useDictionary();
  return (
    <button
      type="button"
      onClick={start}
      disabled={active}
      className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      <Compass weight="regular" className="size-4 shrink-0" />
      {t.tour.launcher}
    </button>
  );
}
