"use client";
import { PlayCircle } from "@phosphor-icons/react";
import { useDictionary } from "@/lib/i18n/provider";
import { ONBOARDING_VIDEOS, type OnboardingVideoKey } from "@/lib/onboarding/videos";

/**
 * "Watch how it's done" link for a wizard step. Renders nothing until the
 * matching slot in lib/onboarding/videos.ts has a URL, so steps can declare
 * their video spot before the video exists.
 */
export function VideoLink({ videoKey }: { videoKey: OnboardingVideoKey }) {
  const t = useDictionary();
  const url = ONBOARDING_VIDEOS[videoKey];
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline underline-offset-2"
    >
      <PlayCircle weight="fill" className="size-4" />
      {t.onboarding.shell.watchVideo}
    </a>
  );
}
